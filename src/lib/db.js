import { openDB } from 'idb';

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.c2rstore.com/api';

export const STORE_NAMES = [
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'roles', 'permissions', 'settings', 'notifications', 'inventory_transactions',
  'manual_repair_receipts', 'licenses', 'audit_logs', 'sync_queue',
];

const MONEY_FIELDS = new Set([
  'purchase_price', 'sale_price', 'cost_price', 'amount', 'charges', 'subtotal',
  'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit',
  'repair_charges', 'advance_payment', 'remaining_amount',
]);

const DEFAULT_BRAND = {
  software_name: 'Mobile Shop Management System',
  company_name: 'Digital Solutions Hub',
  shop_name: 'Mobile Shop',
  owner_name: '',
  contact_number: '',
  phone: '',
  whatsapp: '',
  address: '',
  footer: 'Thank you for choosing us.',
  footer_branding: 'Design & Developed By DSH Digital Solutions Hub - 2026',
  currency: 'PKR',
  theme_color: '#14B8A6',
  invoice_header: 'Sales Invoice',
  receipt_format: 'thermal',
  invoice_format: 'a4',
  logo: '',
  favicon: '',
  login_screen: '',
  tax: 0,
};

const BUSINESS_SYNC_ENTITIES = new Set([
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'roles', 'permissions', 'settings', 'notifications', 'inventory_transactions',
  'manual_repair_receipts', 'licenses',
]);

export async function database() {
  return openDB('dsh-production-db', 3, {
    upgrade(db) {
      for (const store of STORE_NAMES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'uuid' });
        }
      }
    },
  });
}

