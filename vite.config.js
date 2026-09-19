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
      const legacyFunction = /function modulesForBusiness\(modules, brand, role\) \{[\s\S]*?\n\}\n\nfunction businessTypeKey/;
      const runtimeFunction = `function modulesForBusiness(modules, brand, role) {\n  const roleModules = ROLE_MODULES[role] || ROLE_MODULES.Cashier;\n  return filterModulesForRuntime(modules, brand, role, roleModules);\n}\n\nfunction businessTypeKey`;

      if (!legacyFunction.test(withImport)) {
        return null;
      }

      const runtimeDateComponent = `
function RuntimeDateControl() {
  const [now, setNow] = useState(() => new Date());
  const [workingDate, setWorkingDate] = useState(() => localStorage.getItem('msm_working_date') || new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function changeWorkingDate(event) {
    const value = event.target.value || new Date().toISOString().slice(0, 10);
    setWorkingDate(value);
    localStorage.setItem('msm_working_date', value);
    window.dispatchEvent(new CustomEvent('msm:business-date-changed', { detail: value }));
  }

  function resetWorkingDate() {
    const today = new Date().toISOString().slice(0, 10);
    setWorkingDate(today);
    localStorage.setItem('msm_working_date', today);
    window.dispatchEvent(new CustomEvent('msm:business-date-changed', { detail: today }));
  }

  const dateText = now.toLocaleDateString('en-PK', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeText = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isManual = workingDate !== now.toISOString().slice(0, 10);

  return <div className="runtime-date-control" title="System date/time and POS working date">
    <div className="runtime-date-live"><strong>{dateText}</strong><span>{timeText}</span></div>
    <label className={isManual ? 'manual' : ''}>
      <span>Business Date</span>
      <input type="date" value={workingDate} onChange={changeWorkingDate} aria-label="Business Date" />
    </label>
    {isManual && <button type="button" className="runtime-date-reset" onClick={resetWorkingDate} title="Reset business date to today">Today</button>}
  </div>
}`;

      const injected = withImport.replace(
        runtimeFunction,
        `${runtimeFunction}\n\n${runtimeDateComponent}`
      );

      const finalCode = injected.replace(
        '<div className="top-actions">',
        '<div className="top-actions"><RuntimeDateControl />'
      );

      return {
        code: finalCode,
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
