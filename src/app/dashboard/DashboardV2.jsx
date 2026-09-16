import React from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Bell,
  Boxes,
  CreditCard,
  PackagePlus,
  ReceiptText,
  ShoppingCart,
  Users,
  WalletCards,
} from 'lucide-react';
import './dashboard-v2.css';

const FALLBACK_METRICS = [
  { key: 'sales', label: 'Today Sales', value: '0', icon: Banknote, tone: 'primary' },
  { key: 'orders', label: 'Orders', value: '0', icon: ReceiptText, tone: 'success' },
  { key: 'receivables', label: 'Receivables', value: '0', icon: CreditCard, tone: 'warning' },
  { key: 'stock', label: 'Low Stock', value: '0', icon: Boxes, tone: 'danger' },
];

const QUICK_ACTIONS = [
  { id: 'pos', label: 'New Sale', hint: 'Open POS', icon: ShoppingCart },
  { id: 'products', label: 'Add Product', hint: 'Inventory', icon: PackagePlus },
  { id: 'customers', label: 'New Customer', hint: 'Customer record', icon: Users },
  { id: 'purchases', label: 'New Purchase', hint: 'Stock in', icon: ArrowDownToLine },
  { id: 'expenses', label: 'Add Expense', hint: 'Record expense', icon: WalletCards },
  { id: 'reports', label: 'View Reports', hint: 'Business insights', icon: Activity },
];

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '0';
  return String(value);
}

export default function DashboardV2({
  brand,
  metrics = [],
  quickActions = QUICK_ACTIONS,
  recentSales = [],
  alerts = [],
  onAction,
}) {
  const resolvedMetrics = FALLBACK_METRICS.map((fallback) => {
    const supplied = metrics.find((item) => item.key === fallback.key);
    return supplied ? { ...fallback, ...supplied } : fallback;
  });

  const businessName = brand?.shop_name || brand?.business_name || brand?.name || 'Your Business';
  const businessType = brand?.business_type || 'Business';

  return (
    <section className="dsh-dashboard-v2" aria-label="Business dashboard">
      <div className="dsh-dashboard-hero">
        <div>
          <span className="dsh-dashboard-eyebrow">Business command center</span>
          <h1>Good day. Let&apos;s run {businessName}.</h1>
          <p>{businessType} &middot; Everything important, in one place.</p>
        </div>
        <div className="dsh-dashboard-status">
          <span className="dsh-live-dot" /> Live business overview
        </div>
      </div>

      <div className="dsh-metric-grid">
        {resolvedMetrics.map((metric) => {
          const Icon = metric.icon || Activity;
          return (
            <article className={`dsh-metric-card dsh-metric-${metric.tone || 'primary'}`} key={metric.key}>
              <div className="dsh-metric-icon"><Icon size={22} /></div>
              <div className="dsh-metric-copy">
                <span>{metric.label}</span>
                <strong>{formatValue(metric.value)}</strong>
                {metric.subtext && <small>{metric.subtext}</small>}
              </div>
              {metric.trend && <span className="dsh-metric-trend"><ArrowUpRight size={15} /> {metric.trend}</span>}
            </article>
          );
        })}
      </div>

      <div className="dsh-dashboard-grid">
        <article className="dsh-panel dsh-quick-panel">
          <div className="dsh-panel-heading">
            <div><span className="dsh-section-kicker">Fast actions</span><h2>Get things done</h2></div>
            <span className="dsh-touch-hint">Touch friendly</span>
          </div>
          <div className="dsh-quick-grid">
            {quickActions.map((action) => {
              const Icon = action.icon || Activity;
              return (
                <button type="button" className="dsh-action" key={action.id} onClick={() => onAction?.(action.id)}>
                  <span className="dsh-action-icon"><Icon size={22} /></span>
                  <span><strong>{action.label}</strong><small>{action.hint}</small></span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="dsh-panel">
          <div className="dsh-panel-heading"><div><span className="dsh-section-kicker">Attention</span><h2>Alerts & tasks</h2></div><Bell size={20} /></div>
          <div className="dsh-list">
            {alerts.length ? alerts.slice(0, 6).map((item, index) => (
              <button type="button" className="dsh-list-row" key={item.id || index} onClick={() => onAction?.(item.action)}>
                <span className={`dsh-alert-dot dsh-alert-${item.tone || 'warning'}`} />
                <span><strong>{item.title || 'Attention needed'}</strong><small>{item.description || ''}</small></span>
                <ArrowUpRight size={17} />
              </button>
            )) : <div className="dsh-empty">No urgent alerts right now.</div>}
          </div>
        </article>
      </div>

      <article className="dsh-panel dsh-recent-panel">
        <div className="dsh-panel-heading"><div><span className="dsh-section-kicker">Live activity</span><h2>Recent sales</h2></div><button type="button" className="dsh-text-action" onClick={() => onAction?.('sales')}>View all <ArrowUpRight size={16} /></button></div>
        {recentSales.length ? (
          <div className="dsh-table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Time</th><th>Total</th><th>Status</th></tr></thead><tbody>{recentSales.slice(0, 8).map((sale, index) => <tr key={sale.id || index}><td>{sale.invoice || sale.invoice_number || `#${sale.id || index + 1}`}</td><td>{sale.customer || sale.customer_name || 'Walk-in Customer'}</td><td>{sale.time || sale.created_at || '—'}</td><td>{sale.total || sale.grand_total || '0'}</td><td><span className="dsh-status-pill">{sale.status || 'Completed'}</span></td></tr>)}</tbody></table></div>
        ) : <div className="dsh-empty dsh-empty-large"><ReceiptText size={28} /><strong>No sales yet</strong><span>Your latest transactions will appear here.</span></div>}
      </article>
    </section>
  );
}
