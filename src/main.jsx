import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3, Bell, Boxes, Calculator, Cloud, CloudOff, Download, Edit3, FileDown,
  FileText, KeyRound, Keyboard, MessageCircle, Moon, Palette, Plus, Printer,
  ReceiptText, Search, Settings, Smartphone, Sun, Trash2, Upload, Users,
  WalletCards, Wrench, X,
  LogOut,
} from 'lucide-react';
import {
  API_URL,
  activeLicenseStatus, addExpense, createPurchase, createSale, dashboardSnapshot,
  activateLicenseAccount,
  cleanupStartupData, deleteRecord, downloadPdf, ensureDeviceId, exportCsv, generateLicense,
  getBrandSettings, importCsvRecords, listRecords, notificationCenter,
  printHtml, quickCustomer, receiptQrData, receiveCustomerPayment,
  reportData, saveBrandSettings, saveRecord, saveRemoteRecord, saveUserAccount, syncNow, updateRepairStatus,
  whatsAppShare, createManualRepairReceipt,
} from './lib/db.js';
import './styles/app.css';

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pos', label: 'Sales POS', icon: ReceiptText },
  { id: 'sales', label: 'Sales', icon: FileText },
  { id: 'products', label: 'Inventory', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'credit', label: 'Udhaar', icon: WalletCards },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'repairReceipts', label: 'Repair Receipts', icon: Printer },
  { id: 'purchases', label: 'Purchases', icon: Upload },
  { id: 'suppliers', label: 'Suppliers', icon: Smartphone },
  { id: 'expenses', label: 'Expenses', icon: Calculator },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'accounting', label: 'Accounting', icon: FileText },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'licenses', label: 'Licenses', icon: KeyRound },
  { id: 'settings', label: 'Admin', icon: Settings },
];

const SHOP_TYPES = ['Mobile Shop', 'Grocery Store', 'Pharmacy', 'General Store', 'Shopping Mall', 'Electronics Store', 'Clothing Store', 'Hardware Store'];
const REPAIR_SHOP_TYPES = new Set(['Mobile Shop', 'Electronics Store']);

const ROLE_MODULES = {
  'Super Admin': MODULES.map((item) => item.id),
  Admin: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'repairs', 'repairReceipts', 'purchases', 'suppliers', 'expenses', 'notifications', 'accounting', 'reports', 'users'],
  Manager: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'repairs', 'repairReceipts', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports'],
  Cashier: ['dashboard', 'pos', 'sales', 'customers', 'credit', 'repairReceipts', 'notifications'],
  Technician: ['dashboard', 'customers', 'repairs', 'repairReceipts', 'notifications'],
};

function userRole(user) {
  return user?.role?.name || user?.role_name || user?.role || 'Cashier';
}

function modulesForBusiness(modules, brand) {
  const type = brand?.business_type || 'General Store';
  if (REPAIR_SHOP_TYPES.has(type)) return modules;
  return modules.filter((item) => !['repairs', 'repairReceipts'].includes(item.id));
}

const RESOURCES = {
  products: {
    title: 'Inventory Management',
    store: 'products',
    search: ['product_name', 'category', 'brand', 'model', 'sku', 'imei', 'barcode', 'batch_number', 'status'],
    columns: ['product_name', 'category', 'brand', 'unit', 'barcode', 'batch_number', 'expiry_date', 'purchase_price', 'sale_price', 'quantity', 'status'],
    rowMap: inventoryRows,
    fields: [
      ['product_name', 'Product Name', 'text', true], ['category', 'Category', 'select', true, ['General', 'Grocery', 'Pharmacy', 'Electronics', 'Clothing', 'Hardware', 'Accessories', 'Spare Parts']], ['brand', 'Brand'], ['model', 'Model'],
      ['sku', 'SKU'], ['barcode', 'Barcode'], ['unit', 'Unit', 'select', true, ['pcs', 'kg', 'gram', 'liter', 'meter', 'box', 'pack']], ['batch_number', 'Batch Number'],
      ['expiry_date', 'Expiry Date', 'date'], ['imei', 'IMEI / Serial'], ['purchase_price', 'Purchase Price', 'number'], ['sale_price', 'Sale Price', 'number'],
      ['quantity', 'Quantity', 'number'], ['low_stock_threshold', 'Low Stock Warning', 'number'], ['manufacturer', 'Manufacturer'], ['warranty', 'Warranty'], ['supplier_name', 'Supplier'],
    ],
  },
  customers: {
    title: 'Customer Management',
    store: 'customers',
    search: ['name', 'phone', 'cnic', 'address'],
    columns: ['name', 'phone', 'cnic', 'address', 'balance', 'notes'],
    fields: [['name', 'Customer Name', 'text', true], ['phone', 'Phone'], ['cnic', 'CNIC'], ['address', 'Address'], ['notes', 'Notes'], ['balance', 'Opening Balance', 'number']],
  },
  suppliers: {
    title: 'Supplier Management',
    store: 'suppliers',
    search: ['supplier_name', 'phone', 'address'],
    columns: ['supplier_name', 'phone', 'address', 'balance'],
    fields: [['supplier_name', 'Supplier Name', 'text', true], ['phone', 'Phone'], ['address', 'Address'], ['notes', 'Notes'], ['balance', 'Opening Balance', 'number']],
  },
  expenses: {
    title: 'Expense Management',
    store: 'expenses',
    search: ['category', 'description'],
    columns: ['category', 'description', 'amount', 'spent_at'],
    fields: [['category', 'Category', 'select', true, ['Rent', 'Electricity', 'Salary', 'Internet', 'Fuel', 'Maintenance', 'Other']], ['description', 'Description'], ['amount', 'Amount', 'number', true], ['spent_at', 'Date', 'date']],
    customSave: addExpense,
  },
  repairs: {
    title: 'Repair Management',
    store: 'repairs',
    search: ['job_number', 'customer_name', 'device_name', 'imei', 'problem', 'technician', 'status'],
    columns: ['job_number', 'customer_name', 'device_name', 'imei', 'problem', 'technician', 'charges', 'status'],
    fields: [['job_number', 'Job Number'], ['customer_name', 'Customer'], ['device_name', 'Device Name'], ['imei', 'IMEI'], ['problem', 'Problem'], ['technician', 'Technician'], ['charges', 'Charges', 'number'], ['delivery_date', 'Delivery Date', 'date'], ['status', 'Status', 'select', true, ['Received', 'Diagnosed', 'In Progress', 'Waiting Parts', 'Completed', 'Delivered']]],
  },
  users: {
    title: 'User Management',
    store: 'users',
    search: ['name', 'email', 'role', 'status'],
    columns: ['name', 'email', 'role', 'status'],
    fields: [['name', 'Name', 'text', true], ['email', 'Email', 'email', true], ['role', 'Role', 'select', true, ['Super Admin', 'Admin', 'Manager', 'Cashier', 'Technician']], ['status', 'Status', 'select', true, ['Active', 'Disabled']], ['password', 'Password']],
    customSave: saveUserAccount,
  },
  settings: {
    title: 'Admin Panel Settings',
    store: 'settings',
    search: ['key', 'value'],
    columns: ['key', 'value'],
    fields: [['key', 'Setting Name', 'text', true], ['value', 'Value', 'text', true]],
  },
};

const ADMIN_USER = true;

const MODULE_LABELS = {
  'Customer Management': 'Customer',
  'Supplier Management': 'Supplier',
  'Expense Management': 'Expense',
  'Repair Management': 'Repair',
  'User Management': 'User',
  'Sales Record': 'Sale',
  'Manual Repair Receipt': 'Repair Receipt',
  'Admin Panel Settings': 'Admin Setting',
};

const DEFAULT_RECORDS = {
  'Expense Management': () => ({ spent_at: new Date().toISOString().slice(0, 10) }),
  'Repair Management': () => ({ status: 'Received' }),
  'User Management': () => ({ status: 'Active', role: 'Cashier' }),
};

const BUSINESS_SYNC_ENTITIES = new Set([
  'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
  'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
  'roles', 'permissions', 'settings', 'notifications', 'inventory_transactions',
  'manual_repair_receipts', 'licenses',
]);

