import { MODULES, businessTypeKey, isModuleAllowedForBusiness } from './businessRegistry.js';

/** Runtime adapter for one canonical business/module decision. */
export function resolveBusinessRuntime(brand = {}, role = 'Cashier') {
  const businessKey = businessTypeKey(brand?.business_type || localStorage.getItem('dsh_business_type') || 'general_store');
  return { businessKey, role: role || 'Cashier', modules: MODULES.filter((module) => isModuleAllowedForBusiness(businessKey, module.id)) };
}

export function filterModulesForRuntime(modules = MODULES, brand = {}, role = 'Cashier', roleModules = null) {
  if (role === 'Super Admin') return modules;
  const businessKey = businessTypeKey(brand?.business_type || localStorage.getItem('dsh_business_type') || 'general_store');
  const allowed = new Set(
    modules
      .filter((module) => isModuleAllowedForBusiness(businessKey, module.id))
      .filter((module) => !roleModules || roleModules.includes(module.id))
      .map((module) => module.id),
  );
  return modules.filter((module) => allowed.has(module.id));
}

export function canRenderBusinessModule(moduleId, brand = {}) {
  const businessKey = businessTypeKey(brand?.business_type || localStorage.getItem('dsh_business_type') || 'general_store');
  return isModuleAllowedForBusiness(businessKey, moduleId);
}
