import { getAllowedModules, getBusinessContext } from './moduleRegistry.js';

/**
 * Compatibility boundary for the current monolithic main.jsx runtime.
 *
 * This adapter lets the existing screen code ask the new Business OS registry
 * for its visible modules without forcing a large main.jsx rewrite in one step.
 * It intentionally returns the same module objects supplied by the caller.
 */
export function resolveVisibleModules({ modules, brand, user } = {}) {
  return getAllowedModules({ brand, user, modules });
}

export function resolveBusinessRuntimeContext({ modules, brand, user } = {}) {
  return {
    ...getBusinessContext({ brand, user }),
    modules: getAllowedModules({ brand, user, modules }),
  };
}

export function isVisibleModule(moduleId, options = {}) {
  return resolveVisibleModules(options).some((module) => module.id === moduleId);
}
