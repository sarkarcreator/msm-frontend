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
  'master_catalogs', 'medicines', 'imei_registry', 'imei_movements',
  'warranty_claims', 'sale_returns', 'sale_return_items', 'purchase_returns',
  'purchase_return_items', 'licenses', 'audit_logs', 'sync_queue',
  'trader_companies', 'trader_brands', 'trader_territories', 'trader_routes',
  'trader_salesmen', 'trader_retailers', 'trader_delivery_challans',
  'trader_recoveries', 'trader_salesman_ledgers', 'trader_distributor_ledgers',
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
  'master_catalogs', 'medicines', 'imei_registry', 'imei_movements',
  'warranty_claims', 'sale_returns', 'sale_return_items', 'purchase_returns',
  'purchase_return_items', 'licenses',
  'trader_companies', 'trader_brands', 'trader_territories', 'trader_routes',
  'trader_salesmen', 'trader_retailers', 'trader_delivery_challans',
  'trader_recoveries', 'trader_salesman_ledgers', 'trader_distributor_ledgers',
]);

const TENANT_SCOPED_STORES = new Set([
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'settings', 'notifications', 'inventory_transactions', 'manual_repair_receipts',
  'mobile_wallet_transactions', 'patients', 'assistants', 'hospital_prescriptions',
  'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports',
  'hospital_bills', 'hospital_bill_items', 'master_catalogs', 'imei_registry',
  'imei_movements', 'warranty_claims', 'sale_returns', 'sale_return_items',
  'purchase_returns', 'purchase_return_items', 'sync_queue',
  'trader_companies', 'trader_brands', 'trader_territories', 'trader_routes',
  'trader_salesmen', 'trader_retailers', 'trader_delivery_challans',
  'trader_recoveries', 'trader_salesman_ledgers', 'trader_distributor_ledgers',
]);

const BUSINESS_TYPED_STORES = new Set(['products', 'categories', 'brands', 'master_catalogs', 'medicines']);