const HEADER_LABELS = {
  product_name: 'Product Name',
  imei: 'IMEI / Serial',
  sku: 'SKU',
  unit: 'Unit',
  batch_number: 'Batch',
  expiry_date: 'Expiry',
  manufacturer: 'Manufacturer',
  purchase_price: 'Cost Price',
  sale_price: 'Sale Price',
  quantity: 'Stock',
  low_stock_threshold: 'Low Stock Limit',
  total_spent: 'Total Spent',
  customer_name: 'Customer',
  supplier_name: 'Supplier',
  invoice_number: 'Invoice No',
  receipt_number: 'Receipt No',
  job_number: 'Job No',
  device_name: 'Device',
  repair_charges: 'Repair Charges',
  advance_payment: 'Advance',
  remaining_amount: 'Remaining',
};

function App() {
  const [active, setActive] = useState('dashboard');
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('dsh_token') || '',
    user: localStorage.getItem('dsh_user_name') || '',
    role: localStorage.getItem('dsh_user_role') || '',
  }));
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState({});
  const [snapshot, setSnapshot] = useState(null);
  const [brand, setBrand] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState('');

  const authenticated = Boolean(auth.token);
  const role = auth.role || 'Cashier';
  const allowedModules = useMemo(() => modulesForBusiness(MODULES.filter((item) => (ROLE_MODULES[role] || ROLE_MODULES.Cashier).includes(item.id)), brand), [role, brand]);

  async function refresh() {
    await cleanupStartupData();
    const stores = ['products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'repairs', 'repair_updates', 'manual_repair_receipts', 'payments', 'cashbook', 'users', 'settings', 'notifications', 'licenses', 'audit_logs', 'inventory_transactions', 'customer_ledgers', 'supplier_ledgers', 'sync_queue'];
    const entries = await Promise.all(stores.map(async (store) => [store, await listRecords(store)]));
    setData(Object.fromEntries(entries));
    setSnapshot(await dashboardSnapshot());
    setBrand(await getBrandSettings());
    setRefreshKey((value) => value + 1);
  }

  useEffect(() => {
    navigator.serviceWorker?.register('/sw.js');
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (authenticated) refresh();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && allowedModules.length && !allowedModules.some((item) => item.id === active)) {
      setActive(allowedModules[0].id);
    }
  }, [authenticated, allowedModules, active]);

  useEffect(() => document.documentElement.classList.toggle('dark', dark), [dark]);

  useEffect(() => {
    const handler = (event) => {
      setToast(event.detail || 'Saved successfully');
      window.clearTimeout(window.__dshToastTimer);
      window.__dshToastTimer = window.setTimeout(() => setToast(''), 2400);
    };
    window.addEventListener('dsh:toast', handler);
    return () => window.removeEventListener('dsh:toast', handler);
  }, []);

  async function handleSync() {
    setSyncing(true);
    await syncNow();
    await refresh();
    setSyncing(false);
  }

  function handleLogin(session) {
    const roleName = userRole(session.user);
    localStorage.setItem('dsh_token', session.token);
    localStorage.setItem('dsh_user_name', session.user?.name || session.user?.email || 'User');
    localStorage.setItem('dsh_user_role', roleName);
    setAuth({ token: session.token, user: session.user?.name || session.user?.email || 'User', role: roleName });
  }

  function handleLogout() {
    localStorage.removeItem('dsh_token');
    localStorage.removeItem('dsh_user_name');
    localStorage.removeItem('dsh_user_role');
    setAuth({ token: '', user: '', role: '' });
    setData({});
    setSnapshot(null);
  }

  if (!authenticated) {
    return <LoginScreen brand={brand} onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-[#182322] dark:text-[#eef7f2]" style={{ '--accent': brand?.theme_color || '#14B8A6' }}>
      <aside className="sidebar">
        <div className="brand-block">{brand?.logo ? <img src={brand.logo} alt="" /> : <span>{initials(brand?.shop_name || brand?.company_name || 'MS')}</span>}<div><strong>{brand?.software_name || 'Market Sales'}</strong><small>{brand?.shop_name || brand?.company_name || 'Retail Admin Panel'}</small></div></div>
        <nav>{allowedModules.map((item) => <NavButton key={item.id} item={item} active={active === item.id} onClick={() => setActive(item.id)} />)}</nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div><h1>{allowedModules.find((item) => item.id === active)?.label}</h1><p>{brand?.shop_name || brand?.company_name || 'Retail Shop'} - {brand?.business_type || 'General Store'} - {auth.user} ({role})</p></div>
          <div className="top-actions">
            <StatusPill online={online} syncing={syncing} />
            <button className="icon-btn" onClick={handleSync} title="Sync now"><Cloud size={18} /></button>
            <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-btn" onClick={handleLogout} title={`Logout ${auth.user || ''}`}><LogOut size={18} /></button>
          </div>
        </header>
        <div className="content">
          {active === 'dashboard' && <Dashboard snapshot={snapshot} data={data} />}
          {active === 'pos' && <POS2 data={data} brand={brand} refresh={refresh} />}
          {active === 'sales' && <Sales rows={data.sales || []} brand={brand} refresh={refresh} />}
          {active === 'products' && <Inventory rows={data.products || []} refresh={refresh} />}
          {active === 'customers' && <CrudModule config={RESOURCES.customers} rows={data.customers || []} refresh={refresh} extraActions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.customer_ledgers || [])}><Printer size={15} /> Ledger</button>} />}
          {active === 'credit' && <Credit data={data} refresh={refresh} />}
          {active === 'repairs' && <Repairs rows={data.repairs || []} refresh={refresh} />}
          {active === 'repairReceipts' && <ManualRepairReceipts rows={data.manual_repair_receipts || []} brand={brand} refresh={refresh} />}
          {active === 'purchases' && <Purchases data={data} refresh={refresh} />}
          {active === 'suppliers' && <CrudModule config={RESOURCES.suppliers} rows={data.suppliers || []} refresh={refresh} extraActions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.supplier_ledgers || [], 'supplier_uuid')}><Printer size={15} /> Ledger</button>} />}
          {active === 'expenses' && <CrudModule config={RESOURCES.expenses} rows={data.expenses || []} refresh={refresh} />}
          {active === 'notifications' && <Notifications data={data} refresh={refresh} />}
          {active === 'accounting' && <Accounting data={data} />}
          {active === 'reports' && <Reports refreshKey={refreshKey} />}
          {active === 'users' && <CrudModule config={RESOURCES.users} rows={data.users || []} refresh={refresh} />}
          {active === 'licenses' && <LicenseManager rows={data.licenses || []} refresh={refresh} />}
          {active === 'settings' && <SettingsPanel brand={brand} rows={data.settings || []} refresh={refresh} />}
        </div>
        <footer className="app-footer">{brand?.footer_branding || 'Design & Developed By DSH Digital Solutions Hub - 2026'}</footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LoginScreen({ brand, onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: 'admin@dsh.local', password: '' });
  const [activation, setActivation] = useState({ license_key: '', activation_code: '', shop_name: '', name: '', email: '', password: '', device_id: ensureDeviceId() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Login failed. Check email and password.');
      onLogin(payload);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function activate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await activateLicenseAccount(activation);
      onLogin(payload);
    } catch (err) {
      setError(err.message || 'License activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-page"><section className="login-panel"><div className="login-brand"><span>{initials(brand?.shop_name || brand?.company_name || 'MS')}</span><div><strong>{brand?.software_name || 'Market Sales Management System'}</strong><small>{mode === 'login' ? 'Secure admin login' : 'Activate shop license'}</small></div></div><div className="login-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Login</button><button type="button" className={mode === 'activate' ? 'active' : ''} onClick={() => { setMode('activate'); setError(''); }}>Activate License</button></div>{mode === 'login' ? <form onSubmit={submit} className="login-form"><label>Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="login-error">{error}</p>}<button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button></form> : <form onSubmit={activate} className="login-form"><label>License Key<input required value={activation.license_key} onChange={(event) => setActivation({ ...activation, license_key: event.target.value })} /></label><label>Activation Code<input required value={activation.activation_code} onChange={(event) => setActivation({ ...activation, activation_code: event.target.value })} /></label><label>Shop Name<input required value={activation.shop_name} onChange={(event) => setActivation({ ...activation, shop_name: event.target.value })} /></label><label>Admin Name<input required value={activation.name} onChange={(event) => setActivation({ ...activation, name: event.target.value })} /></label><label>Admin Email<input type="email" required value={activation.email} onChange={(event) => setActivation({ ...activation, email: event.target.value })} /></label><label>Password<input type="password" required minLength={6} value={activation.password} onChange={(event) => setActivation({ ...activation, password: event.target.value })} /></label><label>Device Binding<input value={activation.device_id} onChange={(event) => setActivation({ ...activation, device_id: event.target.value })} /></label>{error && <p className="login-error">{error}</p>}<button className="primary-btn" disabled={loading}>{loading ? 'Activating...' : 'Activate & Login'}</button></form>}</section></main>;
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return <button className={`nav-btn ${active ? 'nav-btn-active' : ''}`} onClick={onClick}><Icon size={18} /><span>{item.label}</span></button>;
}

function StatusPill({ online, syncing }) {
  const label = syncing ? 'Syncing' : online ? 'Online' : 'Offline';
  return <span className={`status-pill ${online ? 'ok' : 'bad'}`}>{online ? <Cloud size={15} /> : <CloudOff size={15} />} {label}</span>;
}

function inventoryRows(rows) {
  return rows.map((row) => {
    const qty = Number(row.quantity || 0);
    const threshold = Number(row.low_stock_threshold || 3);
    return {
      ...row,
      imei: row.imei || row.barcode || row.serial || '',
      status: qty <= 0 ? 'Out of Stock' : qty <= threshold ? 'Low Stock' : 'In Stock',
    };
  });
}

function Dashboard({ snapshot, data }) {
  const cards = [
    ['Today Orders', snapshot?.todayOrders, false], ['Today Repairs', snapshot?.todayRepairs, false], ['Monthly Profit', snapshot?.monthlyProfit],
    ['Best Selling Product', snapshot?.bestSellingProduct, 'text'], ['Repair Revenue', snapshot?.repairRevenue], ['Pending Repairs', snapshot?.pendingRepairs, false],
    ['Today Sales', snapshot?.todaySales], ['Credit Receivable', snapshot?.creditReceivable], ['Supplier Payables', snapshot?.supplierPayables],
    ['Cash In Hand', snapshot?.cashInHand], ['Inventory Value', snapshot?.inventoryValue], ['Inventory Qty', snapshot?.inventoryQuantity, false],
  ];
  const sales = data.sales || [];
  const customers = data.customers || [];
  const products = data.products || [];
  const pendingRepairs = [...(data.repairs || []), ...(data.manual_repair_receipts || [])].filter((row) => !['Delivered', 'Completed'].includes(row.status));
  const max = Math.max(...sales.slice(0, 8).map((sale) => Number(sale.total)), 1);
  return <div className="stack"><div className="metric-grid">{cards.map(([label, value, moneyValue = true]) => <div className="metric animated" key={label}><span>{label}</span><strong>{moneyValue === 'text' ? (value || 'No Data Available') : moneyValue ? money(value || 0) : Number(value || 0)}</strong></div>)}</div><section className="panel"><h2>Sales Chart</h2>{sales.length ? <div className="chart">{sales.slice(0, 8).map((sale) => <div key={sale.uuid} style={{ height: `${Math.max(8, (Number(sale.total) / max) * 100)}%` }} title={`${sale.invoice_number} - ${money(sale.total)}`} />)}</div> : <DashboardEmpty icon={BarChart3} title="No Sales Data Available" description="Start creating sales to see analytics." />}</section><section className="split"><DashboardTable title="Top Customers" rows={snapshot?.topCustomers || []} cols={['name', 'phone', 'total_spent', 'balance']} emptyIcon={Users} emptyTitle={customers.length ? 'No Spending History Available' : 'No Customer Data Available'} emptyDescription={customers.length ? 'Customer spend totals will appear after sales are recorded.' : 'Create customers or complete sales to build this leaderboard.'} /><DashboardTable title="Low Stock Alerts" rows={snapshot?.lowStock || []} cols={['product_name', 'quantity', 'low_stock_threshold']} emptyIcon={Boxes} emptyTitle={products.length ? 'All Stock Levels Healthy' : 'No Inventory Data Available'} emptyDescription={products.length ? 'Products below their low stock threshold will appear here.' : 'Add inventory or receive stock from Purchases to enable alerts.'} /></section><section className="split"><DashboardTable title="Recent Sales" rows={snapshot?.recentSales || []} cols={['invoice_number', 'customer_name', 'total', 'paid', 'balance']} emptyIcon={ReceiptText} emptyTitle="No Recent Sales Available" emptyDescription="Completed invoices will appear here automatically." /><DashboardTable title="Pending Repairs" rows={pendingRepairs} cols={['job_number', 'receipt_number', 'customer_name', 'device_name', 'status']} emptyIcon={Wrench} emptyTitle="No Pending Repairs" emptyDescription="Open repair jobs and manual repair receipts will appear here." /></section></div>;
}

function DashboardTable({ title, rows, cols, emptyIcon, emptyTitle, emptyDescription }) {
  return <section className="panel"><h2>{title}</h2>{rows.length ? <DataTable rows={rows} columns={cols} /> : <DashboardEmpty icon={emptyIcon} title={emptyTitle} description={emptyDescription} />}</section>;
}

function DashboardEmpty({ icon: Icon, title, description }) {
  return <div className="dashboard-empty"><Icon size={30} /><strong>{title}</strong><p>{description}</p></div>;
}

function CrudModule({ config, rows, refresh, extraActions }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const importRef = useRef(null);
  const blankRecord = () => DEFAULT_RECORDS[config.title]?.() || {};
  const displayRows = useMemo(() => config.rowMap ? config.rowMap(rows) : rows, [rows, config]);
  const filtered = useMemo(() => filterRows(displayRows, query, config.search), [displayRows, query, config.search]);
  async function submit(record) {
    if (config.customSave) await config.customSave(record);
    else await saveRecord(config.store, record);
    setEditing(null);
    await refresh();
    notify('Record saved successfully');
  }
  async function remove(row, mode) {
    await deleteRecord(config.store, row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Record deleted successfully');
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importCsvRecords(config.store, file);
    event.target.value = '';
    await refresh();
    notify('Import completed successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title={config.title} query={query} setQuery={setQuery} onAdd={() => setEditing(blankRecord())} onImport={() => importRef.current?.click()} onExport={() => exportCsv(`${config.store}.csv`, filtered)} onPrint={() => printTable(config.title, filtered, config.columns)} /><input ref={importRef} className="hidden-input" type="file" accept=".csv" onChange={importFile} /><DataTable rows={filtered} columns={config.columns} onAdd={() => setEditing(blankRecord())} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button>{extraActions?.(row)}</>} /></section>{viewing && <DetailModal title={`${config.title} Detail`} row={viewing} columns={config.columns} onClose={() => setViewing(null)} />}{editing && <RecordModal title={config.title} fields={config.fields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store={config.store} onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Inventory({ rows, refresh }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const importRef = useRef(null);
  const columns = RESOURCES.products.columns;
  const filtered = useMemo(() => filterRows(inventoryRows(rows), query, RESOURCES.products.search), [rows, query]);
  const blank = { category: 'General', unit: 'pcs', quantity: 0, low_stock_threshold: 3, purchase_price: 0, sale_price: 0 };

  async function submit(event) {
    event.preventDefault();
    await saveRecord('products', editing);
    setEditing(null);
    await refresh();
    notify('Product saved successfully');
  }

  async function remove(row, mode) {
    await deleteRecord('products', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Product deleted successfully');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importCsvRecords('products', file);
    event.target.value = '';
    await refresh();
    notify('Inventory import completed successfully');
  }

  function change(key, value) {
    setEditing((current) => ({ ...current, [key]: value }));
  }

  return <div className="stack"><section className="panel"><ModuleHeader title="Inventory Management" query={query} setQuery={setQuery} onAdd={() => setEditing(blank)} onImport={() => importRef.current?.click()} onExport={() => exportCsv('products.csv', filtered)} onPrint={() => printTable('Inventory Management', filtered, columns)} /><input ref={importRef} className="hidden-input" type="file" accept=".csv" onChange={importFile} /><DataTable rows={filtered} columns={columns} onAdd={() => setEditing(blank)} actions={(row) => <><button className="ghost-btn" onClick={() => printTable('Product Detail', [row], columns)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printBarcode(row)}><Printer size={15} /> Barcode</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{editing && <ModalShell onClose={() => setEditing(null)}><form onSubmit={submit}><div className="modal-header"><h2>{editing.uuid ? 'Edit Product' : 'Add Product'}</h2><button type="button" className="icon-btn" onClick={() => setEditing(null)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Product Name<input required value={editing.product_name || ''} onChange={(event) => change('product_name', event.target.value)} /></label><label>Category<select value={editing.category || 'General'} onChange={(event) => change('category', event.target.value)}>{['General', 'Grocery', 'Pharmacy', 'Electronics', 'Clothing', 'Hardware', 'Accessories', 'Spare Parts'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Brand<input value={editing.brand || ''} onChange={(event) => change('brand', event.target.value)} /></label><label>SKU<input value={editing.sku || ''} onChange={(event) => change('sku', event.target.value)} /></label><label>Barcode<input value={editing.barcode || ''} onChange={(event) => change('barcode', event.target.value)} /></label><label>Unit<select value={editing.unit || 'pcs'} onChange={(event) => change('unit', event.target.value)}>{['pcs', 'kg', 'gram', 'liter', 'meter', 'box', 'pack'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Batch Number<input value={editing.batch_number || ''} onChange={(event) => change('batch_number', event.target.value)} /></label><label>Expiry Date<input type="date" value={editing.expiry_date || ''} onChange={(event) => change('expiry_date', event.target.value)} /></label><label>IMEI / Serial<input value={editing.imei || ''} onChange={(event) => change('imei', event.target.value)} /></label><label>Manufacturer<input value={editing.manufacturer || ''} onChange={(event) => change('manufacturer', event.target.value)} /></label><label>Cost Price<input type="number" value={editing.purchase_price || 0} onChange={(event) => change('purchase_price', event.target.value)} /></label><label>Sale Price<input type="number" value={editing.sale_price || 0} onChange={(event) => change('sale_price', event.target.value)} /></label><label>Stock<input type="number" value={editing.quantity || 0} onChange={(event) => change('quantity', event.target.value)} /></label><label>Low Stock Warning<input type="number" value={editing.low_stock_threshold || 3} onChange={(event) => change('low_stock_threshold', event.target.value)} /></label><label>Warranty<input value={editing.warranty || ''} onChange={(event) => change('warranty', event.target.value)} /></label><label>Supplier<input value={editing.supplier_name || ''} onChange={(event) => change('supplier_name', event.target.value)} /></label></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setEditing(null)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}{deleting && <DeleteDialog row={deleting} store="products" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function DeleteDialog({ row, store, onClose, onDelete }) {
  const label = row.product_name || row.name || row.invoice_number || row.job_number || row.receipt_number || row.supplier_name || row.email || row.uuid;
  return <ModalShell onClose={onClose} size="small"><div className="modal-header"><h2>Delete {store.replaceAll('_', ' ')}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><p className="muted">Choose how to delete <strong>{label}</strong>. Soft delete hides it and keeps audit history. Permanent delete is admin-only and removes the local record.</p></div><div className="modal-footer"><button className="ghost-btn" onClick={onClose}>Cancel</button><div className="button-row"><button className="danger-btn" onClick={() => onDelete('soft')}><Trash2 size={16} /> Soft Delete</button>{ADMIN_USER && <button className="danger-btn solid" onClick={() => onDelete('permanent')}><Trash2 size={16} /> Permanent Delete</button>}</div></div></ModalShell>;
}

function ModalShell({ children, onClose, size = '' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className={`modal ${size}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>;
}

function notify(message) {
  window.dispatchEvent(new CustomEvent('dsh:toast', { detail: message }));
}

function POS2({ data, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState({ customer_uuid: '', payment_type: 'cash', discount: 0, tax: brand?.tax || 0, paid: 0, due_date: '' });
  const [quick, setQuick] = useState({ name: '', phone: '', address: '', cnic: '', notes: '' });
  const products = filterRows(data.products || [], query, ['product_name', 'barcode', 'sku', 'imei', 'brand', 'model', 'batch_number']);
  const customer = (data.customers || []).find((item) => item.uuid === payment.customer_uuid);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
  const total = subtotal - Number(payment.discount || 0) + Number(payment.tax || 0);
  const paid = payment.payment_type === 'credit' ? 0 : Number(payment.paid || total);
  const draftInvoice = { invoice_number: 'DRAFT', customer_name: customer?.name || quick.name || 'Walk-in Customer', subtotal, discount: payment.discount, tax: payment.tax, total, paid, balance: Math.max(0, total - paid), sold_at: new Date().toISOString() };

  function addToCart(product) {
    setCart((items) => items.some((item) => item.product_uuid === product.uuid)
      ? items.map((item) => item.product_uuid === product.uuid ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { product_uuid: product.uuid, product_name: product.product_name, imei: product.imei, quantity: 1, price: Number(product.sale_price || 0) }]);
  }

  async function completeSale() {
    const sale = await createSale({ ...payment, paid, cart });
    setCart([]);
    setPayment({ customer_uuid: '', payment_type: 'cash', discount: 0, tax: brand?.tax || 0, paid: 0, due_date: '' });
    await refresh();
    printInvoice(sale, cart, brand);
  }

  async function createWalkIn() {
    const customerRecord = await quickCustomer(quick);
    setPayment({ ...payment, customer_uuid: customerRecord.uuid });
    setQuick({ name: '', phone: '', address: '', cnic: '', notes: '' });
    await refresh();
  }

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'F1') { event.preventDefault(); setCart([]); }
      if (event.key === 'F2') { event.preventDefault(); document.querySelector('[data-customer-select]')?.focus(); }
      if (event.key === 'F3') { event.preventDefault(); document.querySelector('[data-product-search]')?.focus(); }
      if (event.key === 'F4') { event.preventDefault(); document.querySelector('[data-paid-input]')?.focus(); }
      if (event.key === 'F5') { event.preventDefault(); if (cart.length) printInvoice(draftInvoice, cart, brand); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, payment, quick, brand]);

  return <div className="pos-grid"><section className="panel"><div className="module-head"><h2>Modern POS</h2><span className="shortcut-pill"><Keyboard size={15} /> F1 New - F2 Customer - F3 Product - F4 Checkout - F5 Print</span></div><SearchBox value={query} onChange={setQuery} placeholder="Product search, barcode, SKU or serial" inputProps={{ 'data-product-search': true }} /><div className="product-picker">{products.length ? products.map((product) => <button key={product.uuid} onClick={() => addToCart(product)}><div className="product-thumb">{product.image ? <img src={product.image} alt="" /> : <Smartphone size={22} />}</div><strong>{product.product_name}</strong><span>{product.barcode || product.sku || product.imei}</span><b>{money(product.sale_price)}</b><small>{product.quantity} in stock</small></button>) : <EmptyRows />}</div></section><section className="panel cart-panel"><h2>Quick Cart & Fast Checkout</h2><DataTable rows={cart} columns={['product_name', 'imei', 'quantity', 'price']} actions={(row) => <button className="danger-btn" onClick={() => setCart(cart.filter((item) => item.product_uuid !== row.product_uuid))}><Trash2 size={15} /></button>} editable={(row, key, value) => setCart(cart.map((item) => item.product_uuid === row.product_uuid ? { ...item, [key]: Number(value) } : item))} /><div className="quick-customer"><strong>Quick Customer Entry</strong><div className="inline-form quick"><input placeholder="Name" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /><input placeholder="Phone" value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} /><input placeholder="Address" value={quick.address} onChange={(e) => setQuick({ ...quick, address: e.target.value })} /><input placeholder="CNIC" value={quick.cnic} onChange={(e) => setQuick({ ...quick, cnic: e.target.value })} /><input placeholder="Notes" value={quick.notes} onChange={(e) => setQuick({ ...quick, notes: e.target.value })} /><button className="ghost-btn" type="button" onClick={createWalkIn} disabled={!quick.name && !quick.phone}><Plus size={15} /> Create Customer</button></div></div><div className="form-grid"><label>Customer<select data-customer-select value={payment.customer_uuid} onChange={(e) => setPayment({ ...payment, customer_uuid: e.target.value })}><option value="">Walk-in Customer</option>{(data.customers || []).map((item) => <option key={item.uuid} value={item.uuid}>{item.name} {item.phone ? `- ${item.phone}` : ''}</option>)}</select></label><label>Payment<select value={payment.payment_type} onChange={(e) => setPayment({ ...payment, payment_type: e.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option><option value="partial">Partial</option></select></label><label>Discount<input type="number" value={payment.discount} onChange={(e) => setPayment({ ...payment, discount: e.target.value })} /></label><label>Tax<input type="number" value={payment.tax} onChange={(e) => setPayment({ ...payment, tax: e.target.value })} /></label><label>Paid<input data-paid-input type="number" value={payment.payment_type === 'credit' ? 0 : payment.paid || total} onChange={(e) => setPayment({ ...payment, paid: e.target.value })} /></label><label>Due Date<input type="date" value={payment.due_date} onChange={(e) => setPayment({ ...payment, due_date: e.target.value })} /></label></div><div className="totals"><span>Subtotal {money(subtotal)}</span><strong>Total {money(total)}</strong></div><div className="button-row"><button className="primary-btn" disabled={!cart.length} onClick={completeSale}><ReceiptText size={18} /> Save Sale</button><button className="ghost-btn" disabled={!cart.length} onClick={() => printInvoice(draftInvoice, cart, brand)}><Printer size={16} /> Print</button><button className="ghost-btn" disabled={!cart.length} onClick={() => downloadPdf('invoice.pdf', 'Sales Invoice', invoicePdfLines(draftInvoice, cart, brand))}><FileDown size={16} /> PDF</button><button className="ghost-btn" disabled={!cart.length} onClick={() => whatsAppShare(quick.phone || customer?.phone, invoiceMessage(draftInvoice, brand))}><MessageCircle size={16} /> WhatsApp</button></div></section></div>;
}

function Credit({ data, refresh }) {
  const [payment, setPayment] = useState({ customer_uuid: '', amount: '', method: 'Cash', notes: '' });
  const [deleting, setDeleting] = useState(null);
  const [receiving, setReceiving] = useState(false);
  const due = (data.customers || []).filter((customer) => Number(customer.balance || 0) > 0);
  async function submit(e) {
    e.preventDefault();
    await receiveCustomerPayment(payment);
    setPayment({ customer_uuid: '', amount: '', method: 'Cash', notes: '' });
    setReceiving(false);
    await refresh();
    notify('Payment received successfully');
  }
  async function removeLedger(row, mode) {
    await deleteRecord('customer_ledgers', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Credit record deleted successfully');
  }
  return <div className="stack"><section className="panel"><div className="module-head"><h2>Outstanding Balance</h2><button className="primary-btn" onClick={() => setReceiving(true)}><Plus size={16} /> Receive Payment</button></div><DataTable rows={due} columns={['name', 'phone', 'balance']} actions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.customer_ledgers || [])}><Printer size={15} /> Statement</button>} /><h2 className="section-title">Credit Records</h2><DataTable rows={data.customer_ledgers || []} columns={['type', 'amount', 'reference', 'due_date', 'entry_at']} actions={(row) => <button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button>} />{deleting && <DeleteDialog row={deleting} store="customer_ledgers" onClose={() => setDeleting(null)} onDelete={(mode) => removeLedger(deleting, mode)} />}</section>{receiving && <ModalShell onClose={() => setReceiving(false)}><form onSubmit={submit}><div className="modal-header"><h2>Receive Payment</h2><button type="button" className="icon-btn" onClick={() => setReceiving(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Customer<select required value={payment.customer_uuid} onChange={(e) => setPayment({ ...payment, customer_uuid: e.target.value })}><option value="">Select customer</option>{due.map((customer) => <option key={customer.uuid} value={customer.uuid}>{customer.name} - {money(customer.balance)}</option>)}</select></label><label>Amount<input required type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label><label>Method<input value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} /></label><label>Notes<input value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setReceiving(false)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}</div>;
}

function Sales({ rows, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const filtered = useMemo(() => filterRows(rows, query, ['invoice_number', 'customer_name', 'payment_type', 'status']), [rows, query]);
  const fields = [['invoice_number', 'Invoice Number'], ['customer_name', 'Customer Name'], ['payment_type', 'Payment Type', 'select', true, ['cash', 'credit', 'partial']], ['subtotal', 'Subtotal', 'number'], ['discount', 'Discount', 'number'], ['tax', 'Tax', 'number'], ['total', 'Total', 'number', true], ['paid', 'Paid', 'number'], ['balance', 'Balance', 'number'], ['status', 'Status', 'select', true, ['Paid', 'Credit Due']]];
  async function submit(record) {
    await saveRecord('sales', { ...record, sold_at: record.sold_at || new Date().toISOString() });
    setEditing(null);
    await refresh();
    notify('Sale saved successfully');
  }
  async function remove(row, mode) {
    await deleteRecord('sales', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Sale deleted successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Sales Records" query={query} setQuery={setQuery} onAdd={() => setEditing({ invoice_number: `MANUAL-${Date.now()}`, payment_type: 'cash', status: 'Paid' })} onExport={() => exportCsv('sales.csv', filtered)} onPrint={() => printTable('Sales Records', filtered, ['invoice_number', 'customer_name', 'total', 'paid', 'balance', 'status'])} /><DataTable rows={filtered} columns={['invoice_number', 'customer_name', 'payment_type', 'total', 'paid', 'balance', 'status', 'sold_at']} onAdd={() => setEditing({ invoice_number: `MANUAL-${Date.now()}`, payment_type: 'cash', status: 'Paid' })} actions={(row) => <><button className="ghost-btn" onClick={() => printTable('Sale Detail', [row], ['invoice_number', 'customer_name', 'payment_type', 'total', 'paid', 'balance', 'status', 'sold_at'])}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printInvoice(row, [], brand)}><Printer size={15} /> Invoice</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{editing && <RecordModal title="Sales Record" fields={fields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="sales" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Repairs({ rows, refresh }) {
  return <CrudModule config={RESOURCES.repairs} rows={rows} refresh={refresh} extraActions={(row) => <><button className="ghost-btn" onClick={() => printJobCard(row)}><Printer size={15} /> Job Card</button><select className="mini-select" value={row.status || 'Received'} onChange={async (e) => { await updateRepairStatus(row, e.target.value, 'Status updated'); await refresh(); }}>{['Received', 'Diagnosed', 'In Progress', 'Waiting Parts', 'Completed', 'Delivered'].map((status) => <option key={status}>{status}</option>)}</select></>} />;
}

function ManualRepairReceipts({ rows, brand, refresh }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const fields = [
    ['receipt_number', 'Receipt Number'], ['date', 'Date', 'date'], ['customer_name', 'Customer Name', 'text', true], ['phone', 'Phone Number'],
    ['device_name', 'Device Name', 'text', true], ['imei', 'IMEI Number'], ['problem', 'Problem Description'], ['repair_charges', 'Repair Charges', 'number', true],
    ['advance_payment', 'Advance Payment', 'number'], ['technician', 'Technician Name'], ['delivery_date', 'Delivery Date', 'date'], ['template', 'Template', 'select', true, ['Thermal Receipt', 'A4 Receipt']],
    ['status', 'Status', 'select', true, ['Received', 'In Progress', 'Completed', 'Delivered']], ['notes', 'Notes'],
  ];
  const filtered = useMemo(() => filterRows(rows, query, ['receipt_number', 'customer_name', 'phone', 'device_name', 'imei', 'problem', 'technician']), [rows, query]);
  async function submit(record) {
    const saved = await createManualRepairReceipt(record);
    setEditing(null);
    await refresh();
    printRepairReceipt(saved, brand);
    notify('Repair receipt saved successfully');
  }
  async function remove(row, mode) {
    await deleteRecord('manual_repair_receipts', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Repair receipt deleted successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Manual Repair Receipt System" query={query} setQuery={setQuery} onAdd={() => setEditing({ date: new Date().toISOString().slice(0, 10), template: 'Thermal Receipt', status: 'Received' })} onExport={() => exportCsv('manual_repair_receipts.csv', filtered)} onPrint={() => printTable('Repair Receipts', filtered, ['receipt_number', 'customer_name', 'phone', 'device_name', 'repair_charges', 'advance_payment', 'remaining_amount'])} /><DataTable rows={filtered} columns={['receipt_number', 'date', 'customer_name', 'phone', 'device_name', 'imei', 'repair_charges', 'advance_payment', 'remaining_amount', 'technician', 'delivery_date', 'status']} onAdd={() => setEditing({ date: new Date().toISOString().slice(0, 10), template: 'Thermal Receipt', status: 'Received' })} actions={(row) => <><button className="ghost-btn" onClick={() => printTable('Repair Receipt Detail', [row], ['receipt_number', 'date', 'customer_name', 'phone', 'device_name', 'imei', 'repair_charges', 'advance_payment', 'remaining_amount', 'technician', 'delivery_date', 'status'])}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printRepairReceipt(row, brand)}><Printer size={15} /> Print</button><button className="ghost-btn" onClick={() => downloadPdf(`${row.receipt_number}.pdf`, `Repair Receipt ${row.receipt_number}`, repairReceiptPdfLines(row, brand))}><FileDown size={15} /> PDF</button><button className="ghost-btn" onClick={() => whatsAppShare(row.phone, repairReceiptMessage(row, brand))}><MessageCircle size={15} /> WhatsApp</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{editing && <RecordModal title="Manual Repair Receipt" fields={fields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="manual_repair_receipts" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Purchases({ data, refresh }) {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ supplier_uuid: '', invoice_number: '', paid: 0 });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const total = cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost_price || 0), 0);
  const filtered = useMemo(() => filterRows(data.purchases || [], query, ['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status']), [data.purchases, query]);
  async function submit(e) {
    e.preventDefault();
    await createPurchase({ ...form, cart });
    setCart([]);
    setForm({ supplier_uuid: '', invoice_number: '', paid: 0 });
    setCreating(false);
    await refresh();
    notify('Purchase saved successfully');
  }
  async function remove(row, mode) {
    await deleteRecord('purchases', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('Purchase deleted successfully');
  }
  function closeCreate() {
    setCreating(false);
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Purchase Management" query={query} setQuery={setQuery} onAdd={() => setCreating(true)} onExport={() => exportCsv('purchases.csv', filtered)} onPrint={() => printTable('Purchases', filtered, ['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status'])} /><DataTable rows={filtered} columns={['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status']} onAdd={() => setCreating(true)} actions={(row) => <><button className="ghost-btn" onClick={() => printTable('Purchase Detail', [row], ['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status'])}>View</button><button className="ghost-btn" onClick={() => printPurchaseReceipt(row)}><Printer size={15} /> Receipt</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{creating && <ModalShell onClose={closeCreate}><form onSubmit={submit}><div className="modal-header"><h2>Add Purchase</h2><button type="button" className="icon-btn" onClick={closeCreate} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Supplier<select value={form.supplier_uuid} onChange={(e) => setForm({ ...form, supplier_uuid: e.target.value })}><option value="">Select supplier</option>{(data.suppliers || []).map((supplier) => <option key={supplier.uuid} value={supplier.uuid}>{supplier.supplier_name}</option>)}</select></label><label>Invoice Number<input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></label><label>Paid<input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} /></label></div><ProductLine products={data.products || []} onAdd={(item) => setCart([...cart, item])} /><DataTable rows={cart} columns={['product_name', 'quantity', 'cost_price']} actions={(row) => <button type="button" className="danger-btn" onClick={() => setCart(cart.filter((item) => item !== row))}><Trash2 size={15} /></button>} /><div className="totals"><strong>Total {money(total)}</strong></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={closeCreate}>Cancel</button><button className="primary-btn" disabled={!cart.length}>Save</button></div></form></ModalShell>}{deleting && <DeleteDialog row={deleting} store="purchases" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function ProductLine({ products, onAdd }) {
  const [line, setLine] = useState({ product_uuid: '', quantity: 1, cost_price: 0 });
  const product = products.find((item) => item.uuid === line.product_uuid);
  return <div className="inline-form"><select value={line.product_uuid} onChange={(e) => setLine({ ...line, product_uuid: e.target.value })}><option value="">Product</option>{products.map((item) => <option key={item.uuid} value={item.uuid}>{item.product_name}</option>)}</select><input type="number" value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} /><input type="number" value={line.cost_price} onChange={(e) => setLine({ ...line, cost_price: e.target.value })} /><button className="ghost-btn" onClick={() => product && onAdd({ ...line, product_name: product.product_name })}><Plus size={15} /> Add</button></div>;
}

function Notifications({ data, refresh }) {
  const [items, setItems] = useState([]);
  useEffect(() => { notificationCenter().then(setItems); }, [data]);
  async function dismiss(item) {
    if (!String(item.uuid).includes('-')) await deleteRecord('notifications', item.uuid, 'soft');
    await saveRecord('notifications', { uuid: crypto.randomUUID(), title: item.title, body: item.body, type: item.type, dismissed_source: item.uuid, deleted_at: new Date().toISOString() });
    await refresh?.();
    setItems((current) => current.filter((row) => row.uuid !== item.uuid));
  }
  return <section className="panel"><div className="module-head"><h2>Notification Center</h2><span className="status-pill ok"><Bell size={15} /> {items.length} active</span></div>{items.length ? <div className="notification-grid">{items.map((item) => <article key={item.uuid} className={`notification-card ${item.priority || ''}`}><strong>{item.type}</strong><h3>{item.title}</h3><p>{item.body}</p><button className="danger-btn" onClick={() => dismiss(item)}><Trash2 size={15} /> Delete</button></article>)}</div> : <EmptyRows />}</section>;
}

function SettingsPanel({ brand, rows, refresh }) {
  const [form, setForm] = useState(brand || {});
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (brand) setForm(brand); }, [brand]);
  async function submit(e) {
    e.preventDefault();
    await saveBrandSettings(form);
    setEditing(false);
    await refresh();
    notify('Admin settings saved successfully');
  }
  const fields = [
    ['software_name', 'Software Name'], ['business_type', 'Business Type', 'select', SHOP_TYPES], ['shop_name', 'Shop Name'], ['company_name', 'Company Name'], ['owner_name', 'Owner Name'],
    ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['contact_number', 'Contact Number'], ['address', 'Address'],
    ['invoice_header', 'Invoice Header'], ['footer', 'Footer'], ['currency', 'Currency'], ['tax', 'Tax', 'number'],
    ['theme_color', 'Theme Color', 'color'], ['receipt_format', 'Receipt Format'], ['invoice_format', 'Invoice Format'],
    ['logo', 'Logo URL'], ['favicon', 'Favicon URL'], ['login_screen', 'Login Screen Image URL'], ['footer_branding', 'Footer Branding'],
  ];
  return <div className="stack"><section className="panel"><div className="module-head"><h2>White Label Settings</h2><div className="module-actions"><span className="shortcut-pill"><Palette size={15} /> Rebrand without code changes</span><button className="primary-btn" onClick={() => setEditing(true)}><Settings size={16} /> Edit Settings</button></div></div><DataTable rows={rows} columns={['key', 'value']} /></section>{editing && <ModalShell onClose={() => setEditing(false)}><form onSubmit={submit}><div className="modal-header"><h2>Edit Admin Settings</h2><button type="button" className="icon-btn" onClick={() => setEditing(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid">{fields.map(([key, label, type = 'text', options]) => <label key={key}>{label}{type === 'select' ? <select value={form[key] || options[0]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{options.map((item) => <option key={item}>{item}</option>)}</select> : <input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>)}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}</div>;
}

function LicenseManager({ rows, refresh }) {
  const newLicenseForm = () => ({ owner_name: '', device_id: ensureDeviceId(), type: '1 Month', status: 'Active' });
  const [form, setForm] = useState(newLicenseForm);
  const [status, setStatus] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [query, setQuery] = useState('');
  useEffect(() => { activeLicenseStatus().then(setStatus); }, [rows]);
  const filtered = useMemo(() => filterRows(rows, query, ['license_key', 'activation_code', 'owner_name', 'device_id', 'type', 'status', 'expiry_date']), [rows, query]);
  async function submit(e) {
    e.preventDefault();
    try {
      if (form.uuid) {
        await saveRecord('licenses', form);
        await saveRemoteRecord('licenses', form);
      } else {
        const license = await generateLicense(form);
        await saveRemoteRecord('licenses', license, { forceCreate: true });
      }
      setForm(newLicenseForm());
      setCreating(false);
      await refresh();
      notify('License saved successfully');
    } catch (error) {
      notify(error.message || 'License save failed');
    }
  }
  async function remove(row, mode) {
    await deleteRecord('licenses', row.uuid, mode);
    setDeleting(null);
    await refresh();
    notify('License deleted successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="License Management" query={query} setQuery={setQuery} onAdd={() => { setForm(newLicenseForm()); setCreating(true); }} onExport={() => exportCsv('licenses.csv', filtered)} onPrint={() => printTable('Licenses', filtered, ['license_key', 'activation_code', 'owner_name', 'device_id', 'type', 'status', 'expiry_date'])} /><div className="module-actions report-actions"><span className={`status-pill ${status?.valid ? 'ok' : 'bad'}`}><KeyRound size={15} /> {status?.message || 'Checking license'}</span></div><DataTable rows={filtered} columns={['license_key', 'activation_code', 'owner_name', 'device_id', 'type', 'status', 'expiry_date']} onAdd={() => { setForm(newLicenseForm()); setCreating(true); }} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => { setForm({ ...row, device_id: row.device_id || ensureDeviceId() }); setCreating(true); }}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => downloadPdf(`${row.license_key}.pdf`, 'License Certificate', [`License: ${row.license_key}`, `Activation: ${row.activation_code}`, `Owner: ${row.owner_name}`, `Device: ${row.device_id}`, `Type: ${row.type}`, `Expiry: ${row.expiry_date}`])}><FileDown size={15} /> PDF</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="License Detail" row={viewing} columns={['license_key', 'activation_code', 'owner_name', 'device_id', 'type', 'status', 'expiry_date']} onClose={() => setViewing(null)} />}{creating && <ModalShell onClose={() => setCreating(false)}><form onSubmit={submit}><div className="modal-header"><h2>{form.uuid ? 'Edit License' : 'Add License'}</h2><button type="button" className="icon-btn" onClick={() => setCreating(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Shop Owner<input required value={form.owner_name || ''} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></label><label>Device Binding<input value={form.device_id || ensureDeviceId()} onChange={(e) => setForm({ ...form, device_id: e.target.value })} /></label><label>License Type<select value={form.type || '1 Month'} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['1 Month', '6 Months', '1 Year', 'Lifetime'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Status<select value={form.status || 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Disabled</option></select></label></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setCreating(false)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}{deleting && <DeleteDialog row={deleting} store="licenses" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Accounting({ data }) {
  const debit = (data.cashbook || []).reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const credit = (data.cashbook || []).reduce((sum, row) => sum + Number(row.credit || 0), 0);
  return <div className="stack"><div className="metric-grid"><div className="metric"><span>Debit Entries</span><strong>{money(debit)}</strong></div><div className="metric"><span>Credit Entries</span><strong>{money(credit)}</strong></div><div className="metric"><span>Daily Closing</span><strong>{money(debit - credit)}</strong></div><div className="metric"><span>Profit & Loss</span><strong>{money((data.sales || []).reduce((sum, row) => sum + Number(row.profit || 0), 0) - (data.expenses || []).reduce((sum, row) => sum + Number(row.amount || 0), 0))}</strong></div></div><List title="Cash Book" rows={data.cashbook || []} cols={['type', 'description', 'debit', 'credit', 'entry_at']} /></div>;
}

function Reports({ refreshKey }) {
  const [type, setType] = useState('daily_sales');
  const [rows, setRows] = useState([]);
  async function generate(nextType = type) {
    setType(nextType);
    setRows(await reportData(nextType));
  }
  useEffect(() => { generate(type); }, [refreshKey]);
  return <section className="panel"><ModuleHeader title="Reports" query="" setQuery={() => {}} onAdd={null} onExport={() => exportCsv(`${type}.csv`, rows)} onPrint={() => printTable(type.replaceAll('_', ' '), rows, Object.keys(rows[0] || {}))} /><div className="module-actions report-actions"><button className="ghost-btn" onClick={() => downloadPdf(`${type}.pdf`, type.replaceAll('_', ' '), rowsToPdfLines(rows))}><FileDown size={16} /> Export PDF</button></div><div className="tabs">{['daily_sales', 'weekly_sales', 'monthly_sales', 'yearly_sales', 'product_sales', 'profit', 'inventory', 'customers', 'expenses', 'suppliers', 'purchases', 'customer_ledger', 'supplier_ledger', 'repairs', 'credit_recovery'].map((item) => <button className={type === item ? 'tab active' : 'tab'} key={item} onClick={() => generate(item)}>{item.replaceAll('_', ' ')}</button>)}</div><DataTable rows={rows} columns={Object.keys(rows[0] || { message: 'No Data Available' })} /></section>;
}

function ModuleHeader({ title, query, setQuery, onAdd, onImport, onExport, onPrint }) {
  return <div className="module-head"><h2>{title}</h2><div className="module-actions"><SearchBox value={query} onChange={setQuery} />{onAdd && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Add</button>}{onImport && <button className="ghost-btn" onClick={onImport}><Upload size={16} /> Import Excel</button>}<button className="ghost-btn" onClick={onExport}><Download size={16} /> Export Excel</button><button className="ghost-btn" onClick={onPrint}><Printer size={16} /> Print</button></div></div>;
}

function SearchBox({ value, onChange, placeholder = 'Search / filter records', inputProps = {} }) {
  return <label className="search-box"><Search size={17} /><input {...inputProps} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function DataTable({ rows, columns, actions, editable, onAdd }) {
  const [sort, setSort] = useState({ key: columns[0], dir: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => setPage(1), [rows.length, columns.join('|')]);
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      const result = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)
        ? leftNumber - rightNumber
        : String(left ?? '').localeCompare(String(right ?? ''));
      return sort.dir === 'asc' ? result : -result;
    });
    return copy;
  }, [rows, sort]);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  function toggleSort(column) {
    setSort((current) => current.key === column ? { key: column, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key: column, dir: 'asc' });
  }
  return <div className="data-table"><div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}><button className="sort-head" onClick={() => toggleSort(column)}>{headerLabel(column)}<span>{sort.key === column ? (sort.dir === 'asc' ? '^' : 'v') : '-'}</span></button></th>)}{actions && <th className="actions-head">Actions</th>}</tr></thead><tbody>{pageRows.length ? pageRows.map((row, index) => <tr key={row.uuid || index}>{columns.map((column) => <td key={column} title={String(row[column] ?? '')}>{editable && ['quantity', 'price'].includes(column) ? <input className="cell-input" type="number" value={row[column]} onChange={(e) => editable(row, column, e.target.value)} /> : format(row[column], column)}</td>)}{actions && <td className="actions-cell"><div className="row-actions">{actions(row)}</div></td>}</tr>) : <tr><td colSpan={columns.length + (actions ? 1 : 0)}><EmptyRows onAdd={onAdd} /></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {start}-{end} of {total} records</span><div className="pagination"><button className="ghost-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button><span>Page {safePage} / {pages}</span><button className="ghost-btn" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Next</button></div></div></div>;
}

function List({ title, rows, cols }) {
  return <section className="panel"><h2>{title}</h2><DataTable rows={rows} columns={cols} /></section>;
}

function RecordModal({ title, fields, record, onSubmit, onClose }) {
  const [form, setForm] = useState(record);
  function change(key, value) { setForm({ ...form, [key]: value }); }
  const label = MODULE_LABELS[title] || title.replace(/Management|System/g, '').trim();
  return <ModalShell onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><div className="modal-header"><h2>{record.uuid ? `Edit ${label}` : `Add ${label}`}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid">{fields.map(([key, fieldLabel, type = 'text', required = false, options]) => <label key={key}>{fieldLabel}{type === 'select' ? <select required={required} value={form[key] || ''} onChange={(e) => change(key, e.target.value)}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={required} type={type} value={form[key] || ''} onChange={(e) => change(key, e.target.value)} />}</label>)}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>;
}

function DetailModal({ title, row, columns, onClose }) {
  return <ModalShell onClose={onClose}><div className="modal-header"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="detail-grid">{columns.map((column) => <div key={column} className="detail-item"><span>{headerLabel(column)}</span><strong>{format(row[column], column)}</strong></div>)}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button type="button" className="primary-btn" onClick={() => printTable(title, [row], columns)}><Printer size={15} /> Print</button></div></ModalShell>;
}

function EmptyRows({ onAdd }) {
  return <div className="empty-inline"><strong>No records found</strong>{onAdd && <button className="primary-btn" type="button" onClick={onAdd}><Plus size={16} /> Add New Record</button>}</div>;
}

function Pagination({ page, total, setPage }) {
  const pages = Math.max(1, Math.ceil(total / 10));
  return <div className="pagination"><button className="ghost-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {pages}</span><button className="ghost-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>;
}

function filterRows(rows, query, keys) {
  const value = query.trim().toLowerCase();
  if (!value) return rows;
  return rows.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(value)));
}

function money(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function format(value, key) {
  if (key === 'status') return <span className={`status-tag ${statusClass(value)}`}>{String(value ?? '')}</span>;
  if (['purchase_price', 'sale_price', 'cost_price', 'amount', 'charges', 'repair_charges', 'advance_payment', 'remaining_amount', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit', 'total_spent'].includes(key)) return money(value);
  if (String(key).includes('_at') && value) return new Date(value).toLocaleString();
  return String(value ?? '');
}

function headerLabel(key) {
  return HEADER_LABELS[key] || key.replaceAll('_', ' ');
}

function statusClass(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('out') || text.includes('disabled') || text.includes('due')) return 'bad';
  if (text.includes('low') || text.includes('pending') || text.includes('progress') || text.includes('payable')) return 'warn';
  return 'ok';
}

function printTable(title, rows, columns) {
  const html = `<div class="brand">Digital Solutions Hub</div><h2>${title}</h2><table><thead><tr>${columns.map((col) => `<th>${headerLabel(col)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${printableFormat(row[col], col)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  printHtml(title, html);
}

function printableFormat(value, key) {
  if (['purchase_price', 'sale_price', 'cost_price', 'amount', 'charges', 'repair_charges', 'advance_payment', 'remaining_amount', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit', 'total_spent'].includes(key)) return money(value);
  if (String(key).includes('_at') && value) return new Date(value).toLocaleString();
  return String(value ?? '');
}

function legacyPrintInvoice(sale, cart) {
  const html = `<div class="brand">DSH - Digital Solutions Hub</div><h2>Invoice ${sale.invoice_number}</h2><p>${sale.customer_name} - ${new Date(sale.sold_at).toLocaleString()}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${cart.map((item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${money(item.price)}</td></tr>`).join('')}</tbody></table><h3 class="right">Total: ${money(sale.total)}</h3><p>Paid: ${money(sale.paid)} | Balance: ${money(sale.balance)}</p>`;
  printHtml(`Invoice ${sale.invoice_number}`, html);
}

function printBarcode(product) {
  printHtml('Barcode', `<div class="brand">MSM</div><h2>${product.product_name}</h2><svg id="barcode"></svg><p>${product.barcode || product.sku || product.imei || product.uuid}</p>`);
}

function printLedger(party, ledgers, key = 'customer_uuid') {
  const rows = ledgers.filter((row) => row[key] === party.uuid);
  printTable(`${party.name || party.supplier_name} Ledger`, rows, ['type', 'amount', 'reference', 'due_date', 'entry_at']);
}

function printJobCard(repair) {
  printHtml(`Job Card ${repair.job_number}`, `<div class="brand">DSH Repair Job Card</div><h2>${repair.job_number || repair.uuid}</h2><p>Customer: ${repair.customer_name}</p><p>Device: ${repair.device_name}</p><p>IMEI: ${repair.imei}</p><p>Problem: ${repair.problem}</p><p>Status: ${repair.status}</p><h3>Charges: ${money(repair.charges)}</h3>`);
}

function printPurchaseReceipt(purchase) {
  printHtml(`Purchase ${purchase.invoice_number}`, `<section class="receipt-shell"><div class="brand">Purchase Receipt</div><h2>${purchase.invoice_number}</h2><p>Supplier: ${purchase.supplier_name || ''}</p><p>Status: ${purchase.status || ''}</p><h3>Total: ${money(purchase.total)}</h3><p>Paid: ${money(purchase.paid)} | Balance: ${money(purchase.balance)}</p></section>`);
}

function printInvoice(sale, cart = [], brand = {}) {
  const qr = receiptQrData(sale);
  const html = `<section class="receipt-shell"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:64px">` : ''}<div class="brand">${brand?.company_name || 'Digital Solutions Hub'}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div><div><h2>${brand?.invoice_header || 'Sales Invoice'} ${sale.invoice_number}</h2><p>${sale.customer_name || 'Walk-in Customer'} - ${sale.sold_at ? new Date(sale.sold_at).toLocaleString() : new Date().toLocaleString()}</p><p><strong>QR:</strong> ${qr.replaceAll('\n', ' | ')}</p></div></div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${cart.length ? cart.map((item) => `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${money(item.price)}</td></tr>`).join('') : `<tr><td colspan="3">Saved invoice record</td></tr>`}</tbody></table><h3 class="receipt-total">Total: ${money(sale.total)}</h3><p>Paid: ${money(sale.paid)} | Balance: ${money(sale.balance)}</p><p class="muted">Warranty notes apply according to product condition and shop policy.</p><p>${brand?.footer || 'Thank you for your business.'}</p></section>`;
  printHtml(`Invoice ${sale.invoice_number}`, html);
}

function invoicePdfLines(invoice, cart, brand = {}) {
  return [
    brand?.company_name || 'Digital Solutions Hub',
    brand?.contact_number || '',
    `Invoice: ${invoice.invoice_number}`,
    `Customer: ${invoice.customer_name}`,
    ...cart.map((item) => `${item.product_name} x ${item.quantity} - ${money(Number(item.quantity) * Number(item.price))}`),
    `Subtotal: ${money(invoice.subtotal)}`,
    `Discount: ${money(invoice.discount)}`,
    `Tax: ${money(invoice.tax)}`,
    `Total: ${money(invoice.total)}`,
    `Paid: ${money(invoice.paid)}`,
    `Balance: ${money(invoice.balance)}`,
    brand?.footer || 'Thank you for your business.',
  ];
}

function invoiceMessage(invoice, brand = {}) {
  return `${brand?.company_name || 'Mobile Shop'} invoice ${invoice.invoice_number}\nCustomer: ${invoice.customer_name}\nTotal: ${money(invoice.total)}\nPaid: ${money(invoice.paid)}\nBalance: ${money(invoice.balance)}`;
}

function rowsToPdfLines(rows) {
  if (!rows.length) return ['No Data Available'];
  return rows.slice(0, 40).map((row) => Object.entries(row).slice(0, 6).map(([key, value]) => `${key}: ${value}`).join(' | '));
}

function repairReceiptHtml(repair, brand = {}) {
  const thermal = repair.template === 'Thermal Receipt';
  return `<section class="receipt-shell ${thermal ? 'thermal' : ''}"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:60px">` : ''}<div class="brand">${brand?.company_name || 'Digital Solutions Hub'}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div><div><h2>Repair Receipt ${repair.receipt_number}</h2><p>${repair.date || new Date().toISOString().slice(0, 10)}</p><p><strong>QR:</strong> ${receiptQrData(repair).replaceAll('\n', ' | ')}</p></div></div><table><tbody><tr><th>Customer</th><td>${repair.customer_name || ''}</td></tr><tr><th>Phone</th><td>${repair.phone || ''}</td></tr><tr><th>Device</th><td>${repair.device_name || ''}</td></tr><tr><th>IMEI</th><td>${repair.imei || ''}</td></tr><tr><th>Problem</th><td>${repair.problem || ''}</td></tr><tr><th>Technician</th><td>${repair.technician || ''}</td></tr><tr><th>Delivery Date</th><td>${repair.delivery_date || ''}</td></tr></tbody></table><h3 class="receipt-total">Charges: ${money(repair.repair_charges)}</h3><p>Advance: ${money(repair.advance_payment)} | Remaining: ${money(repair.remaining_amount)}</p><div class="signature"></div><p class="muted">Customer Signature</p><p>${brand?.footer || 'Thank you for choosing us.'}</p></section>`;
}

function printRepairReceipt(repair, brand) {
  printHtml(`Repair Receipt ${repair.receipt_number}`, repairReceiptHtml(repair, brand));
}

function repairReceiptMessage(repair, brand = {}) {
  return `${brand?.company_name || 'Mobile Shop'} repair receipt ${repair.receipt_number}\nCustomer: ${repair.customer_name}\nDevice: ${repair.device_name}\nCharges: ${money(repair.repair_charges)}\nAdvance: ${money(repair.advance_payment)}\nRemaining: ${money(repair.remaining_amount)}\nDelivery: ${repair.delivery_date || 'TBC'}`;
}

function repairReceiptPdfLines(repair, brand = {}) {
  return [
    brand?.company_name || 'Digital Solutions Hub',
    brand?.contact_number || '',
    brand?.address || '',
    `Receipt Number: ${repair.receipt_number}`,
    `Date: ${repair.date || ''}`,
    `Customer: ${repair.customer_name || ''}`,
    `Phone: ${repair.phone || ''}`,
    `Device: ${repair.device_name || ''}`,
    `IMEI: ${repair.imei || ''}`,
    `Problem: ${repair.problem || ''}`,
    `Repair Charges: ${money(repair.repair_charges)}`,
    `Advance Payment: ${money(repair.advance_payment)}`,
    `Remaining Amount: ${money(repair.remaining_amount)}`,
    `Technician: ${repair.technician || ''}`,
    `Delivery Date: ${repair.delivery_date || ''}`,
    'Customer Signature: ____________________',
    brand?.footer || 'Thank you for choosing us.',
  ];
}

function initials(value) {
  return String(value || 'DSH').split(/\s+/).slice(0, 3).map((part) => part[0]).join('').toUpperCase();
}

createRoot(document.getElementById('root')).render(<App />);


