import React from 'react';
import { createRoot } from 'react-dom/client';
import DashboardV2 from './DashboardV2.jsx';
import { getBrandSettings, listRecords } from '../../lib/db.js';
import './dashboard-runtime.css';

const MODULE_LABELS = {
  pos: 'Sales POS',
  products: 'Inventory',
  customers: 'Customers',
  purchases: 'Purchases',
  expenses: 'Expenses',
  reports: 'Reports',
  sales: 'Sales',
  patients: 'Patients',
  hospitalBilling: 'Hospital Billing',
  labReports: 'Lab Reports',
  radiologyReports: 'Radiology',
  repairs: 'Repairs',
  warrantyClaims: 'Warranty Claims',
  traderRetailers: 'Retailers',
  traderRecoveries: 'Recovery',
};

const BUSINESS_ACTIONS = {
  hospital: [
    ['patients', 'New Patient', 'Patient registration'],
    ['hospitalBilling', 'Billing', 'Open hospital billing'],
    ['labReports', 'Lab Reports', 'Review lab work'],
    ['radiologyReports', 'Radiology', 'Review radiology'],
    ['expenses', 'Add Expense', 'Record expense'],
    ['reports', 'View Reports', 'Hospital insights'],
  ],
  mobile_shop: [
    ['pos', 'New Sale', 'Open mobile POS'],
    ['products', 'Add Device', 'Inventory / IMEI'],
    ['customers', 'New Customer', 'Customer record'],
    ['repairs', 'New Repair', 'Repair jobs'],
    ['warrantyClaims', 'Warranty', 'Claims & service'],
    ['reports', 'View Reports', 'Business insights'],
  ],
  pharmacy: [
    ['pos', 'New Sale', 'Open pharmacy POS'],
    ['products', 'Add Medicine', 'Inventory / batch'],
    ['customers', 'New Customer', 'Patient / customer'],
    ['purchases', 'New Purchase', 'Stock in'],
    ['expenses', 'Add Expense', 'Record expense'],
    ['reports', 'View Reports', 'Pharmacy insights'],
  ],
  traders: [
    ['pos', 'New Sale', 'Create trade sale'],
    ['products', 'Add Stock', 'Inventory'],
    ['traderRetailers', 'New Retailer', 'Retailer management'],
    ['traderRecoveries', 'Recovery', 'Collect payment'],
    ['purchases', 'New Purchase', 'Stock in'],
    ['reports', 'View Reports', 'Distribution insights'],
  ],
  default: [
    ['pos', 'New Sale', 'Open POS'],
    ['products', 'Add Product', 'Inventory'],
    ['customers', 'New Customer', 'Customer record'],
    ['purchases', 'New Purchase', 'Stock in'],
    ['expenses', 'Add Expense', 'Record expense'],
    ['reports', 'View Reports', 'Business insights'],
  ],
};

function businessKey(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'hospital') return 'hospital';
  if (['mobile_shop', 'mobile'].includes(normalized)) return 'mobile_shop';
  if (normalized === 'pharmacy') return 'pharmacy';
  if (normalized === 'traders') return 'traders';
  return 'default';
}

