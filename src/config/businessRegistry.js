import {
  BarChart3, Bell, Boxes, Calculator, Download, FileText, KeyRound, Printer,
  ReceiptText, Settings, Users, WalletCards, Wrench, Upload,
} from 'lucide-react';

/**
 * Canonical business registry.
 *
 * The registry is deliberately UI-only: it decides which capabilities a tenant
 * can see. Authorization and tenant isolation remain server-side concerns.
 * Keep ids stable because they are also used by permissions and IndexedDB.
 */
export const BUSINESS_REGISTRY = {
  general_store: {
    id: 'general_store',
    label: 'Store',
    aliases: ['General Store', 'Grocery Store', 'Grocery', 'Retail Shop', 'Shopping Mall'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'backup', 'users'],
  },
  mobile_shop: {
    id: 'mobile_shop',
    label: 'Mobile Shop',
    aliases: ['Mobile Shop', 'Mobile'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'repairs', 'repairReceipts', 'warrantyClaims', 'returns', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'backup', 'users'],
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    aliases: ['Pharmacy'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'backup', 'users'],
  },
  hospital: {
    id: 'hospital',
    label: 'Hospital',
    aliases: ['Hospital'],
    modules: ['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling', 'expenses', 'notifications', 'accounting', 'reports', 'catalog', 'medicines', 'backup', 'users'],
  },
  traders: {
    id: 'traders',
    label: 'Traders',
    aliases: ['Traders', 'Trader', 'Distribution'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'traderCompanies', 'traderBrands', 'traderTerritories', 'traderRoutes', 'traderSalesmen', 'traderRetailers', 'traderChallans', 'traderRecoveries', 'traderSalesmanLedger', 'traderDistributorLedger', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'backup', 'users'],
  },
  electronics_store: {
    id: 'electronics_store',
    label: 'Electronics Store',
    aliases: ['Electronics Store', 'Electronics'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'repairs', 'repairReceipts', 'warrantyClaims', 'returns', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'backup', 'users'],
  },
  clothing_store: {
    id: 'clothing_store',
    label: 'Clothing Store',
    aliases: ['Clothing Store'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'backup', 'users'],
  },
  hardware_store: {
    id: 'hardware_store',
    label: 'Hardware Store',
    aliases: ['Hardware Store'],
    modules: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'backup', 'users'],
  },
};

export const CORE_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pos', label: 'Sales POS', icon: ReceiptText },
  { id: 'sales', label: 'Sales', icon: FileText },
  { id: 'products', label: 'Inventory', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'credit', label: 'Udhaar', icon: WalletCards },
  { id: 'purchases', label: 'Purchases', icon: Upload },
  { id: 'suppliers', label: 'Suppliers', icon: Users },
  { id: 'expenses', label: 'Expenses', icon: Calculator },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'backup', label: 'Backup', icon: Download },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Admin', icon: Settings },
];

export const MODULES = [
  ...CORE_MODULES,
  { id: 'mobileWallets', label: 'Mobile Wallets', icon: WalletCards },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'repairReceipts', label: 'Repair Receipts', icon: Printer },
  { id: 'warrantyClaims', label: 'Warranty Claims', icon: KeyRound },
  { id: 'returns', label: 'Returns', icon: Download },
  { id: 'traderCompanies', label: 'Companies', icon: Boxes },
  { id: 'traderBrands', label: 'Brands', icon: Boxes },
  { id: 'traderTerritories', label: 'Territories', icon: FileText },
  { id: 'traderRoutes', label: 'Routes', icon: FileText },
  { id: 'traderSalesmen', label: 'Salesmen', icon: Users },
  { id: 'traderRetailers', label: 'Retailers', icon: Users },
  { id: 'traderChallans', label: 'Delivery Challan', icon: Upload },
  { id: 'traderRecoveries', label: 'Recovery', icon: WalletCards },
  { id: 'traderSalesmanLedger', label: 'Salesman Ledger', icon: FileText },
  { id: 'traderDistributorLedger', label: 'Distributor Ledger', icon: FileText },
  { id: 'accounting', label: 'Accounting', icon: FileText },
  { id: 'catalog', label: 'Master Catalog', icon: Boxes },
  { id: 'medicines', label: 'Medicines', icon: FileText },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'assistants', label: 'Assistants', icon: Users },
  { id: 'hospitalPharmacy', label: 'Hospital Pharmacy', icon: Boxes },
  { id: 'hospitalTasks', label: 'Injection Room', icon: Wrench },
  { id: 'labReports', label: 'Lab Reports', icon: FileText },
  { id: 'radiologyReports', label: 'Radiology', icon: FileText },
  { id: 'hospitalBilling', label: 'Hospital Billing', icon: Calculator },
  { id: 'licenses', label: 'Licenses', icon: KeyRound },
];

export function businessTypeKey(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  for (const [key, definition] of Object.entries(BUSINESS_REGISTRY)) {
    if (key === normalized || definition.aliases.some((alias) => alias.toLowerCase().replace(/[\s-]+/g, '_') === normalized)) {
      return key;
    }
  }
  return 'general_store';
}

export function modulesForBusinessType(type, allModules = MODULES) {
  const definition = BUSINESS_REGISTRY[businessTypeKey(type)] || BUSINESS_REGISTRY.general_store;
  const allowed = new Set(definition.modules);
  return allModules.filter((module) => allowed.has(module.id));
}

export function businessDefinition(type) {
  return BUSINESS_REGISTRY[businessTypeKey(type)] || BUSINESS_REGISTRY.general_store;
}
