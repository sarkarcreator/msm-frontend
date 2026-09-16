import { MODULES, businessDefinition, businessTypeKey, modulesForBusinessType } from '../config/businessRegistry.js';

const ROLE_MODULES = {
  'Super Admin': ['dashboard', 'licenses', 'users', 'settings', 'backup', 'reports', 'notifications'],
  Admin: null,
  'Hospital Owner': ['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'backup', 'users'],
  Receptionist: ['dashboard', 'patients', 'hospitalBilling', 'notifications'],
  Manager: null,
  Cashier: ['dashboard', 'pos', 'sales', 'customers', 'credit', 'mobileWallets', 'traderRetailers', 'traderRecoveries', 'repairReceipts', 'warrantyClaims', 'returns', 'notifications'],
  Technician: ['dashboard', 'customers', 'repairs', 'repairReceipts', 'warrantyClaims', 'notifications'],
  Doctor: ['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'backup'],
  Compounder: ['dashboard', 'patients', 'hospitalTasks', 'hospitalPharmacy', 'notifications', 'catalog', 'medicines'],
  Assistant: ['dashboard', 'patients', 'hospitalTasks', 'hospitalPharmacy', 'notifications', 'catalog', 'medicines'],
  Nurse: ['dashboard', 'hospitalTasks', 'patients', 'notifications'],
  'Pharmacy Staff': ['dashboard', 'hospitalPharmacy', 'products', 'medicines', 'notifications'],
  'Lab Technician': ['dashboard', 'labReports', 'hospitalTasks', 'notifications'],
  'X-Ray Technician': ['dashboard', 'radiologyReports', 'hospitalTasks', 'notifications'],
  'Billing Officer': ['dashboard', 'hospitalBilling', 'patients', 'notifications'],
};

export function resolveRole(user) {
  return user?.role?.name || user?.role_name || user?.role || 'Cashier';
}

export function resolveBusinessType(brand, fallback = 'general_store') {
  return businessTypeKey(brand?.business_type || fallback);
}

export function getAllowedModules({ brand, user, modules = MODULES } = {}) {
  const role = resolveRole(user);
  if (role === 'Super Admin') return modules;

  const businessModules = modulesForBusinessType(resolveBusinessType(brand), modules);
  const roleModules = ROLE_MODULES[role];

  // Existing Admin/Manager behavior remains business-registry driven. Their
  // detailed permission matrix can be moved here incrementally without changing
  // the current runtime contract.
  if (!roleModules) return businessModules;

  const allowed = new Set(roleModules);
  return businessModules.filter((module) => allowed.has(module.id));
}

export function getBusinessContext({ brand, user } = {}) {
  const key = resolveBusinessType(brand);
  return {
    key,
    definition: businessDefinition(key),
    role: resolveRole(user),
    modules: getAllowedModules({ brand, user }),
  };
}

export function isModuleAllowed(moduleId, context) {
  return Boolean(context?.modules?.some((module) => module.id === moduleId));
}
