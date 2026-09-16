import React from 'react';
import { Menu, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Presentation shell for the DSH Business OS.
 *
 * This component intentionally owns layout/navigation only. Existing feature
 * screens remain untouched until they are extracted one boundary at a time.
 */
export default function AppShell({
  context,
  activeModule,
  onModuleChange,
  children,
  online = true,
  syncing = false,
  pendingCount = 0,
  onSearch,
  mobileMenuOpen = false,
  onMobileMenuToggle,
}) {
  const modules = context?.modules || [];

  return (
    <div className="dsh-app-shell" data-business={context?.key || 'general_store'}>
      <header className="dsh-shell-header">
        <button type="button" className="dsh-touch-button dsh-menu-button" onClick={onMobileMenuToggle} aria-label="Open navigation">
          <Menu size={22} />
        </button>

        <div className="dsh-shell-brand" aria-label={context?.definition?.label || 'Business OS'}>
          <strong>{context?.definition?.label || 'Business OS'}</strong>
          <span>DSH Business OS</span>
        </div>

        <button type="button" className="dsh-shell-search dsh-touch-button" onClick={onSearch} aria-label="Search">
          <Search size={21} />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="dsh-sync-state" aria-live="polite">
          {online ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span>{syncing ? 'Syncing…' : online ? 'Online' : 'Offline'}</span>
          {pendingCount > 0 && <small>{pendingCount} pending</small>}
          {syncing && <RefreshCw className="dsh-spin" size={16} />}
        </div>
      </header>

      <div className="dsh-shell-body">
        <aside className={`dsh-shell-sidebar${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Business navigation">
          <nav>
            {modules.map((module) => {
              const Icon = module.icon;
              const active = module.id === activeModule;
              return (
                <button
                  key={module.id}
                  type="button"
                  className={`dsh-nav-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onModuleChange?.(module.id)}
                >
                  {Icon && <Icon size={21} />}
                  <span>{module.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="dsh-shell-content">{children}</main>
      </div>
    </div>
  );
}
