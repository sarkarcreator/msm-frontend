import { MODULES, businessTypeKey, isModuleAllowedForBusiness } from './businessRegistry.js';

/**
 * Resolve the UI capability set for the authenticated business.
 *
 * Super Admin is a control-plane role and intentionally has no tenant
 * business_type. Never turn an empty Super Admin scope into General Store.
 */
export function resolveBusinessRuntime(brand = {}, role = 'Cashier') {
  const resolvedRole = role || 'Cashier';
  if (resolvedRole === 'Super Admin') {
    return { businessKey: null, role: resolvedRole, modules: MODULES };
  }

  const rawBusinessType = brand?.business_type || localStorage.getItem('dsh_business_type') || '';
  const businessKey = businessTypeKey(rawBusinessType || 'general_store');
  return {
    businessKey,
    role: resolvedRole,
    modules: MODULES.filter((module) => isModuleAllowedForBusiness(businessKey, module.id)),
  };
}

export function filterModulesForRuntime(modules = MODULES, brand = {}, role = 'Cashier', roleModules = null) {
  const resolvedRole = role || 'Cashier';
  if (resolvedRole === 'Super Admin') return modules;

  const rawBusinessType = brand?.business_type || localStorage.getItem('dsh_business_type') || '';
  const businessKey = businessTypeKey(rawBusinessType || 'general_store');
  const allowed = new Set(
    modules
      .filter((module) => isModuleAllowedForBusiness(businessKey, module.id))
      .filter((module) => !roleModules || roleModules.includes(module.id))
      .map((module) => module.id),
  );
  return modules.filter((module) => allowed.has(module.id));
}

export function canRenderBusinessModule(moduleId, brand = {}, role = 'Cashier') {
  if (role === 'Super Admin') return true;
  const rawBusinessType = brand?.business_type || localStorage.getItem('dsh_business_type') || '';
  const businessKey = businessTypeKey(rawBusinessType || 'general_store');
  return isModuleAllowedForBusiness(businessKey, moduleId);
}
