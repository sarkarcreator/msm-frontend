import { openDB } from 'idb';

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.c2rstore.com/api';

export const STORE_NAMES = [
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'roles', 'permissions', 'settings', 'notifications', 'inventory_transactions',
  'manual_repair_receipts', 'mobile_wallet_transactions', 'patients', 'assistants',
  'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports',
  'radiology_reports', 'hospital_bills', 'hospital_bill_items',
  'master_catalogs', 'medicines', 'licenses', 'audit_logs', 'sync_queue',
];

const MONEY_FIELDS = new Set([
  'purchase_price', 'sale_price', 'cost_price', 'unit_cost_price', 'unit_sale_price',
  'package_cost_price', 'total_cost', 'amount', 'fee', 'net_amount', 'salary', 'charges', 'subtotal',
  'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit',
  'repair_charges', 'advance_payment', 'remaining_amount', 'mrp', 'tax_percentage',
  'registration_fee', 'doctor_fee', 'medicine_charges', 'injection_charges',
  'lab_charges', 'radiology_charges', 'procedure_charges', 'grand_total',
]);

const DEFAULT_BRAND = {
  software_name: 'Market Sales Management System',
  company_name: 'Digital Solutions Hub',
  shop_name: 'Retail Shop',
  business_type: 'General Store',
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
  'manual_repair_receipts', 'mobile_wallet_transactions', 'patients', 'assistants',
  'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports',
  'radiology_reports', 'hospital_bills', 'hospital_bill_items',
  'master_catalogs', 'medicines', 'licenses',
]);

const TENANT_SCOPED_STORES = new Set([
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'settings', 'notifications', 'inventory_transactions', 'manual_repair_receipts',
  'mobile_wallet_transactions', 'patients', 'assistants', 'hospital_prescriptions',
  'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports',
  'hospital_bills', 'hospital_bill_items', 'master_catalogs',
]);

const BUSINESS_TYPED_STORES = new Set(['products', 'categories', 'brands', 'master_catalogs', 'medicines']);