export async function listRecords(store) {
  const db = await database();
  return (await db.getAll(store))
    .filter((record) => !record.deleted_at)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

export async function cleanupStartupData() {
  const db = await database();
  const plans = [
    ['customers', (row) => row.phone || row.cnic || row.uuid],
    ['products', (row) => row.imei || row.barcode || `${row.product_name || ''}-${row.model || ''}` || row.uuid],
    ['repairs', (row) => row.job_number || `${row.imei || ''}-${row.customer_name || ''}` || row.uuid],
    ['sales', (row) => row.invoice_number || row.uuid],
    ['licenses', (row) => row.license_key || row.activation_code || `${row.owner_name || ''}-${row.device_id || ''}-${row.type || ''}` || row.uuid],
    ['settings', (row) => row.key || row.uuid],
  ];

  for (const [store, keyFor] of plans) {
    const rows = await db.getAll(store);
    const active = rows.filter((row) => !row.deleted_at);
    const groups = new Map();
    for (const row of active) {
      const key = String(keyFor(row) || row.uuid).trim().toLowerCase();
      if (!key) continue;
      const current = groups.get(key);
      if (!current || String(row.updated_at || '').localeCompare(String(current.updated_at || '')) > 0) {
        groups.set(key, row);
      }
    }
    for (const row of active) {
      const key = String(keyFor(row) || row.uuid).trim().toLowerCase();
      const keeper = groups.get(key);
      if (keeper && keeper.uuid !== row.uuid) await db.delete(store, row.uuid);
    }
  }

  await cleanupLicenseStorage(db);
  await cleanupSyncQueue(db);
}

export async function getRecord(store, uuid) {
  const db = await database();
  return db.get(store, uuid);
}

export async function saveRecord(store, data, action = data.uuid ? 'update' : 'create') {
  const db = await database();
  const now = new Date().toISOString();
  const uuid = data.uuid || crypto.randomUUID();
  const clean = normalizeNumbers({ ...data, uuid, updated_at: now, sync_status: 'pending' });
  await db.put(store, clean);
  await queueOperation(store, clean.uuid, action, clean);
  await auditLog(action, store, clean.uuid, clean);
  return clean;
}

export async function saveRemoteRecord(resource, data) {
  const token = localStorage.getItem('dsh_token') || '';
  const uuid = data.uuid;
  const response = await fetch(`${API_URL}/${resource}${uuid ? `/${uuid}` : ''}`, {
    method: uuid ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Remote save failed.';
    throw new Error(detail);
  }
  return payload;
}

export async function saveUserAccount(record) {
  const remote = await saveRemoteRecord('users', record);
  return saveRecord('users', { ...record, ...remote, role: record.role, status: record.status || 'Active' });
}

export async function deleteRecord(store, uuid, mode = 'soft') {
  const db = await database();
  const current = await db.get(store, uuid);
  if (!current) return;
  if (mode === 'permanent') {
    await db.delete(store, uuid);
    if (store === 'licenses') await cleanupLicenseStorage(db);
    await queueOperation(store, uuid, 'force_delete', { ...current, permanently_deleted_at: new Date().toISOString() });
    await auditLog('permanent_delete', store, uuid, current);
    return;
  }
  const deleted = { ...current, deleted_at: new Date().toISOString(), sync_status: 'pending' };
  await db.put(store, deleted);
  if (store === 'licenses') await cleanupLicenseStorage(db);
  await queueOperation(store, uuid, 'delete', deleted);
  await auditLog('soft_delete', store, uuid, deleted);
}

export async function createSale({ customer_uuid, payment_type, discount, tax, paid, due_date, cart }) {
  if (!cart.length) throw new Error('Cart is empty.');
  const db = await database();
  const products = await listRecords('products');
  const productMap = new Map(products.map((product) => [product.uuid, product]));
  const subtotal = cart.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0);
  const paidAmount = Number(paid || 0);
  const balance = Math.max(0, total - paidAmount);
  const profit = cart.reduce((sum, item) => {
    const product = productMap.get(item.product_uuid);
    return sum + (Number(item.price) - Number(product?.purchase_price || 0)) * Number(item.quantity);
  }, 0) - Number(discount || 0);
  const now = new Date().toISOString();
  const sale = await saveRecord('sales', {
    invoice_number: await nextNumber('sales', 'DSH-INV'),
    customer_uuid,
    customer_name: await customerName(customer_uuid),
    payment_type,
    subtotal,
    discount,
    tax,
    total,
    paid: paidAmount,
    balance,
    profit,
    due_date,
    sold_at: now,
    status: balance > 0 ? 'Credit Due' : 'Paid',
  });

  for (const item of cart) {
    const product = productMap.get(item.product_uuid);
    if (!product) continue;
    await saveRecord('sale_items', {
      sale_uuid: sale.uuid,
      product_uuid: product.uuid,
      product_name: product.product_name,
      imei: item.imei || product.imei,
      quantity: Number(item.quantity),
      price: Number(item.price),
      profit: (Number(item.price) - Number(product.purchase_price || 0)) * Number(item.quantity),
    });
    await saveRecord('products', {
      ...product,
      quantity: Math.max(0, Number(product.quantity || 0) - Number(item.quantity || 0)),
    });
    await saveRecord('inventory_transactions', {
      product_uuid: product.uuid,
      product_name: product.product_name,
      type: 'Stock Out',
      quantity: -Number(item.quantity),
      reference: sale.invoice_number,
      reason: 'Sale',
      transacted_at: now,
    });
  }

  await saveRecord('cashbook', {
    type: 'Sale',
    description: sale.invoice_number,
    debit: paidAmount,
    credit: 0,
    reference: sale.uuid,
    entry_at: now,
  });

  if (customer_uuid && balance > 0) {
    await addCustomerLedger(customer_uuid, 'Sale Credit', balance, sale.invoice_number, due_date);
  }

  return sale;
}

export async function quickCustomer({ name, phone, address, cnic, notes }) {
  return saveRecord('customers', {
    name: name || 'Walk-in Customer',
    phone,
    address,
    cnic,
    notes,
    balance: 0,
    quick_entry: true,
  });
}

export async function generateLicense({ owner_name, device_id, type = '1 Month', status = 'Active' }) {
  const months = { '1 Month': 1, '6 Months': 6, '1 Year': 12, Lifetime: 1200 }[type] || 1;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  await cleanupStartupData();
  return saveRecord('licenses', {
    license_key: `DSH-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    activation_code: crypto.randomUUID().slice(0, 12).toUpperCase(),
    owner_name,
    device_id: device_id || ensureDeviceId(),
    type,
    status,
    trial: type === 'Trial',
    expiry_date: type === 'Lifetime' ? 'Lifetime' : expiry.toISOString().slice(0, 10),
    activated_at: new Date().toISOString(),
  });
}

export async function disableLicense(license) {
  return saveRecord('licenses', { ...license, status: 'Disabled' });
}

export async function activeLicenseStatus() {
  const licenses = await listRecords('licenses');
  const active = licenses.find((license) => license.status === 'Active');
  if (!active) return { valid: false, message: 'No active license' };
  if (active.expiry_date !== 'Lifetime' && new Date(active.expiry_date).getTime() < Date.now()) {
    return { valid: false, message: 'License expired', license: active };
  }
  return { valid: true, message: `${active.type} license active`, license: active };
}

export async function createManualRepairReceipt(record) {
  const charges = Number(record.repair_charges || 0);
  const advance = Number(record.advance_payment || 0);
  const receipt = await saveRecord('manual_repair_receipts', {
    ...record,
    receipt_number: record.receipt_number || await nextNumber('manual_repair_receipts', 'REP-RCPT'),
    date: record.date || new Date().toISOString().slice(0, 10),
    remaining_amount: Math.max(0, charges - advance),
    status: record.status || 'Received',
  });

  if (advance > 0) {
    await saveRecord('cashbook', {
      type: 'Repair Advance',
      description: receipt.receipt_number,
      debit: advance,
      credit: 0,
      reference: receipt.uuid,
      entry_at: new Date().toISOString(),
    });
  }

  return receipt;
}

export async function createPurchase({ supplier_uuid, invoice_number, cart, paid = 0 }) {
  if (!cart.length) throw new Error('Purchase cart is empty.');
  const total = cart.reduce((sum, item) => sum + Number(item.quantity) * Number(item.cost_price), 0);
  const purchase = await saveRecord('purchases', {
    invoice_number: invoice_number || await nextNumber('purchases', 'PUR'),
    supplier_uuid,
    supplier_name: await supplierName(supplier_uuid),
    total,
    paid: Number(paid || 0),
    balance: Math.max(0, total - Number(paid || 0)),
    purchased_at: new Date().toISOString(),
    status: total > Number(paid || 0) ? 'Payable' : 'Paid',
  });

  for (const item of cart) {
    await saveRecord('purchase_items', { ...item, purchase_uuid: purchase.uuid });
    const product = item.product_uuid ? await getRecord('products', item.product_uuid) : null;
    if (product) {
      await saveRecord('products', {
        ...product,
        purchase_price: Number(item.cost_price),
        quantity: Number(product.quantity || 0) + Number(item.quantity || 0),
      });
      await saveRecord('inventory_transactions', {
        product_uuid: product.uuid,
        product_name: product.product_name,
        type: 'Stock In',
        quantity: Number(item.quantity),
        reference: purchase.invoice_number,
        reason: 'Purchase',
        transacted_at: new Date().toISOString(),
      });
    }
  }

  if (supplier_uuid && purchase.balance > 0) {
    await saveRecord('supplier_ledgers', {
      supplier_uuid,
      type: 'Purchase Payable',
      amount: purchase.balance,
      reference: purchase.invoice_number,
      entry_at: new Date().toISOString(),
    });
  }

  return purchase;
}

export async function receiveCustomerPayment({ customer_uuid, amount, method, notes }) {
  const payment = await saveRecord('payments', {
    party_type: 'customer',
    customer_uuid,
    party_name: await customerName(customer_uuid),
    amount: Number(amount),
    method,
    notes,
    paid_at: new Date().toISOString(),
  });
  await addCustomerLedger(customer_uuid, 'Payment Received', -Number(amount), payment.uuid);
  await saveRecord('cashbook', {
    type: 'Customer Payment',
    description: payment.party_name,
    debit: Number(amount),
    credit: 0,
    reference: payment.uuid,
    entry_at: payment.paid_at,
  });
  return payment;
}

export async function paySupplier({ supplier_uuid, amount, method, notes }) {
  const payment = await saveRecord('payments', {
    party_type: 'supplier',
    supplier_uuid,
    party_name: await supplierName(supplier_uuid),
    amount: Number(amount),
    method,
    notes,
    paid_at: new Date().toISOString(),
  });
  await saveRecord('supplier_ledgers', {
    supplier_uuid,
    type: 'Supplier Payment',
    amount: -Number(amount),
    reference: payment.uuid,
    entry_at: payment.paid_at,
  });
  await saveRecord('cashbook', {
    type: 'Supplier Payment',
    description: payment.party_name,
    debit: 0,
    credit: Number(amount),
    reference: payment.uuid,
    entry_at: payment.paid_at,
  });
  return payment;
}

export async function addExpense(record) {
  const expense = await saveRecord('expenses', { ...record, spent_at: record.spent_at || new Date().toISOString() });
  await saveRecord('cashbook', {
    type: 'Expense',
    description: expense.category,
    debit: 0,
    credit: Number(expense.amount),
    reference: expense.uuid,
    entry_at: expense.spent_at,
  });
  return expense;
}

export async function updateRepairStatus(repair, status, notes) {
  const updated = await saveRecord('repairs', { ...repair, status });
  await saveRecord('repair_updates', {
    repair_uuid: repair.uuid,
    job_number: repair.job_number,
    status,
    notes,
    updated_at: new Date().toISOString(),
  });
  return updated;
}

export async function dashboardSnapshot() {
  const [products, customers, suppliers, sales, saleItems, expenses, repairs, receipts] = await Promise.all([
    listRecords('products'), listRecords('customers'), listRecords('suppliers'),
    listRecords('sales'), listRecords('sale_items'), listRecords('expenses'), listRecords('repairs'), listRecords('manual_repair_receipts'),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todaySalesRows = sales.filter((sale) => String(sale.sold_at).startsWith(today));
  const monthSalesRows = sales.filter((sale) => String(sale.sold_at).startsWith(month));
  const todayExpenses = expenses.filter((expense) => String(expense.spent_at).startsWith(today));
  const todayRepairRows = [...repairs, ...receipts].filter((repair) => String(repair.date || repair.created_at || repair.updated_at).startsWith(today));
  const repairRevenueRows = [...repairs, ...receipts];
  const activeSaleIds = new Set(sales.map((sale) => sale.uuid));
  const bestItem = bestSellingProduct(saleItems.filter((item) => activeSaleIds.has(item.sale_uuid)));
  return {
    todaySales: sum(todaySalesRows, 'total'),
    todayProfit: sum(todaySalesRows, 'profit'),
    monthlySales: sum(monthSalesRows, 'total'),
    monthlyProfit: sum(monthSalesRows, 'profit'),
    inventoryValue: products.reduce((total, product) => total + Number(product.quantity || 0) * Number(product.purchase_price || 0), 0),
    inventoryQuantity: sum(products, 'quantity'),
    creditReceivable: sum(customers, 'balance') + sum(sales, 'balance'),
    supplierPayables: sum(suppliers, 'balance'),
    cashInHand: sum(sales, 'paid') + sum(paymentsFilter(await listRecords('payments'), 'customer'), 'amount') - sum(expenses, 'amount') - sum(paymentsFilter(await listRecords('payments'), 'supplier'), 'amount'),
    expenses: sum(todayExpenses, 'amount'),
    todayOrders: todaySalesRows.length,
    todayRepairs: todayRepairRows.length,
    repairRevenue: sum(repairRevenueRows, 'charges') + sum(repairRevenueRows, 'repair_charges'),
    pendingRepairs: repairRevenueRows.filter((repair) => !['Delivered', 'Completed'].includes(repair.status)).length,
    bestSellingProduct: bestItem?.product_name || 'No Data Available',
    topCustomers: topCustomers(customers, sales).filter((customer) => Number(customer.total_spent || 0) > 0),
    recentSales: sales.slice(0, 8),
    lowStock: products.filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 3)),
    openRepairs: repairs.filter((repair) => !['Delivered', 'Completed'].includes(repair.status)).length,
  };
}

export async function notificationCenter() {
  const [products, sales, repairs, receipts, suppliers, purchases, saved] = await Promise.all([
    listRecords('products'), listRecords('sales'), listRecords('repairs'), listRecords('manual_repair_receipts'),
    listRecords('suppliers'), listRecords('purchases'), listRecords('notifications'),
  ]);
  const dismissed = new Set(saved.map((item) => item.dismissed_source).filter(Boolean));
  const generated = [
    ...products
      .filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 3))
      .map((product) => ({ uuid: `low-${product.uuid}`, type: 'Low Stock', title: product.product_name, body: `${product.quantity || 0} units remaining`, priority: 'high' })),
    ...sales
      .filter((sale) => Number(sale.balance || 0) > 0)
      .map((sale) => ({ uuid: `credit-${sale.uuid}`, type: 'Pending Credit', title: sale.invoice_number, body: `${sale.customer_name}: ${formatMoney(sale.balance)}`, priority: 'medium' })),
    ...[...repairs, ...receipts]
      .filter((repair) => !['Delivered', 'Completed'].includes(repair.status))
      .map((repair) => ({ uuid: `repair-${repair.uuid}`, type: 'Pending Repair', title: repair.job_number || repair.receipt_number, body: `${repair.customer_name || ''} ${repair.device_name || ''}`.trim(), priority: 'medium' })),
    ...suppliers
      .filter((supplier) => Number(supplier.balance || 0) > 0)
      .map((supplier) => ({ uuid: `supplier-${supplier.uuid}`, type: 'Supplier Payment Due', title: supplier.supplier_name, body: formatMoney(supplier.balance), priority: 'medium' })),
    ...purchases
      .filter((purchase) => Number(purchase.balance || 0) > 0)
      .map((purchase) => ({ uuid: `purchase-${purchase.uuid}`, type: 'Supplier Payment Due', title: purchase.invoice_number, body: `${purchase.supplier_name}: ${formatMoney(purchase.balance)}`, priority: 'medium' })),
  ];
  return [...generated.filter((item) => !dismissed.has(item.uuid)), ...saved.filter((item) => !item.dismissed_source)].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

export async function getBrandSettings() {
  const settings = await listRecords('settings');
  const values = { ...DEFAULT_BRAND };
  for (const row of settings) values[row.key] = row.value;
  return values;
}

export async function saveBrandSettings(settings) {
  const rows = await listRecords('settings');
  const byKey = new Map(rows.map((row) => [row.key, row]));
  await Promise.all(Object.entries(settings).map(([key, value]) => saveRecord('settings', { ...(byKey.get(key) || {}), key, value })));
}

export async function reportData(type) {
  const [sales, saleItems, products, expenses, customers, suppliers, repairs, receipts, purchases] = await Promise.all([
    listRecords('sales'), listRecords('sale_items'), listRecords('products'), listRecords('expenses'),
    listRecords('customers'), listRecords('suppliers'), listRecords('repairs'), listRecords('manual_repair_receipts'), listRecords('purchases'),
  ]);
  const rows = {
    daily_sales: sales.filter((sale) => sameDay(sale.sold_at)),
    weekly_sales: sales.filter((sale) => withinDays(sale.sold_at, 7)),
    monthly_sales: sales.filter((sale) => String(sale.sold_at).startsWith(new Date().toISOString().slice(0, 7))),
    yearly_sales: sales.filter((sale) => String(sale.sold_at).startsWith(new Date().toISOString().slice(0, 4))),
    product_sales: saleItems,
    profit: sales.map((sale) => ({ invoice_number: sale.invoice_number, total: sale.total, profit: sale.profit, sold_at: sale.sold_at })),
    inventory: products,
    customers,
    expenses,
    suppliers,
    purchases,
    customer_ledger: await listRecords('customer_ledgers'),
    supplier_ledger: await listRecords('supplier_ledgers'),
    repairs: [...repairs, ...receipts],
    credit_recovery: sales.filter((sale) => Number(sale.balance || 0) > 0),
  };
  return rows[type] || [];
}

export async function syncNow() {
  if (!navigator.onLine) return { skipped: true };
  const db = await database();
  const pending = (await db.getAll('sync_queue')).filter((item) => item.status === 'pending');
  if (!pending.length) return { synced: 0 };
  try {
    const response = await fetch(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
      body: JSON.stringify({
        device_id: localStorage.getItem('dsh_device_id') || ensureDeviceId(),
        operations: pending.map((item) => ({
          uuid: item.record_uuid,
          entity: item.entity,
          action: item.action,
          data: item.data,
          client_updated_at: item.client_updated_at,
        })),
      }),
    });
    if (!response.ok) throw new Error('Sync failed');
    for (const item of pending) {
      await db.put('sync_queue', { ...item, status: 'synced', synced_at: new Date().toISOString() });
      const current = await db.get(item.entity, item.record_uuid);
      if (current) await db.put(item.entity, { ...current, sync_status: 'synced' });
    }
    return response.json();
  } catch (error) {
    return { error: error.message };
  }
}

export function exportCsv(filename, rows) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => quote(row[key])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importCsvRecords(store, file) {
  const text = await file.text();
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map((item) => item.replace(/^"|"$/g, '').trim());
  const records = lines.map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]+)/g) || [];
    return Object.fromEntries(headers.map((header, index) => [header, String(cells[index] || '').replace(/^"|"$/g, '').replaceAll('""', '"')]));
  });
  for (const record of records) await saveRecord(store, record);
  return records.length;
}

export function printHtml(title, html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(printDocument(title, html));
  win.document.close();
}

export function downloadHtml(filename, title, html) {
  const blob = new Blob([printDocument(title, html)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(filename, title, lines) {
  const safeLines = [title, '', ...lines].map((line) => String(line ?? '').replace(/[()\\]/g, '\\$&'));
  const content = `BT /F1 14 Tf 50 780 Td ${safeLines.map((line, index) => `${index ? '0 -22 Td ' : ''}(${line}) Tj`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function whatsAppShare(phone, message) {
  const cleanPhone = String(phone || '').replace(/[^\d]/g, '');
  const url = `https://wa.me/${cleanPhone || ''}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function receiptQrData(record) {
  return `Receipt: ${record.receipt_number || record.invoice_number || record.uuid}\nCustomer: ${record.customer_name || record.name || 'Walk-in'}\nAmount: ${record.total || record.repair_charges || record.charges || 0}`;
}

async function addCustomerLedger(customer_uuid, type, amount, reference, due_date) {
  const entry = await saveRecord('customer_ledgers', {
    customer_uuid, type, amount, reference, due_date, entry_at: new Date().toISOString(),
  });
  const customer = await getRecord('customers', customer_uuid);
  if (customer) {
    await saveRecord('customers', { ...customer, balance: Number(customer.balance || 0) + Number(amount || 0) });
  }
  return entry;
}

async function queueOperation(entity, record_uuid, action, data) {
  if (!BUSINESS_SYNC_ENTITIES.has(entity)) return;
  const db = await database();
  const now = new Date().toISOString();
  await db.put('sync_queue', {
    uuid: crypto.randomUUID(),
    entity,
    record_uuid,
    action,
    data,
    client_updated_at: now,
    status: 'pending',
  });
}

async function auditLog(action, entity, entity_uuid, record) {
  if (entity === 'audit_logs' || entity === 'sync_queue') return;
  const db = await database();
  const now = new Date().toISOString();
  const entry = {
    uuid: crypto.randomUUID(),
    user_name: localStorage.getItem('dsh_user_name') || 'Local Admin',
    action,
    entity,
    entity_uuid,
    details: `${action} ${entity}`,
    metadata: record,
    created_at: now,
    updated_at: now,
  };
  await db.put('audit_logs', entry);
}

async function nextNumber(store, prefix) {
  const rows = await listRecords(store);
  return `${prefix}-${String(rows.length + 1).padStart(5, '0')}`;
}

async function customerName(uuid) {
  if (!uuid) return 'Walk-in Customer';
  const customer = await getRecord('customers', uuid);
  return customer?.name || 'Walk-in Customer';
}

async function supplierName(uuid) {
  if (!uuid) return '';
  const supplier = await getRecord('suppliers', uuid);
  return supplier?.supplier_name || '';
}

function normalizeNumbers(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, MONEY_FIELDS.has(key) || key === 'quantity' ? Number(value || 0) : value]));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function bestSellingProduct(items) {
  const totals = new Map();
  for (const item of items) {
    const current = totals.get(item.product_name) || 0;
    totals.set(item.product_name, current + Number(item.quantity || 0));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([product_name, quantity]) => ({ product_name, quantity }))[0];
}

function topCustomers(customers, sales) {
  return customers
    .map((customer) => ({
      ...customer,
      total_spent: sum(sales.filter((sale) => sale.customer_uuid === customer.uuid), 'total'),
    }))
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);
}

function printDocument(title, html) {
  return `<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Inter,Arial,sans-serif;margin:24px;color:#111;background:#fff}
    table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}
    .right{text-align:right}.brand{font-size:22px;font-weight:800}.receipt-shell{max-width:820px;margin:auto}.muted{color:#666}
    .receipt-head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:14px}
    .receipt-total{font-size:24px;font-weight:900;text-align:right}.signature{height:70px;border-bottom:1px solid #111;margin-top:24px}
    button{margin-top:18px;border:0;background:#0f9f8f;color:white;border-radius:6px;padding:10px 16px;font-weight:800}
    @media print{button{display:none}body{margin:0}.thermal{max-width:302px;font-size:12px}.thermal .receipt-head{display:block}}
  </style></head><body>${html}<button onclick="print()">Print</button></body></html>`;
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function paymentsFilter(rows, type) {
  return rows.filter((row) => row.party_type === type);
}

function sameDay(value) {
  return String(value || '').startsWith(new Date().toISOString().slice(0, 10));
}

function withinDays(value, days) {
  return new Date(value).getTime() >= Date.now() - days * 86400000;
}

function quote(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

async function cleanupLicenseStorage(db) {
  const licenses = (await db.getAll('licenses')).filter((row) => !row.deleted_at);
  const active = licenses.find((row) => row.status === 'Active');
  if (active) localStorage.setItem('dsh_active_license', active.license_key || active.uuid);
  else localStorage.removeItem('dsh_active_license');
}

async function cleanupSyncQueue(db) {
  const rows = await db.getAll('sync_queue');
  const latest = new Map();
  for (const item of rows) {
    if (!BUSINESS_SYNC_ENTITIES.has(item.entity)) {
      await db.delete('sync_queue', item.uuid);
      continue;
    }
    if (item.status !== 'pending') continue;
    const key = `${item.entity}:${item.record_uuid}`;
    const current = latest.get(key);
    if (!current || String(item.client_updated_at || '').localeCompare(String(current.client_updated_at || '')) > 0) {
      if (current) await db.delete('sync_queue', current.uuid);
      latest.set(key, item);
    } else {
      await db.delete('sync_queue', item.uuid);
    }
  }
}

export function ensureDeviceId() {
  const existing = localStorage.getItem('dsh_device_id');
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem('dsh_device_id', id);
  return id;
}
