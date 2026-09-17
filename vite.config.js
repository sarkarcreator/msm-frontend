import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function businessRuntimeBridge() {
  return {
    name: 'msm-business-runtime-bridge',
    transform(code, id) {
      if (!id.endsWith('/src/main.jsx') || code.includes("./config/businessRuntime.js")) {
        return null;
      }

      const importMarker = "import './styles/app.css';";
      const runtimeImport = "import { filterModulesForRuntime } from './config/businessRuntime.js';";
      if (!code.includes(importMarker)) return null;

      const withImport = code.replace(importMarker, `${importMarker}\n${runtimeImport}`);
      const legacyFunction = /function modulesForBusiness\(modules, brand, role\) \{[\\s\\S]*?\n\}\n\nfunction businessTypeKey/;
      const runtimeFunction = `function modulesForBusiness(modules, brand, role) {\n  const roleModules = ROLE_MODULES[role] || ROLE_MODULES.Cashier;\n  return filterModulesForRuntime(modules, brand, role, roleModules);\n}\n\nfunction businessTypeKey`;

      if (!legacyFunction.test(withImport)) {
        return null;
      }

      return {
        code: withImport.replace(legacyFunction, runtimeFunction),
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [businessRuntimeBridge(), react()],
  server: {
    port: 5173,
  },
});