function today(value) {
  return String(value || '').slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function money(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

async function loadDashboard() {
  const [brand, sales, products, customers, purchases, expenses, patients, bills, labReports, radiologyReports, repairs, warrantyClaims, retailers, recoveries] = await Promise.all([
    getBrandSettings(),
    listRecords('sales'),
    listRecords('products'),
    listRecords('customers'),
    listRecords('purchases'),
    listRecords('expenses'),
    listRecords('patients'),
    listRecords('hospital_bills'),
    listRecords('lab_reports'),
    listRecords('radiology_reports'),
    listRecords('repairs'),
    listRecords('warranty_claims'),
    listRecords('trader_retailers'),
    listRecords('trader_recoveries'),
  ]);

  const key = businessKey(brand?.business_type);
  const salesToday = sales.filter((row) => today(row.sold_at || row.created_at));
  const hospitalPaidToday = bills.filter((row) => today(row.received_at || row.updated_at || row.created_at));
  const salesValue = salesToday.reduce((sum, row) => sum + Number(row.total || 0), 0) + hospitalPaidToday.reduce((sum, row) => sum + Number(row.paid || row.paid_amount || 0), 0);
  const receivables = sales.reduce((sum, row) => sum + Number(row.balance || 0), 0)
    + customers.reduce((sum, row) => sum + Number(row.balance || 0), 0)
    + bills.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  const lowStock = products.filter((row) => Number(row.quantity || 0) <= Number(row.low_stock_threshold || 3));
  const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const alerts = [];

  if (lowStock.length) alerts.push({ id: 'low-stock', title: `${lowStock.length} items need stock`, description: 'Open Inventory to receive or update stock.', action: 'products', tone: 'danger' });
  if (receivables > 0) alerts.push({ id: 'receivables', title: `${money(receivables)} receivables`, description: 'Review customer and hospital outstanding balances.', action: key === 'hospital' ? 'hospitalBilling' : 'sales', tone: 'warning' });
  if (key === 'pharmacy') {
    const expiry = products.filter((row) => row.expiry_date && new Date(row.expiry_date).getTime() <= Date.now() + 90 * 86400000);
    if (expiry.length) alerts.push({ id: 'expiry', title: `${expiry.length} medicines near expiry`, description: 'Review batch and expiry dates in Inventory.', action: 'products', tone: 'danger' });
  }
  if (key === 'hospital') {
    const pendingReports = [...labReports, ...radiologyReports].filter((row) => row.status === 'Pending');
    if (pendingReports.length) alerts.push({ id: 'reports', title: `${pendingReports.length} reports pending`, description: 'Lab and radiology work needs attention.', action: 'labReports', tone: 'warning' });
    const pendingBills = bills.filter((row) => Number(row.balance || 0) > 0);
    if (pendingBills.length) alerts.push({ id: 'bills', title: `${pendingBills.length} bills pending`, description: 'Open Hospital Billing to continue collection.', action: 'hospitalBilling', tone: 'warning' });
  }
  if (key === 'mobile_shop' && repairs.some((row) => !['Completed', 'Delivered', 'Cancelled'].includes(row.status))) alerts.push({ id: 'repairs', title: 'Repair jobs need attention', description: 'Review open repair jobs.', action: 'repairs', tone: 'warning' });

  let metrics;
  if (key === 'hospital') {
    metrics = [
      { key: 'sales', label: 'Today Revenue', value: money(salesValue), tone: 'primary' },
      { key: 'orders', label: 'Patients', value: patients.length, tone: 'success' },
      { key: 'receivables', label: 'Pending Bills', value: bills.filter((row) => Number(row.balance || 0) > 0).length, tone: 'warning' },
      { key: 'stock', label: 'Pending Reports', value: [...labReports, ...radiologyReports].filter((row) => row.status === 'Pending').length, tone: 'danger' },
    ];
  } else if (key === 'mobile_shop') {
    metrics = [
      { key: 'sales', label: 'Today Sales', value: money(salesValue), tone: 'primary' },
      { key: 'orders', label: 'Orders', value: salesToday.length, tone: 'success' },
      { key: 'receivables', label: 'Receivables', value: money(receivables), tone: 'warning' },
      { key: 'stock', label: 'Open Repairs', value: repairs.filter((row) => !['Completed', 'Delivered', 'Cancelled'].includes(row.status)).length, tone: 'danger' },
    ];
  } else if (key === 'pharmacy') {
    const nearExpiry = products.filter((row) => row.expiry_date && new Date(row.expiry_date).getTime() <= Date.now() + 90 * 86400000);
    metrics = [
      { key: 'sales', label: 'Today Sales', value: money(salesValue), tone: 'primary' },
      { key: 'orders', label: 'Orders', value: salesToday.length, tone: 'success' },
      { key: 'receivables', label: 'Receivables', value: money(receivables), tone: 'warning' },
      { key: 'stock', label: 'Near Expiry', value: nearExpiry.length, tone: 'danger' },
    ];
  } else if (key === 'traders') {
    metrics = [
      { key: 'sales', label: 'Today Sales', value: money(salesValue), tone: 'primary' },
      { key: 'orders', label: 'Retailers', value: retailers.length, tone: 'success' },
      { key: 'receivables', label: 'Outstanding', value: money(receivables), tone: 'warning' },
      { key: 'stock', label: 'Recoveries', value: money(recoveries.filter((row) => today(row.date || row.created_at)).reduce((sum, row) => sum + Number(row.amount || 0), 0)), tone: 'danger' },
    ];
  } else {
    metrics = [
      { key: 'sales', label: 'Today Sales', value: money(salesValue), tone: 'primary', subtext: `${salesToday.length} invoices` },
      { key: 'orders', label: 'Orders', value: salesToday.length, tone: 'success' },
      { key: 'receivables', label: 'Receivables', value: money(receivables), tone: 'warning' },
      { key: 'stock', label: 'Low Stock', value: lowStock.length, tone: 'danger' },
    ];
  }

  const recentSales = sales.slice(0, 8).map((row) => ({
    id: row.uuid,
    invoice: row.invoice_number,
    customer: row.customer_name,
    time: row.sold_at || row.created_at,
    total: money(row.total),
    status: row.status || 'Completed',
  }));

  return { brand, key, metrics, recentSales, alerts, expenseTotal };
}

function findModuleButton(moduleId) {
  const label = MODULE_LABELS[moduleId];
  if (!label) return null;
  return [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)
    || [...document.querySelectorAll('[role="button"]')].find((button) => button.textContent?.trim() === label);
}

function goModule(moduleId) {
  const button = findModuleButton(moduleId);
  if (button) button.click();
}

function DashboardRuntime() {
  const [state, setState] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const refresh = () => loadDashboard().then((next) => active && setState(next)).catch((reason) => active && setError(reason?.message || 'Dashboard data could not be loaded.'));
    refresh();
    const interval = window.setInterval(refresh, 30000);
    const onRefresh = () => refresh();
    window.addEventListener('msm:dashboard-refresh', onRefresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('msm:dashboard-refresh', onRefresh); };
  }, []);

  if (error) return <div className="dsh-runtime-error">Dashboard data could not be refreshed. Existing business data remains available.</div>;
  if (!state) return <div className="dsh-runtime-loading">Loading your live business command center…</div>;

  const actions = (BUSINESS_ACTIONS[state.key] || BUSINESS_ACTIONS.default).map(([id, label, hint]) => ({ id, label, hint }));
  return <DashboardV2 brand={state.brand} metrics={state.metrics} quickActions={actions} recentSales={state.recentSales} alerts={state.alerts} onAction={goModule} />;
}

function dashboardStack() {
  return [...document.querySelectorAll('.stack')].find((node) => {
    const text = node.textContent || '';
    return text.includes('Financial Overview') && text.includes('Inventory Overview');
  });
}

let mountedNode = null;
let root = null;

function mountWhenDashboardIsVisible() {
  const stack = dashboardStack();
  if (!stack) return;
  if (mountedNode && mountedNode.isConnected) return;
  mountedNode = document.createElement('div');
  mountedNode.id = 'dsh-dashboard-v2-runtime';
  stack.parentNode?.insertBefore(mountedNode, stack);
  stack.setAttribute('data-dsh-dashboard-v1', 'hidden');
  stack.style.display = 'none';
  root = createRoot(mountedNode);
  root.render(<DashboardRuntime />);
}

const observer = new MutationObserver(() => {
  if (!mountedNode || !mountedNode.isConnected) {
    mountedNode = null;
    root = null;
    mountWhenDashboardIsVisible();
  }
});

function boot() {
  mountWhenDashboardIsVisible();
  observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