export async function database() {
  return openDB('dsh-production-db', 9, {
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
    .filter((record) => !record.quarantined_at)
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
    const active = rows.filter((row) => !row.deleted_at && !row.quarantined_at && scopedRecordVisible(store, row));
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
  const payloadData = remotePayload(resource, data);
  const apiResource = apiResourceName(resource);
  const shouldPost = forceCreate || data.sync_status === 'pending' || !uuid;
  const request = (method, path = '') => fetch(`${API_URL}/${apiResource}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payloadData),
  });
  let response = await request(shouldPost ? 'POST' : 'PUT', shouldPost ? '' : `/${uuid}`);
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
      'X-Device-Id': localStorage.getItem('dsh_device_id') || ensureDeviceId(),
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
    imei_registry: 'imei-registry',
    imei_movements: 'imei-movements',
    warranty_claims: 'warranty-claims',
    sale_returns: 'sale-returns',
    sale_return_items: 'sale-return-items',
    purchase_returns: 'purchase-returns',
    purchase_return_items: 'purchase-return-items',
    trader_companies: 'trader-companies',
    trader_brands: 'trader-brands',
    trader_territories: 'trader-territories',
    trader_routes: 'trader-routes',
    trader_salesmen: 'trader-salesmen',
    trader_retailers: 'trader-retailers',
    trader_delivery_challans: 'trader-delivery-challans',
    trader_recoveries: 'trader-recoveries',
    trader_salesman_ledgers: 'trader-salesman-ledgers',
    trader_distributor_ledgers: 'trader-distributor-ledgers',
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
    'imei-registry': 'imei_registry',
    'imei-movements': 'imei_movements',
    'warranty-claims': 'warranty_claims',
    'sale-returns': 'sale_returns',
    'sale-return-items': 'sale_return_items',
    'purchase-returns': 'purchase_returns',
    'purchase-return-items': 'purchase_return_items',
    'trader-companies': 'trader_companies',
    'trader-brands': 'trader_brands',
    'trader-territories': 'trader_territories',
    'trader-routes': 'trader_routes',
    'trader-salesmen': 'trader_salesmen',
    'trader-retailers': 'trader_retailers',
    'trader-delivery-challans': 'trader_delivery_challans',
    'trader-recoveries': 'trader_recoveries',
    'trader-salesman-ledgers': 'trader_salesman_ledgers',
    'trader-distributor-ledgers': 'trader_distributor_ledgers',
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

function remotePayload(resource, data) {
  const { id, created_at, updated_at, deleted_at, sync_status, ...payload } = data;
  return sanitizeRemotePayload(resource, payload);
}

function sanitizeRemotePayload(resource, payload) {
  const allowed = {
    hospital_bills: ['uuid', 'license_uuid', 'business_type', 'patient_uuid', 'token_number', 'bill_number', 'patient_name', 'doctor_fee', 'medicine_charges', 'injection_charges', 'lab_charges', 'radiology_charges', 'procedure_charges', 'grand_total', 'paid', 'balance', 'status', 'metadata'],
    hospital_bill_items: ['uuid', 'license_uuid', 'business_type', 'bill_uuid', 'patient_uuid', 'token_number', 'item_type', 'description', 'quantity', 'amount', 'metadata'],
  }[resource];
  if (!allowed) return payload;
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)));
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
    return Boolean(record.license_uuid) && String(record.license_uuid).toLowerCase() === String(scope.license_uuid).toLowerCase();
  }
  if (TENANT_SCOPED_STORES.has(store)) {
    return false;
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
  if (['products', 'sale_items', 'purchase_items', 'imei_registry'].includes(store) && record.imei_numbers) {
    record.imei_numbers = normalizeImeiList(record.imei_numbers);
    record.imei = record.imei || record.imei_numbers[0] || '';
    record.imei_1 = record.imei_1 || record.imei_numbers[0] || '';
    record.imei_2 = record.imei_2 || record.imei_numbers[1] || '';
  }
  if (scope.role !== 'Super Admin' && TENANT_SCOPED_STORES.has(store) && scope.license_uuid) {
    record.license_uuid = scope.license_uuid;
  }
  if (scope.role !== 'Super Admin' && BUSINESS_TYPED_STORES.has(store) && scope.business_type) {
    record.business_type = scope.business_type;
  }
  return record;
}

function normalizeImeiList(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
  if (typeof value === 'string') {
    try {
      const decoded = JSON.parse(value);
      if (Array.isArray(decoded)) return normalizeImeiList(decoded);
    } catch {
      // Plain IMEI text.
    }
    return [...new Set(value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean))];
  }
  return value ? [String(value).trim()].filter(Boolean) : [];
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
  if (store === 'patients') {
    await deletePatientWorkflowLocally(db, current.uuid, mode);
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

export async function barcodeLookup(scan, data = null, options = {}) {
  const term = normalizeScan(scan);
  if (!term) throw new Error('Scan code is required.');

  if (navigator.onLine && localStorage.getItem('dsh_token')) {
    try {
      const params = new URLSearchParams({ q: term });
      if (options.limit) params.set('limit', String(options.limit));
      const response = await fetch(`${API_URL}/barcode/lookup?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
          'X-Device-Id': localStorage.getItem('dsh_device_id') || ensureDeviceId(),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        await cacheBarcodeLookup(payload);
        await Promise.all((payload.results || []).map((result) => cacheBarcodeLookup(result)));
        return payload;
      }
      if (response.status !== 404 && response.status !== 422) {
        throw new Error(payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Barcode lookup failed.');
      }
    } catch (error) {
      if (navigator.onLine && !data) throw error;
    }
  }

  return localBarcodeLookup(term, data, options);
}

export async function receiveInventoryByScan({ scan, product_uuid, quantity = 1, cost_price, purchase_price, batch_number, expiry_date, reference, reason } = {}, data = null) {
  const qty = Math.max(1, Number(quantity || 1));
  if (navigator.onLine && localStorage.getItem('dsh_token')) {
    try {
      const response = await fetch(`${API_URL}/barcode/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
          'X-Device-Id': localStorage.getItem('dsh_device_id') || ensureDeviceId(),
        },
        body: JSON.stringify({ scan, product_uuid, quantity: qty, cost_price, purchase_price, batch_number, expiry_date, reference, reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        await cacheBarcodeLookup({ product: payload.product });
        if (payload.inventory_transaction?.uuid) {
          const db = await database();
          await db.put('inventory_transactions', normalizeNumbers(scopeRecordForSave('inventory_transactions', { ...payload.inventory_transaction, sync_status: 'synced' })));
        }
        return payload.product;
      }
      throw new Error(payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Inventory receiving failed.');
    } catch (error) {
      if (navigator.onLine && !data) throw error;
    }
  }

  const lookup = product_uuid ? { product: await getRecord('products', product_uuid), quantity_multiplier: 1 } : await localBarcodeLookup(scan, data);
  const product = lookup.product;
  if (!product?.uuid) throw new Error('Product not found for this scan.');
  const finalQuantity = qty * Number(lookup.quantity_multiplier || 1);
  const updated = await saveRecord('products', {
    ...product,
    purchase_price: Number(cost_price ?? purchase_price ?? product.purchase_price ?? 0),
    batch_number: batch_number ?? product.batch_number,
    expiry_date: expiry_date ?? product.expiry_date,
    quantity: Number(product.quantity || 0) + finalQuantity,
  });
  await saveRecord('inventory_transactions', {
    product_uuid: product.uuid,
    product_name: product.product_name,
    type: 'Stock In',
    quantity: finalQuantity,
    reference: reference || 'BARCODE-RECEIVE',
    reason: reason || 'Barcode Receiving',
    transacted_at: new Date().toISOString(),
  });
  return updated;
}

async function cacheBarcodeLookup(payload = {}) {
  const db = await database();
  if (payload.product?.uuid) {
    await db.put('products', normalizeNumbers(scopeRecordForSave('products', { ...payload.product, sync_status: 'synced' })));
  }
  if (payload.imei?.uuid) {
    await db.put('imei_registry', normalizeNumbers(scopeRecordForSave('imei_registry', { ...payload.imei, sync_status: 'synced' })));
  }
  if (payload.medicine?.uuid) {
    await db.put('medicines', normalizeNumbers(scopeRecordForSave('medicines', { ...payload.medicine, sync_status: 'synced' })));
  }
  if (payload.catalog?.uuid) {
    await db.put('master_catalogs', normalizeNumbers(scopeRecordForSave('master_catalogs', { ...payload.catalog, sync_status: 'synced' })));
  }
}

async function localBarcodeLookup(scan, data = null, options = {}) {
  const term = normalizeScan(scan);
  const products = data?.products || await listRecords('products');
  const imeis = data?.imei_registry || await listRecords('imei_registry');
  const medicines = data?.medicines || await listRecords('medicines');
  const catalogs = data?.master_catalogs || await listRecords('master_catalogs');
  const exact = (value) => normalizeScan(value).toLowerCase() === term.toLowerCase();

  for (const field of ['barcode', 'secondary_barcode', 'qr_code']) {
    const product = products.find((row) => exact(row[field]));
    if (product) return withLocalResults({ match_type: field, scan, product, imei: null, quantity_multiplier: localQuantityMultiplier(field, product) }, term, products, imeis, options);
  }

  const imei = imeis.find((row) => [row.imei_1, row.imei_2, row.serial_number, ...(normalizeImeiList(row.imei_numbers || []))]
    .some((value) => exact(value)));
  if (imei) {
    const product = products.find((row) => row.uuid === imei.product_uuid) || null;
    return withLocalResults({ match_type: 'imei', scan, product, imei, quantity_multiplier: 1 }, term, products, imeis, options);
  }

  for (const field of ['sku', 'product_code', 'box_barcode', 'carton_barcode']) {
    const product = products.find((row) => exact(row[field]));
    if (product) return withLocalResults({ match_type: field, scan, product, imei: null, quantity_multiplier: localQuantityMultiplier(field, product) }, term, products, imeis, options);
  }

  const product = products.find((row) => [row.product_name, row.brand].some((value) => String(value || '').toLowerCase().includes(term.toLowerCase())));
  if (product) return withLocalResults({ match_type: String(product.product_name || '').toLowerCase().includes(term.toLowerCase()) ? 'product_name' : 'brand', scan, product, imei: null, quantity_multiplier: 1 }, term, products, imeis, options);

  const medicine = medicines.find((row) => [row.barcode, row.registration_no].some((value) => exact(value))
    || [row.brand_name, row.generic_name, row.composition].some((value) => String(value || '').toLowerCase().includes(term.toLowerCase())));
  if (medicine) return { match_type: 'medicine_master', scan, medicine, product: null, imei: null, quantity_multiplier: 1, results: [] };

  const catalog = catalogs.find((row) => ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'brand', 'product_name', 'name']
    .some((field) => field.includes('name') ? String(row[field] || '').toLowerCase().includes(term.toLowerCase()) : exact(row[field])));
  if (catalog) return { match_type: 'master_catalog', scan, catalog, product: null, imei: null, quantity_multiplier: localQuantityMultiplier('catalog', catalog), results: [] };

  throw new Error('No product found for this scan.');
}

function withLocalResults(payload, term, products, imeis, options = {}) {
  const limit = Number(options.limit || 0);
  if (!limit) return payload;
  const seen = new Set();
  const results = [];
  const add = (match_type, product, imei = null, quantity_multiplier = 1) => {
    if (!product?.uuid || seen.has(`${product.uuid}:${match_type}`)) return;
    seen.add(`${product.uuid}:${match_type}`);
    results.push({ match_type, product, imei, quantity_multiplier });
  };
  for (const field of ['barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'box_barcode', 'carton_barcode']) {
    products.filter((row) => normalizeScan(row[field]).toLowerCase() === term.toLowerCase()).forEach((product) => add(field, product, null, localQuantityMultiplier(field, product)));
  }
  imeis.filter((row) => [row.imei_1, row.imei_2, row.serial_number, ...(normalizeImeiList(row.imei_numbers || []))]
    .some((value) => normalizeScan(value).toLowerCase() === term.toLowerCase()))
    .forEach((imei) => add('imei', products.find((row) => row.uuid === imei.product_uuid), imei, 1));
  products.filter((row) => [row.product_name, row.brand, row.category].some((value) => String(value || '').toLowerCase().includes(term.toLowerCase())))
    .forEach((product) => add(String(product.product_name || '').toLowerCase().includes(term.toLowerCase()) ? 'product_name' : 'brand', product));
  return { ...payload, results: results.slice(0, limit) };
}

function normalizeScan(value) {
  return String(value || '').trim();
}

function localQuantityMultiplier(field, row = {}) {
  if (field === 'carton_barcode') return Math.max(1, Number(row.units_per_carton || row.units_per_package || 1));
  if (field === 'box_barcode') return Math.max(1, Number(row.units_per_box || row.units_per_package || 1));
  return 1;
}

async function deletePatientWorkflowLocally(db, patientUuid, mode = 'soft') {
  const stores = ['hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items'];
  const now = new Date().toISOString();
  for (const store of stores) {
    const rows = (await db.getAll(store)).filter((row) => row.patient_uuid === patientUuid);
    for (const row of rows) {
      if (mode === 'permanent') {
        await db.delete(store, row.uuid);
        await queueOperation(store, row.uuid, 'force_delete', { ...row, permanently_deleted_at: now });
        await auditLog('permanent_delete', store, row.uuid, row);
      } else {
        const deleted = { ...row, deleted_at: now, sync_status: 'pending' };
        await db.put(store, deleted);
        await queueOperation(store, row.uuid, 'delete', deleted);
        await auditLog('soft_delete', store, row.uuid, deleted);
      }
    }
  }
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

export async function createSale({ customer_uuid, payment_type, discount, tax, paid, due_date, cart, ...extra }) {
  if (!cart?.length) throw new Error('Cart is empty.');
  const retailPrefix = retailBackendPrefix();
  if (retailPrefix) {
    try {
      const payload = await retailEnterpriseRequest(retailPrefix, 'sales', {
        customer_uuid, payment_type, discount, tax, paid, due_date, cart, ...extra,
      });
      await cacheMobileShopWorkflow(payload);
      return payload.sale;
    } catch (error) {
      if (navigator.onLine) throw error;
    }
  }
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
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) {
    throw new Error('Hospital workflow requires online backend validation.');
  }

  const response = await fetch(`${API_URL}/hospital/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
      'X-Device-Id': localStorage.getItem('dsh_device_id') || ensureDeviceId(),
    },
    body: JSON.stringify(record),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Hospital workflow save failed.';
    throw new Error(detail);
  }

  await cacheHospitalWorkflow(payload);
  return payload.patient;
}

export async function syncHospitalPatientWorkflow(patientUuid) {
  if (!patientUuid || !navigator.onLine || !localStorage.getItem('dsh_token')) return { skipped: true };
  await syncNow();
  return { synced: true };
}

export async function transitionHospitalPatientStatus(patientUuid, status) {
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) {
    throw new Error('Patient status transition requires online backend validation.');
  }
  const response = await fetch(`${API_URL}/hospital/patients/${patientUuid}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify({ status }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Patient status transition failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put('patients', normalizeNumbers(scopeRecordForSave('patients', { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function completeHospitalPrescription(prescriptionUuid) {
  const response = await fetch(`${API_URL}/hospital/prescriptions/${prescriptionUuid}/complete`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Prescription completion failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put('hospital_prescriptions', normalizeNumbers(scopeRecordForSave('hospital_prescriptions', { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function completeHospitalLabReport(reportUuid, details = {}) {
  const response = await fetch(`${API_URL}/hospital/lab-reports/${reportUuid}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify(details),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Lab completion failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put('lab_reports', normalizeNumbers(scopeRecordForSave('lab_reports', { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function completeHospitalRadiologyReport(reportUuid, details = {}) {
  const response = await fetch(`${API_URL}/hospital/radiology-reports/${reportUuid}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify(details),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Radiology completion failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put('radiology_reports', normalizeNumbers(scopeRecordForSave('radiology_reports', { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function reviewHospitalReport(store, reportUuid, doctor_review_status) {
  const endpoint = store === 'radiology_reports' ? 'radiology-reports' : 'lab-reports';
  const response = await fetch(`${API_URL}/hospital/${endpoint}/${reportUuid}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify({ doctor_review_status }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Report review failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put(store, normalizeNumbers(scopeRecordForSave(store, { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function recalculateHospitalBill(billUuid, paid) {
  const response = await fetch(`${API_URL}/hospital/bills/${billUuid}/recalculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify({ paid }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Bill recalculation failed.';
    throw new Error(detail);
  }
  const db = await database();
  await db.put('hospital_bills', normalizeNumbers(scopeRecordForSave('hospital_bills', { ...payload, sync_status: 'synced' })));
  return payload;
}

export async function saveHospitalBillPayment(billUuid, { paid_amount, payment_method = 'Cash' } = {}) {
  const response = await fetch(`${API_URL}/hospital/bills/${billUuid}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
    },
    body: JSON.stringify({ paid_amount, payment_method }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Bill payment save failed.';
    throw new Error(detail);
  }
  const db = await database();
  if (payload.bill?.uuid) await db.put('hospital_bills', normalizeNumbers(scopeRecordForSave('hospital_bills', { ...payload.bill, sync_status: 'synced' })));
  if (payload.patient?.uuid) await db.put('patients', normalizeNumbers(scopeRecordForSave('patients', { ...payload.patient, sync_status: 'synced' })));
  for (const notification of payload.notifications || []) {
    if (notification?.uuid) await db.put('notifications', normalizeNumbers(scopeRecordForSave('notifications', { ...notification, sync_status: 'synced' })));
  }
  return payload;
}

async function cacheHospitalWorkflow(payload) {
  const db = await database();
  const pairs = [
    ['patients', [payload.patient].filter(Boolean)],
    ['hospital_prescriptions', payload.prescriptions || []],
    ['hospital_orders', payload.orders || []],
    ['hospital_tasks', payload.tasks || []],
    ['lab_reports', payload.lab_reports || []],
    ['radiology_reports', payload.radiology_reports || []],
    ['hospital_bills', [payload.bill].filter(Boolean)],
    ['hospital_bill_items', payload.bill_items || []],
  ];
  for (const [store, rows] of pairs) {
    for (const row of rows) {
      if (row?.uuid) {
        await db.put(store, normalizeNumbers(scopeRecordForSave(store, { ...row, sync_status: 'synced' })));
      }
    }
  }
}

function businessTypeKey(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['mobile_shop', 'mobile'].includes(normalized)) return 'mobile_shop';
  if (normalized === 'traders') return 'traders';
  if (['general_store', 'grocery_store', 'grocery', 'shopping_mall', 'retail_shop'].includes(normalized)) return 'general_store';
  return normalized;
}

function retailBackendPrefix() {
  const scope = currentScope();
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) return '';
  const key = businessTypeKey(scope.business_type);
  if (key === 'mobile_shop') return 'mobile-shop';
  if (key === 'traders') return 'traders';
  if (key === 'general_store') return 'general-store';
  return '';
}

function shouldUseMobileShopBackend() {
  return retailBackendPrefix() === 'mobile-shop';
}

async function mobileShopRequest(endpoint, data) {
  return retailEnterpriseRequest('mobile-shop', endpoint, data);
}

async function retailEnterpriseRequest(prefix, endpoint, data) {
  const response = await fetch(`${API_URL}/${prefix}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}`,
      'X-Device-Id': localStorage.getItem('dsh_device_id') || ensureDeviceId(),
    },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.message || Object.values(payload.errors || {}).flat().join(' ') || 'Retail transaction failed.';
    throw new Error(detail);
  }
  return payload;
}

async function cacheMobileShopWorkflow(payload) {
  const db = await database();
  const pairs = [
    ['sales', [payload.sale].filter(Boolean)],
    ['sale_items', payload.sale_items || []],
    ['purchases', [payload.purchase].filter(Boolean)],
    ['purchase_items', payload.purchase_items || []],
    ['products', payload.products || []],
    ['imei_registry', payload.imeis || []],
    ['imei_movements', payload.imei_movements || []],
    ['warranty_claims', [payload.warranty_claim].filter(Boolean)],
    ['sale_returns', [payload.sale_return].filter(Boolean)],
    ['sale_return_items', payload.sale_return_items || []],
    ['purchase_returns', [payload.purchase_return].filter(Boolean)],
    ['purchase_return_items', payload.purchase_return_items || []],
    ['inventory_transactions', payload.inventory_transactions || []],
    ['cashbook', payload.cashbook || []],
    ['trader_retailers', payload.retailers || []],
    ['trader_delivery_challans', [payload.challan].filter(Boolean)],
    ['trader_recoveries', [payload.recovery].filter(Boolean)],
    ['trader_salesman_ledgers', payload.salesman_ledgers || []],
    ['trader_distributor_ledgers', payload.distributor_ledgers || []],
  ];
  for (const [store, rows] of pairs) {
    for (const row of rows) {
      if (row?.uuid) {
        await db.put(store, normalizeNumbers(scopeRecordForSave(store, { ...row, sync_status: 'synced' })));
      }
    }
  }
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
  if (!cart?.length) throw new Error('Purchase cart is empty.');
  const retailPrefix = retailBackendPrefix();
  if (retailPrefix) {
    try {
      const payload = await retailEnterpriseRequest(retailPrefix, 'purchases', {
        supplier_uuid, invoice_number, cart, paid,
      });
      await cacheMobileShopWorkflow(payload);
      return payload.purchase;
    } catch (error) {
      if (navigator.onLine) throw error;
    }
  }
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

export async function createTraderDeliveryChallan(record) {
  if (retailBackendPrefix() === 'traders') {
    const payload = await retailEnterpriseRequest('traders', 'delivery-challans', record);
    await cacheMobileShopWorkflow(payload);
    return payload.challan;
  }
  return saveRecord('trader_delivery_challans', {
    ...record,
    challan_number: record.challan_number || await nextNumber('trader_delivery_challans', 'CH'),
  });
}

export async function createTraderRecovery(record) {
  if (retailBackendPrefix() === 'traders') {
    const payload = await retailEnterpriseRequest('traders', 'recoveries', record);
    await cacheMobileShopWorkflow(payload);
    return payload.recovery;
  }
  return saveRecord('trader_recoveries', record);
}

export async function searchMobileShopImei(query = '', filters = {}) {
  if (shouldUseMobileShopBackend()) {
    const params = new URLSearchParams({ q: query || '', per_page: String(filters.per_page || 25) });
    if (filters.status) params.set('status', filters.status);
    const response = await fetch(`${API_URL}/mobile-shop/imeis/search?${params}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'IMEI search failed.');
    const rows = payload.data || payload;
    const db = await database();
    for (const row of rows) {
      if (row?.uuid) await db.put('imei_registry', normalizeNumbers(scopeRecordForSave('imei_registry', { ...row, sync_status: 'synced' })));
    }
    return rows;
  }
  const term = String(query || '').toLowerCase();
  return (await listRecords('imei_registry')).filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    return !term || [row.imei_1, row.imei_2, row.serial_number, row.customer_name, row.invoice_number]
      .join(' ')
      .toLowerCase()
      .includes(term);
  });
}

export async function createWarrantyClaim(record) {
  const payload = shouldUseMobileShopBackend()
    ? await mobileShopRequest('warranty-claims', record)
    : { warranty_claim: await saveRecord('warranty_claims', record) };
  await cacheMobileShopWorkflow(payload);
  return payload.warranty_claim;
}

export async function createSaleReturn(record) {
  const payload = shouldUseMobileShopBackend()
    ? await mobileShopRequest('sale-returns', record)
    : { sale_return: await saveRecord('sale_returns', record) };
  await cacheMobileShopWorkflow(payload);
  return payload.sale_return;
}

export async function createPurchaseReturn(record) {
  const payload = shouldUseMobileShopBackend()
    ? await mobileShopRequest('purchase-returns', record)
    : { purchase_return: await saveRecord('purchase_returns', record) };
  await cacheMobileShopWorkflow(payload);
  return payload.purchase_return;
}

export async function fetchMobileShopReport(type) {
  if (shouldUseMobileShopBackend()) {
    const response = await fetch(`${API_URL}/mobile-shop/reports/${encodeURIComponent(type)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Mobile Shop report failed.');
    return payload.data || [];
  }
  return generateReport(type.replace(/-/g, '_'));
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
  const [sales, saleItems, products, expenses, customers, suppliers, repairs, receipts, purchases, wallets, patients, assistants, medicines, prescriptions, labReports, radiologyReports, hospitalBills, retailers, salesmen, routes, territories, traderRecoveries, salesmanLedgers, distributorLedgers] = await Promise.all([
    listRecords('sales'), listRecords('sale_items'), listRecords('products'), listRecords('expenses'),
    listRecords('customers'), listRecords('suppliers'), listRecords('repairs'), listRecords('manual_repair_receipts'), listRecords('purchases'),
    listRecords('mobile_wallet_transactions'), listRecords('patients'), listRecords('assistants'), listRecords('medicines'),
    listRecords('hospital_prescriptions'), listRecords('lab_reports'), listRecords('radiology_reports'), listRecords('hospital_bills'),
    listRecords('trader_retailers'), listRecords('trader_salesmen'), listRecords('trader_routes'), listRecords('trader_territories'),
    listRecords('trader_recoveries'), listRecords('trader_salesman_ledgers'), listRecords('trader_distributor_ledgers'),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const nearExpiryLimit = Date.now() + 90 * 86400000;
  const medicineProducts = products.filter((product) => product.category === 'Medicine' || product.medicine_uuid);
  const topProducts = Object.values(saleItems.reduce((acc, item) => {
    const key = item.product_uuid || item.product_name || 'Unknown';
    acc[key] ||= { uuid: key, product_name: item.product_name || 'Unknown', quantity: 0, revenue: 0 };
    acc[key].quantity += Number(item.quantity || 0);
    acc[key].revenue += Number(item.quantity || 0) * Number(item.price || 0);
    return acc;
  }, {})).sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0)).slice(0, 50);
  const rows = {
    daily_sales: sales.filter((sale) => sameDay(sale.sold_at)),
    weekly_sales: sales.filter((sale) => withinDays(sale.sold_at, 7)),
    monthly_sales: sales.filter((sale) => String(sale.sold_at).startsWith(new Date().toISOString().slice(0, 7))),
    yearly_sales: sales.filter((sale) => String(sale.sold_at).startsWith(new Date().toISOString().slice(0, 4))),
    product_sales: saleItems,
    profit: sales.map((sale) => ({ invoice_number: sale.invoice_number, total: sale.total, profit: sale.profit, sold_at: sale.sold_at })),
    inventory: products,
    top_products: topProducts,
    low_stock: products.filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 0)),
    near_expiry: products.filter((product) => product.expiry_date && new Date(product.expiry_date).getTime() >= Date.now() && new Date(product.expiry_date).getTime() <= nearExpiryLimit),
    expired_products: products.filter((product) => product.expiry_date && String(product.expiry_date).slice(0, 10) < today),
    customers,
    expenses,
    suppliers,
    purchases,
    customer_ledger: await listRecords('customer_ledgers'),
    supplier_ledger: await listRecords('supplier_ledgers'),
    repairs: [...repairs, ...receipts],
    credit_recovery: sales.filter((sale) => Number(sale.balance || 0) > 0),
    mobile_wallets: wallets,
    route_sales: groupMoney(sales, 'route_name', 'total'),
    route_recovery: groupMoney(traderRecoveries, 'route_name', 'amount'),
    route_profit: groupMoney(sales, 'route_name', 'profit'),
    company_wise_sales: groupMoney(saleItems, 'company_name', 'total'),
    brand_wise_sales: groupMoney(saleItems, 'brand', 'total'),
    product_wise_sales: topProducts,
    outstanding_customers: retailers.filter((row) => Number(row.balance || 0) > 0),
    recovery_history: traderRecoveries,
    aging_report: retailers.filter((row) => Number(row.balance || 0) > 0).map((row) => ({ ...row, aging_days: daysSince(row.updated_at || row.created_at) })),
    salesman_ledger: salesmanLedgers,
    distributor_ledger: distributorLedgers,
    traders_dashboard: traderDashboardRows(sales, traderRecoveries, retailers, salesmen, routes, saleItems),
    trader_routes: routes,
    trader_territories: territories,
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
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) return { skipped: true };
  const db = await database();
  const scope = currentScope();
  const pending = (await db.getAll('sync_queue')).filter((item) => {
    if (item.status !== 'pending') return false;
    if (scope.role === 'Super Admin' || !scope.license_uuid) return true;
    if (!TENANT_SCOPED_STORES.has(item.entity)) return true;
    return item.data?.license_uuid === scope.license_uuid;
  });
  if (!pending.length) {
    await pullRemoteChanges();
    return { synced: 0 };
  }
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
          data: sanitizeRemotePayload(item.entity, item.data || {}),
          client_updated_at: item.client_updated_at,
        })),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Sync failed');
    const results = payload.results || [];
    const accepted = new Set(results.filter((item) => item.status === 'accepted').map((item) => item.uuid));
    const conflicts = new Map(results.filter((item) => item.status === 'conflict' && item.server).map((item) => [item.uuid, item.server]));
    const rejected = new Set(results.filter((item) => item.status === 'rejected').map((item) => item.uuid));
    for (const item of pending) {
      if (!accepted.has(item.record_uuid)) {
        if (conflicts.has(item.record_uuid)) {
          await db.put(item.entity, normalizeNumbers(scopeRecordForSave(item.entity, { ...conflicts.get(item.record_uuid), sync_status: 'synced' })));
          await db.put('sync_queue', { ...item, status: 'resolved_conflict', synced_at: new Date().toISOString() });
        } else if (rejected.has(item.record_uuid)) {
          await db.put('sync_queue', { ...item, status: 'rejected', synced_at: new Date().toISOString() });
        }
        continue;
      }
      await db.put('sync_queue', { ...item, status: 'synced', synced_at: new Date().toISOString() });
      const current = await db.get(item.entity, item.record_uuid);
      if (current) await db.put(item.entity, { ...current, sync_status: 'synced' });
    }
    await pullRemoteChanges();
    return payload;
  } catch (error) {
    return { error: error.message };
  }
}

export async function pullRemoteChanges() {
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) return { skipped: true };
  const db = await database();
  const since = localStorage.getItem('dsh_sync_since') || new Date(Date.now() - 86400000 * 30).toISOString();
  try {
    const response = await fetch(`${API_URL}/sync/pull?since=${encodeURIComponent(since)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Sync pull failed');
    const operations = payload.operations || [];
    for (const operation of operations) {
      const store = operation.entity;
      if (!STORE_NAMES.includes(store)) continue;
      if (operation.action === 'conflict') continue;
      const recordUuid = operation.uuid || operation.payload?.uuid;
      if (!recordUuid) continue;
      if (operation.action === 'force_delete') {
        await db.delete(store, recordUuid);
      } else if (operation.action === 'delete') {
        const current = await db.get(store, recordUuid);
        if (current) await db.put(store, { ...current, deleted_at: current.deleted_at || operation.updated_at || new Date().toISOString(), sync_status: 'synced' });
      } else if (operation.payload) {
        await db.put(store, normalizeNumbers(scopeRecordForSave(store, { ...operation.payload, sync_status: 'synced' })));
      }
    }
    localStorage.setItem('dsh_sync_since', payload.server_time || new Date().toISOString());
    return { pulled: operations.length };
  } catch (error) {
    return { error: error.message };
  }
}

export async function hydrateRemoteStores(stores = []) {
  if (!navigator.onLine || !localStorage.getItem('dsh_token')) return { skipped: true };
  const db = await database();
  const scope = currentScope();
  let imported = 0;
  await Promise.all(stores.filter((store) => STORE_NAMES.includes(store)).map(async (store) => {
    try {
      const response = await fetch(`${API_URL}/${apiResourceName(store)}?per_page=1000`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('dsh_token') || ''}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const rows = Array.isArray(payload) ? payload : payload.data || [];
      for (const row of rows) {
        if (!row?.uuid) continue;
        await db.put(store, normalizeNumbers(scopeRecordForSave(store, {
          ...row,
          license_uuid: scope.license_uuid || row.license_uuid,
          business_type: scope.business_type || row.business_type,
          sync_status: 'synced',
        })));
        imported += 1;
      }
    } catch {
      // Keep local data if one remote store is temporarily unavailable.
    }
  }));
  return { imported };
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
  let count = 0;
  for (const record of records) {
    const productName = record.product_name || record.name;
    if (!productName) continue;
    await saveRecord('master_catalogs', { ...record, name: productName, product_name: productName });
    count += 1;
  }
  await auditLog('bulk_import', 'master_catalogs', crypto.randomUUID(), { count });
  return count;
}

export async function exportBackupFile(filename = 'msm-full-backup.json', storesToExport = STORE_NAMES) {
  const stores = {};
  const safeStores = [...new Set(storesToExport)].filter((store) => STORE_NAMES.includes(store));
  for (const store of safeStores) {
    stores[store] = await listRecords(store);
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
  const scope = currentScope();
  let count = 0;
  for (const [store, rows] of Object.entries(payload.stores)) {
    if (!STORE_NAMES.includes(store) || !Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row?.uuid) continue;
      if (scope.role !== 'Super Admin' && TENANT_SCOPED_STORES.has(store) && row.license_uuid && row.license_uuid !== scope.license_uuid) {
        continue;
      }
      await db.put(store, normalizeNumbers(scopeRecordForSave(store, row)));
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
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

export function normalizePakistanPhone(phone) {
  let cleanPhone = String(phone || '').trim().replace(/[^\d]/g, '');
  if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.slice(2);
  if (cleanPhone.startsWith('0')) cleanPhone = `92${cleanPhone.slice(1)}`;
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = `92${cleanPhone}`;
  return cleanPhone;
}

function notifyUser(message) {
  window.dispatchEvent(new CustomEvent('dsh:toast', { detail: message }));
}

export function whatsAppShare(phone, message) {
  const normalizedPhone = normalizePakistanPhone(phone);
  if (!normalizedPhone) {
    notifyUser('Customer mobile number missing');
    console.warn('WhatsApp share blocked: customer mobile number missing', { phone });
    return null;
  }

  const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message || '')}`;
  console.info('Generated WhatsApp URL', {
    originalPhone: phone,
    normalizedPhone,
    whatsappUrl,
  });

  const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = whatsappUrl;
  }

  return { whatsappUrl, normalizedPhone };
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
  const scope = currentScope();
  const scopedData = scopeRecordForSave(entity, { ...(data || {}) });
  await db.put('sync_queue', {
    uuid: crypto.randomUUID(),
    entity,
    record_uuid,
    action,
    data: scopedData,
    license_uuid: scopedData.license_uuid || scope.license_uuid || '',
    business_type: scopedData.business_type || scope.business_type || '',
    revision: Number(scopedData.revision || 1),
    is_tombstone: ['delete', 'force_delete'].includes(action),
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
  return `T-${String(max + 1).padStart(6, '0')}`;
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

function groupMoney(rows, keyField, moneyField) {
  return Object.values((rows || []).reduce((acc, row) => {
    const key = row[keyField] || 'Unassigned';
    acc[key] ||= { uuid: key, name: key, total: 0, count: 0 };
    acc[key].total += Number(row[moneyField] || row.total || 0);
    acc[key].count += 1;
    return acc;
  }, {})).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
}

function daysSince(value) {
  const time = value ? new Date(value).getTime() : Date.now();
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function traderDashboardRows(sales, recoveries, retailers, salesmen, routes, saleItems) {
  const month = new Date().toISOString().slice(0, 7);
  return [{
    uuid: 'traders-dashboard',
    today_sales: (sales || []).filter((sale) => sameDay(sale.sold_at)).reduce((total, sale) => total + Number(sale.total || 0), 0),
    today_recovery: (recoveries || []).filter((row) => sameDay(row.date || row.recovered_at || row.created_at)).reduce((total, row) => total + Number(row.amount || 0), 0),
    outstanding_receivables: (retailers || []).reduce((total, row) => total + Number(row.balance || 0), 0),
    top_salesman: groupMoney(sales, 'salesman_name', 'total')[0]?.name || 'No Data Available',
    top_route: groupMoney(sales, 'route_name', 'total')[0]?.name || 'No Data Available',
    top_brand: groupMoney(saleItems, 'brand', 'total')[0]?.name || 'No Data Available',
    monthly_profit: (sales || []).filter((sale) => String(sale.sold_at || '').startsWith(month)).reduce((total, sale) => total + Number(sale.profit || 0), 0),
    salesmen: (salesmen || []).length,
    routes: (routes || []).length,
  }];
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