export async function database() {
  return openDB('dsh-production-db', 7, {
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
    .filter((record) => scopedRecordVisible(store, record))
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
    ['medicines', (row) => row.barcode || row.registration_no || `${row.brand_name || ''}-${row.generic_name || ''}-${row.strength || ''}` || row.uuid],
    ['settings', (row) => row.key || row.uuid],
  ];

  for (const [store, keyFor] of plans) {
    const rows = await db.getAll(store);
    const active = rows.filter((row) => !row.deleted_at);
    const groups = new Map();
    for (const row of active) {
      const key = scopedDedupeKey(store, row, keyFor(row));
      if (!key) continue;
      const current = groups.get(key);
      if (!current || String(row.updated_at || '').localeCompare(String(current.updated_at || '')) > 0) {
        groups.set(key, row);
      }
    }
    for (const row of active) {
      const key = scopedDedupeKey(store, row, keyFor(row));
      const keeper = groups.get(key);
      if (keeper && keeper.uuid !== row.uuid) await db.delete(store, row.uuid);
    }
  }

  await cleanupLicenseStorage(db);
  await cleanupSyncQueue(db);
}

function scopedDedupeKey(store, row, rawKey) {
  const key = String(rawKey || row.uuid || '').trim().toLowerCase();
  if (!key) return '';
  const scope = TENANT_SCOPED_STORES.has(store) ? String(row.license_uuid || 'global').trim().toLowerCase() : 'global';
  const business = BUSINESS_TYPED_STORES.has(store) ? String(row.business_type || 'all').trim().toLowerCase() : 'all';
  return `${scope}|${business}|${key}`;
}

export async function getRecord(store, uuid) {
  const db = await database();
  return db.get(store, uuid);
}

export async function saveRecord(store, data, action = data.uuid ? 'update' : 'create') {
  const db = await database();
  const now = new Date().toISOString();
  const uuid = data.uuid || crypto.randomUUID();
  const clean = normalizeNumbers(scopeRecordForSave(store, { ...data, uuid, updated_at: now, sync_status: 'pending' }));
  await db.put(store, clean);
  await queueOperation(store, clean.uuid, action, clean);
  await auditLog(action, store, clean.uuid, clean);
  return clean;
}

export async function saveRemoteRecord(resource, data, options = {}) {
  const token = localStorage.getItem('dsh_token') || '';
  const uuid = data.uuid;
  const forceCreate = options.forceCreate || false;
  const payloadData = remotePayload(data);
  const apiResource = apiResourceName(resource);
  const request = (method, path = '') => fetch(`${API_URL}/${apiResource}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payloadData),
  });
  let response = await request(uuid && !forceCreate ? 'PUT' : 'POST', uuid && !forceCreate ? `/${uuid}` : '');
  if (response.status === 404 && uuid && !forceCreate) {
    response = await request('POST');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Remote save failed.';
    throw new Error(detail);
  }
  await markRecordSynced(resource, uuid || payload.uuid || data.uuid);
  return payload;
}

export async function deleteRemoteRecord(resource, uuid, mode = 'soft') {
  const token = localStorage.getItem('dsh_token') || '';
  const apiResource = apiResourceName(resource);
  const response = await fetch(`${API_URL}/${apiResource}/${uuid}${mode === 'permanent' ? '?force=1' : ''}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Remote delete failed.';
    throw new Error(detail);
  }
  await markRecordSynced(resource, uuid);
  return true;
}

function apiResourceName(resource) {
  return {
    customer_ledgers: 'customer-ledgers',
    supplier_ledgers: 'supplier-ledgers',
    sale_items: 'sale-items',
    purchase_items: 'purchase-items',
    repair_updates: 'repair-updates',
    inventory_transactions: 'inventory-transactions',
    manual_repair_receipts: 'manual-repair-receipts',
    mobile_wallet_transactions: 'mobile-wallet-transactions',
    hospital_prescriptions: 'hospital-prescriptions',
    hospital_orders: 'hospital-orders',
    hospital_tasks: 'hospital-tasks',
    lab_reports: 'lab-reports',
    radiology_reports: 'radiology-reports',
    hospital_bills: 'hospital-bills',
    hospital_bill_items: 'hospital-bill-items',
    master_catalogs: 'master-catalogs',
    medicine_categories: 'medicine-categories',
    medicine_manufacturers: 'medicine-manufacturers',
    audit_logs: 'audit-logs',
  }[resource] || resource;
}

async function markRecordSynced(resource, uuid) {
  if (!uuid) return;
  const entity = {
    'customer-ledgers': 'customer_ledgers',
    'supplier-ledgers': 'supplier_ledgers',
    'sale-items': 'sale_items',
    'purchase-items': 'purchase_items',
    'repair-updates': 'repair_updates',
    'inventory-transactions': 'inventory_transactions',
    'manual-repair-receipts': 'manual_repair_receipts',
    'mobile-wallet-transactions': 'mobile_wallet_transactions',
    'hospital-prescriptions': 'hospital_prescriptions',
    'hospital-orders': 'hospital_orders',
    'hospital-tasks': 'hospital_tasks',
    'lab-reports': 'lab_reports',
    'radiology-reports': 'radiology_reports',
    'hospital-bills': 'hospital_bills',
    'hospital-bill-items': 'hospital_bill_items',
    'master-catalogs': 'master_catalogs',
    'medicine-categories': 'medicine_categories',
    'medicine-manufacturers': 'medicine_manufacturers',
    'audit-logs': 'audit_logs',
  }[resource] || resource;
  const db = await database();
  const queue = await db.getAll('sync_queue');
  for (const item of queue) {
    if (item.entity === entity && item.record_uuid === uuid && item.status === 'pending') {
      await db.put('sync_queue', { ...item, status: 'synced', synced_at: new Date().toISOString() });
    }
  }
  const current = db.objectStoreNames.contains(entity) ? await db.get(entity, uuid) : null;
  if (current) await db.put(entity, { ...current, sync_status: 'synced' });
}

function remotePayload(data) {
  const { id, created_at, updated_at, deleted_at, sync_status, ...payload } = data;
  return payload;
}

function currentScope() {
  return {
    role: localStorage.getItem('dsh_user_role') || '',
    license_uuid: localStorage.getItem('dsh_license_uuid') || '',
    business_type: localStorage.getItem('dsh_business_type') || '',
  };
}

function scopedRecordVisible(store, record) {
  const scope = currentScope();
  if (scope.role === 'Super Admin') return true;
  if (TENANT_SCOPED_STORES.has(store) && scope.license_uuid) {
    return record.license_uuid === scope.license_uuid;
  }
  if (BUSINESS_TYPED_STORES.has(store) && scope.business_type && record.business_type) {
    if (scope.business_type === 'General Store') return ['General Store', 'Grocery Store', 'All'].includes(record.business_type);
    if (scope.business_type === 'Grocery Store') return ['Grocery Store', 'General Store', 'All'].includes(record.business_type);
    return [scope.business_type, 'All'].includes(record.business_type);
  }
  return true;
}

function scopeRecordForSave(store, record) {
  const scope = currentScope();
  if (scope.role !== 'Super Admin' && TENANT_SCOPED_STORES.has(store) && scope.license_uuid) {
    record.license_uuid = record.license_uuid || scope.license_uuid;
  }
  if (scope.role !== 'Super Admin' && BUSINESS_TYPED_STORES.has(store) && scope.business_type) {
    record.business_type = scope.business_type;
  }
  return record;
}

export async function saveUserAccount(record) {
  const remote = await saveRemoteRecord('users', record);
  return saveRecord('users', { ...record, ...remote, role: record.role, status: record.status || 'Active' });
}

export async function activateLicenseAccount(record) {
  const response = await fetch(`${API_URL}/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...record, device_id: record.device_id || ensureDeviceId() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'License activation failed.';
    throw new Error(detail);
  }
  return payload;
}

export async function deleteRecord(store, uuid, mode = 'soft') {
  const db = await database();
  const current = await db.get(store, uuid);
  if (!current) return;
  if (store === 'licenses') {
    await deleteLicenseUsersLocally(db, current.uuid, mode);
  }
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

async function deleteLicenseUsersLocally(db, licenseUuid, mode = 'soft') {
  const users = (await db.getAll('users')).filter((user) => user.license_uuid === licenseUuid);
  const now = new Date().toISOString();
  for (const user of users) {
    if (mode === 'permanent') {
      await db.delete('users', user.uuid);
      await queueOperation('users', user.uuid, 'force_delete', { ...user, permanently_deleted_at: now });
      await auditLog('permanent_delete', 'users', user.uuid, user);
    } else {
      const deleted = { ...user, deleted_at: now, sync_status: 'pending' };
      await db.put('users', deleted);
      await queueOperation('users', user.uuid, 'delete', deleted);
      await auditLog('soft_delete', 'users', user.uuid, deleted);
    }
  }
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

export async function generateLicense({
  owner_name,
  business_type = 'Mobile Shop',
  device_id = '',
  type = '1 Month',
  status = 'Active',
  sale_price = 0,
  cost_price = 0,
  theme_color = '#14B8A6',
  logo = '',
  footer_branding = '',
}) {
  const months = { '1 Month': 1, '6 Months': 6, '1 Year': 12, Lifetime: 1200 }[type] || 1;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  const sale = Number(sale_price || 0);
  const cost = Number(cost_price || 0);
  await cleanupStartupData();
  return saveRecord('licenses', {
    license_key: `DSH-${crypto.randomUUID().slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    activation_code: crypto.randomUUID().slice(0, 12).toUpperCase(),
    owner_name,
    business_type,
    device_id: device_id || '',
    type,
    status,
    trial: type === 'Trial',
    expiry_date: type === 'Lifetime' ? 'Lifetime' : expiry.toISOString().slice(0, 10),
    activated_at: new Date().toISOString(),
    sale_price: sale,
    cost_price: cost,
    profit: Math.max(0, sale - cost),
    theme_color,
    logo,
    footer_branding,
    metadata: {
      sale_price: sale,
      cost_price: cost,
      profit: Math.max(0, sale - cost),
      theme_color,
      logo,
      footer_branding,
    },
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

export async function saveHospitalPatientWorkflow(record) {
  const visitDate = record.visit_date || new Date().toISOString().slice(0, 10);
  const patient = await saveRecord('patients', {
    ...record,
    token_number: record.token_number || await nextDailyToken('patients', visitDate, record.uuid),
    mr_number: record.mr_number || await nextNumber('patients', 'MR'),
    status: record.status || 'Waiting',
    visit_date: visitDate,
  });
  await clearGeneratedHospitalWorkflow(patient.uuid);
  const prescriptions = parseStructuredList(record.prescription_items || record.medicine);
  const orders = parseStructuredList(record.doctor_orders || '');
  const billItems = [];

  for (const item of prescriptions) {
    const row = await saveRecord('hospital_prescriptions', {
      patient_uuid: patient.uuid,
      patient_name: patient.patient_name,
      doctor_name: patient.doctor_name,
      medicine_uuid: item.medicine_uuid || '',
      medicine_name: item.medicine || item.medicine_name || item.name,
      morning: Number(item.morning || 0),
      afternoon: Number(item.afternoon || 0),
      evening: Number(item.evening || 0),
      night: Number(item.night || 0),
      days: Number(item.days || 1),
      status: 'Pending',
    });
    billItems.push({ item_type: 'Medicine', description: row.medicine_name, quantity: 1, amount: Number(item.amount || 0) });
  }

  for (const item of orders) {
    const type = item.order_type || item.type || item.name || item.order_name;
    const order = await saveRecord('hospital_orders', {
      patient_uuid: patient.uuid,
      patient_name: patient.patient_name,
      doctor_name: patient.doctor_name,
      order_type: orderType(type),
      order_name: item.order_name || item.name || type,
      charges: Number(item.charges || defaultOrderCharge(type)),
      status: 'Pending',
      notes: item.notes || '',
    });
    const taskType = order.order_type;
    await saveRecord(taskType === 'Lab' ? 'lab_reports' : taskType === 'Radiology' ? 'radiology_reports' : 'hospital_tasks', {
      patient_uuid: patient.uuid,
      order_uuid: order.uuid,
      patient_name: patient.patient_name,
      task_type: taskType,
      task_name: order.order_name,
      test_name: taskType === 'Lab' ? order.order_name : undefined,
      study_type: taskType === 'Radiology' ? order.order_name : undefined,
      assigned_role: taskRole(taskType),
      status: 'Pending',
    });
    billItems.push({ item_type: taskType, description: order.order_name, quantity: 1, amount: Number(order.charges || 0) });
  }

  if (Number(patient.registration_fee || patient.fee || 0) > 0) {
    billItems.unshift({ item_type: 'Doctor Fee', description: 'Consultation / Registration Fee', quantity: 1, amount: Number(patient.registration_fee || patient.fee || 0) });
  }

  if (billItems.length) {
    const grandTotal = billItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const bill = await saveRecord('hospital_bills', {
      patient_uuid: patient.uuid,
      bill_number: await nextNumber('hospital_bills', 'HBL'),
      patient_name: patient.patient_name,
      doctor_fee: Number(patient.registration_fee || patient.fee || 0),
      medicine_charges: billItems.filter((item) => item.item_type === 'Medicine').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      injection_charges: billItems.filter((item) => item.item_type === 'Injection').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      lab_charges: billItems.filter((item) => item.item_type === 'Lab').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      radiology_charges: billItems.filter((item) => item.item_type === 'Radiology').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      procedure_charges: billItems.filter((item) => !['Medicine', 'Injection', 'Lab', 'Radiology', 'Doctor Fee'].includes(item.item_type)).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      grand_total: grandTotal,
      paid: 0,
      balance: grandTotal,
      status: 'Pending',
    });
    for (const item of billItems) {
      await saveRecord('hospital_bill_items', { ...item, bill_uuid: bill.uuid, patient_uuid: patient.uuid });
    }
  }

  return patient;
}

async function clearGeneratedHospitalWorkflow(patientUuid) {
  for (const store of ['hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items']) {
    const rows = await listRecords(store);
    for (const row of rows.filter((item) => item.patient_uuid === patientUuid)) {
      await deleteRecord(store, row.uuid, 'soft');
    }
  }
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

export async function addMobileWalletTransaction(record) {
  const amount = Number(record.amount || 0);
  const fee = Number(record.fee || 0);
  const direction = record.type || 'Cash In';
  const debit = direction === 'Cash In' ? amount : 0;
  const credit = direction === 'Cash Out' ? amount : 0;
  const transaction = await saveRecord('mobile_wallet_transactions', {
    ...record,
    amount,
    fee,
    net_amount: amount - fee,
    status: record.status || 'Completed',
    transacted_at: record.transacted_at || new Date().toISOString(),
  });
  await saveRecord('cashbook', {
    type: `${record.provider || 'Wallet'} ${direction}`,
    description: `${transaction.customer_name || transaction.phone || 'Mobile wallet'} ${transaction.reference_number || ''}`.trim(),
    debit,
    credit,
    reference: transaction.uuid,
    entry_at: transaction.transacted_at,
  });
  return transaction;
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
  const [products, sales, repairs, receipts, suppliers, purchases, licenses, saved] = await Promise.all([
    listRecords('products'), listRecords('sales'), listRecords('repairs'), listRecords('manual_repair_receipts'),
    listRecords('suppliers'), listRecords('purchases'), listRecords('licenses'), listRecords('notifications'),
  ]);
  const scope = currentScope();
  const visibleLicenses = scope.role === 'Super Admin' || !scope.license_uuid
    ? licenses
    : licenses.filter((license) => license.uuid === scope.license_uuid);
  const dismissed = new Set(saved.map((item) => item.dismissed_source).filter(Boolean));
  const isOpenRepair = (repair) => !['Delivered', 'Completed'].includes(String(repair.status || '').trim());
  const daysLeft = (license) => {
    if (!license.expiry_date || license.expiry_date === 'Lifetime') return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(license.expiry_date);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000);
  };
  const generated = [
    ...visibleLicenses
      .map((license) => ({ license, days: daysLeft(license) }))
      .filter(({ license, days }) => license.status === 'Active' && days !== null && days <= 30)
      .map(({ license, days }) => ({
        uuid: `license-${license.uuid}`,
        type: 'License Renewal',
        title: license.owner_name || license.license_key,
        body: days < 0
          ? 'License expired. Please renew your license.'
          : `${days} days left. Key expire hone wali hai, please renew your license.`,
        priority: days < 0 ? 'high' : 'medium',
      })),
    ...products
      .filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 3))
      .map((product) => ({ uuid: `low-${product.uuid}`, type: 'Low Stock', title: product.product_name, body: `${product.quantity || 0} units remaining`, priority: 'high' })),
    ...sales
      .filter((sale) => Number(sale.profit || 0) < 0)
      .map((sale) => ({ uuid: `loss-${sale.uuid}`, type: 'Loss Alert', title: sale.invoice_number, body: `${sale.customer_name || 'Customer'} loss ${formatMoney(Math.abs(Number(sale.profit || 0)))}`, priority: 'high' })),
    ...sales
      .filter((sale) => Number(sale.balance || 0) > 0)
      .map((sale) => ({ uuid: `credit-${sale.uuid}`, type: 'Pending Credit', title: sale.invoice_number, body: `${sale.customer_name || 'Customer'}: ${formatMoney(sale.balance)}`, priority: 'medium' })),
    ...[...repairs, ...receipts]
      .filter(isOpenRepair)
      .map((repair) => ({ uuid: `repair-${repair.uuid}`, type: 'Pending Repair', title: repair.job_number || repair.receipt_number || repair.customer_name, body: `${repair.customer_name || ''} ${repair.device_name || ''}`.trim(), priority: 'medium' })),
    ...suppliers
      .filter((supplier) => Number(supplier.balance || 0) > 0)
      .map((supplier) => ({ uuid: `supplier-${supplier.uuid}`, type: 'Supplier Payment Due', title: supplier.supplier_name, body: formatMoney(supplier.balance), priority: 'medium' })),
    ...purchases
      .filter((purchase) => Number(purchase.balance || 0) > 0)
      .map((purchase) => ({ uuid: `purchase-${purchase.uuid}`, type: 'Supplier Payment Due', title: purchase.invoice_number, body: `${purchase.supplier_name || 'Supplier'}: ${formatMoney(purchase.balance)}`, priority: 'medium' })),
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
  const [sales, saleItems, products, expenses, customers, suppliers, repairs, receipts, purchases, wallets, patients, assistants, medicines, prescriptions, labReports, radiologyReports, hospitalBills] = await Promise.all([
    listRecords('sales'), listRecords('sale_items'), listRecords('products'), listRecords('expenses'),
    listRecords('customers'), listRecords('suppliers'), listRecords('repairs'), listRecords('manual_repair_receipts'), listRecords('purchases'),
    listRecords('mobile_wallet_transactions'), listRecords('patients'), listRecords('assistants'), listRecords('medicines'),
    listRecords('hospital_prescriptions'), listRecords('lab_reports'), listRecords('radiology_reports'), listRecords('hospital_bills'),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const nearExpiryLimit = Date.now() + 90 * 86400000;
  const medicineProducts = products.filter((product) => product.category === 'Medicine' || product.medicine_uuid);
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
    mobile_wallets: wallets,
    patients,
    assistants,
    daily_patients: patients.filter((patient) => sameDay(patient.visit_date || patient.created_at)),
    monthly_patients: patients.filter((patient) => String(patient.visit_date || patient.created_at || '').startsWith(new Date().toISOString().slice(0, 7))),
    doctor_performance: Object.entries(patients.reduce((acc, patient) => ({ ...acc, [patient.doctor_name || 'Unassigned']: (acc[patient.doctor_name || 'Unassigned'] || 0) + 1 }), {})).map(([doctor_name, patients_count]) => ({ doctor_name, patients_count })),
    hospital_revenue: hospitalBills,
    lab_report_summary: labReports,
    radiology_report_summary: radiologyReports,
    pharmacy_prescriptions: prescriptions,
    follow_up_report: patients.filter((patient) => patient.next_visit),
    pending_bills: hospitalBills.filter((bill) => Number(bill.balance || 0) > 0),
    top_medicines: Object.entries(prescriptions.reduce((acc, row) => ({ ...acc, [row.medicine_name || 'Unknown']: (acc[row.medicine_name || 'Unknown'] || 0) + 1 }), {})).map(([medicine_name, total]) => ({ medicine_name, total })).sort((a, b) => b.total - a.total).slice(0, 20),
    medicines,
    low_stock_medicines: medicineProducts.filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 0)),
    near_expiry_medicines: medicineProducts.filter((product) => product.expiry_date && new Date(product.expiry_date).getTime() >= Date.now() && new Date(product.expiry_date).getTime() <= nearExpiryLimit),
    expired_medicines: medicineProducts.filter((product) => product.expiry_date && String(product.expiry_date).slice(0, 10) < today),
    manufacturer_reports: Object.entries(medicines.reduce((acc, row) => ({ ...acc, [row.manufacturer || 'Unknown']: (acc[row.manufacturer || 'Unknown'] || 0) + 1 }), {})).map(([manufacturer, total]) => ({ manufacturer, total })),
    category_reports: Object.entries(medicines.reduce((acc, row) => ({ ...acc, [row.category || 'Uncategorized']: (acc[row.category || 'Uncategorized'] || 0) + 1 }), {})).map(([category, total]) => ({ category, total })),
  };
  return rows[type] || [];
}

export async function syncNow() {
  if (!navigator.onLine) return { skipped: true };
  const db = await database();
  const scope = currentScope();
  const pending = (await db.getAll('sync_queue')).filter((item) => {
    if (item.status !== 'pending') return false;
    if (scope.role === 'Super Admin' || !scope.license_uuid) return true;
    if (!TENANT_SCOPED_STORES.has(item.entity)) return true;
    return item.data?.license_uuid === scope.license_uuid;
  });
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
  const records = parseCsv(await file.text());
  for (const record of records) await saveRecord(store, record);
  return records.length;
}

export async function searchMedicines(query, filters = {}) {
  const params = new URLSearchParams({ q: query || '', per_page: String(filters.per_page || 50) });
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== 'per_page') params.set(key, value);
  }

  if (navigator.onLine && localStorage.getItem('dsh_token')) {
    try {
      const response = await fetch(`${API_URL}/medicines/search?${params}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
      });
      const payload = await response.json();
      if (response.ok) {
        const rows = payload.data || payload;
        for (const row of rows) await saveRecord('medicines', row, 'sync');
        return rows;
      }
    } catch {
      // Fall back to local indexed lookup.
    }
  }

  return offlineMedicineSearch(query, filters);
}

export async function offlineMedicineSearch(query = '', filters = {}) {
  const terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = await listRecords('medicines');
  return rows
    .filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (!value || key === 'per_page') continue;
        if (String(row[key] || '').toLowerCase() !== String(value).toLowerCase()) return false;
      }
      if (!terms.length) return true;
      const haystack = [
        row.brand_name, row.generic_name, row.composition, row.barcode,
        row.manufacturer, row.registration_no, row.category,
      ].join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term) || fuzzyIncludes(haystack, term));
    })
    .slice(0, Number(filters.per_page || 100));
}

export async function importMedicinesFile(file, mapping = {}, rollback = true) {
  if (navigator.onLine && localStorage.getItem('dsh_token')) {
    const form = new FormData();
    form.append('file', file);
    form.append('rollback_on_failure', rollback ? '1' : '0');
    for (const [field, source] of Object.entries(mapping)) {
      if (source) form.append(`mapping[${field}]`, source);
    }
    const response = await fetch(`${API_URL}/medicines/import`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Medicine import failed.');
    return payload;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Offline import supports CSV only. XLSX import will run when online.');
  }
  const rows = parseCsv(await file.text());
  let count = 0;
  for (const row of rows) {
    if (!row.brand_name && !row.brand && !row.name) continue;
    await saveRecord('medicines', normalizeMedicineRow(row));
    count += 1;
  }
  return { created: count, updated: 0, duplicates: 0, errors: [], total_rows: rows.length };
}

export async function importMasterCatalogCsv(file) {
  const text = await file.text();
  const records = parseCsv(text);
  const db = await database();
  const tx = db.transaction('master_catalogs', 'readwrite');
  const now = new Date().toISOString();
  let count = 0;
  for (const record of records) {
    if (!record.name) continue;
    await tx.store.put({ ...record, uuid: record.uuid || crypto.randomUUID(), updated_at: now, sync_status: 'local' });
    count += 1;
  }
  await tx.done;
  await auditLog('bulk_import', 'master_catalogs', crypto.randomUUID(), { count });
  return count;
}

export async function exportBackupFile(filename = 'msm-full-backup.json', storesToExport = STORE_NAMES) {
  const db = await database();
  const stores = {};
  const safeStores = [...new Set(storesToExport)].filter((store) => STORE_NAMES.includes(store));
  for (const store of safeStores) {
    stores[store] = await db.getAll(store);
  }
  const payload = {
    app: 'Market Sales Management System',
    version: 1,
    exported_at: new Date().toISOString(),
    device_id: localStorage.getItem('dsh_device_id') || ensureDeviceId(),
    stores,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return payload;
}

export async function importBackupFile(file) {
  const payload = JSON.parse(await file.text());
  if (!payload?.stores || typeof payload.stores !== 'object') throw new Error('Invalid backup file.');
  const db = await database();
  let count = 0;
  for (const [store, rows] of Object.entries(payload.stores)) {
    if (!STORE_NAMES.includes(store) || !Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row?.uuid) continue;
      await db.put(store, row);
      count += 1;
    }
  }
  return count;
}

export function printHtml(title, html) {
  const iframe = document.createElement('iframe');
  iframe.title = title;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(printDocument(title, html));
  doc.close();
  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1000);
  }, 100);
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

async function nextDailyToken(store, date, excludeUuid = '') {
  const day = String(date || new Date().toISOString()).slice(0, 10);
  const rows = (await listRecords(store)).filter((row) => {
    if (excludeUuid && row.uuid === excludeUuid) return false;
    return String(row.visit_date || row.created_at || '').startsWith(day);
  });
  const max = rows.reduce((highest, row) => {
    const numeric = Number(String(row.token_number || '').replace(/\D/g, ''));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return String(max + 1);
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
  const numberFields = new Set(['quantity', 'package_quantity', 'units_per_package', 'loose_quantity', 'low_stock_threshold', 'medicine_days', 'age']);
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, MONEY_FIELDS.has(key) || numberFields.has(key) ? Number(value || 0) : value]));
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

function parseStructuredList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name, medicine: name, order_name: name }));
  }
}

function orderType(value = '') {
  const text = String(value).toLowerCase();
  if (['cbc', 'lft', 'rft', 'blood', 'urine', 'lab'].some((word) => text.includes(word))) return 'Lab';
  if (['x-ray', 'xray', 'ultrasound', 'ct', 'mri', 'radiology'].some((word) => text.includes(word))) return 'Radiology';
  if (['injection', 'iv', 'drip', 'nebuli'].some((word) => text.includes(word))) return 'Injection';
  if (['admission'].some((word) => text.includes(word))) return 'Admission';
  return 'Procedure';
}

function taskRole(type) {
  return {
    Lab: 'Lab Technician',
    Radiology: 'X-Ray Technician',
    Injection: 'Nurse',
    Admission: 'Receptionist',
  }[type] || 'Assistant';
}

function defaultOrderCharge(value = '') {
  const type = orderType(value);
  return { Lab: 800, Radiology: 1500, Injection: 300, Admission: 0, Procedure: 500 }[type] || 0;
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

function parseCsv(text) {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  if (!headerLine) return [];
  const headers = splitCsvLine(headerLine).map((item) => item.replace(/^"|"$/g, '').trim());
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, String(cells[index] || '').replace(/^"|"$/g, '').replaceAll('""', '"')]));
  });
}

function splitCsvLine(line) {
  return line.match(/("([^"]|"")*"|[^,]+)/g) || [];
}

function normalizeMedicineRow(row) {
  const value = (...keys) => keys.map((key) => row[key]).find((item) => item !== undefined && item !== '');
  return {
    uuid: row.uuid || crypto.randomUUID(),
    brand_name: value('brand_name', 'brand', 'medicine_name', 'name') || '',
    generic_name: value('generic_name', 'generic') || '',
    composition: value('composition', 'formula') || '',
    strength: value('strength', 'potency') || '',
    dosage_form: value('dosage_form', 'form') || '',
    therapeutic_class: value('therapeutic_class', 'class') || '',
    manufacturer: value('manufacturer', 'company') || '',
    distributor: row.distributor || '',
    registration_no: value('registration_no', 'registration', 'drap_no') || '',
    barcode: row.barcode || '',
    pack_size: value('pack_size', 'pack') || '',
    category: row.category || 'Medicine',
    purchase_price: Number(row.purchase_price || 0),
    sale_price: Number(row.sale_price || 0),
    mrp: Number(row.mrp || 0),
    tax_percentage: Number(row.tax_percentage || 0),
    reorder_level: Number(row.reorder_level || 0),
    batch_tracking: row.batch_tracking ?? true,
    expiry_tracking: row.expiry_tracking ?? true,
    status: row.status || 'Active',
  };
}

function fuzzyIncludes(haystack, needle) {
  if (needle.length < 4) return false;
  return haystack.split(/\s+/).some((word) => levenshtein(word.slice(0, Math.max(word.length, needle.length)), needle) <= 1);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i;
    for (let j = 1; j <= b.length; j += 1) {
      const val = a[i - 1] === b[j - 1] ? dp[j - 1] : Math.min(dp[j - 1], prev, dp[j]) + 1;
      dp[j - 1] = prev;
      prev = val;
    }
    dp[b.length] = prev;
  }
  return dp[b.length];
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
