import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Barcode, CreditCard, Search, UserPlus, PackagePlus, ShoppingCart, ReceiptText, RefreshCw } from 'lucide-react';
import './pos-runtime.css';

const ACTIONS = [
  { id: 'customer', label: 'Customer', icon: UserPlus, terms: ['customer', 'new customer', 'add customer'] },
  { id: 'product', label: 'Add Product', icon: PackagePlus, terms: ['add product', 'new product'] },
  { id: 'payment', label: 'Payment', icon: CreditCard, terms: ['payment', 'checkout', 'pay', 'complete sale'] },
  { id: 'receipt', label: 'Receipt', icon: ReceiptText, terms: ['receipt', 'print receipt'] },
];

function textOf(node) { return String(node?.textContent || '').trim().toLowerCase(); }

function findButton(terms) {
  const nodes = [...document.querySelectorAll('button, [role="button"]')];
  return nodes.find((node) => terms.some((term) => textOf(node).includes(term)));
}

function clickExisting(terms) {
  const target = findButton(terms);
  if (target) { target.click(); return true; }
  return false;
}

function findSearchInput() {
  const inputs = [...document.querySelectorAll('input:not([type="hidden"]), textarea')];
  return inputs.find((input) => {
    const haystack = `${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${input.name || ''}`.toLowerCase();
    return /search|barcode|product|item|sku|imei|code/.test(haystack);
  });
}

function focusSearch(value = '') {
  const input = findSearchInput();
  if (!input) return false;
  input.focus();
  if (value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}

function isPosVisible() {
  const body = document.body;
  const activeText = textOf(body);
  const markers = ['sales pos', 'point of sale', 'shopping cart'];
  return markers.some((marker) => activeText.includes(marker)) && !!findSearchInput();
}

function PosRuntime() {
  const [visible, setVisible] = useState(isPosVisible());
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refresh = () => setVisible(isPosVisible());
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const timer = window.setInterval(refresh, 1000);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);

  const business = useMemo(() => localStorage.getItem('dsh_business_type') || 'Business', []);
  if (!visible) return null;

  const run = (label, fn) => {
    const ok = fn();
    setMessage(ok ? `${label} opened` : `${label} is available inside POS`);
    window.setTimeout(() => setMessage(''), 1800);
  };

  return (
    <div className="dsh-pos-runtime" data-business={business}>
      <div className="dsh-pos-runtime__top">
        <div>
          <span className="dsh-pos-runtime__eyebrow">TOUCH POS</span>
          <strong>Fast Sale Workspace</strong>
        </div>
        <button className="dsh-pos-runtime__scan" onClick={() => run('Barcode search', () => focusSearch())}>
          <Barcode size={20} /> Scan / Barcode
        </button>
      </div>
      <div className="dsh-pos-runtime__search">
        <Search size={22} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') run('Product search', () => focusSearch(search)); }}
          placeholder="Search product, barcode, SKU, IMEI..."
          aria-label="POS product search"
        />
        <button onClick={() => run('Product search', () => focusSearch(search))}>Search</button>
      </div>
      <div className="dsh-pos-runtime__actions">
        {ACTIONS.map(({ id, label, icon: Icon, terms }) => (
          <button key={id} onClick={() => run(label, () => clickExisting(terms))}>
            <Icon size={22} /> <span>{label}</span>
          </button>
        ))}
        <button onClick={() => run('Refresh', () => { window.dispatchEvent(new CustomEvent('msm:dashboard-refresh')); window.location.reload(); return true; })}>
          <RefreshCw size={22} /> <span>Refresh</span>
        </button>
      </div>
      {message && <div className="dsh-pos-runtime__message">{message}</div>}
    </div>
  );
}

const mount = () => {
  if (document.getElementById('dsh-pos-runtime-root')) return;
  const root = document.createElement('div');
  root.id = 'dsh-pos-runtime-root';
  document.body.appendChild(root);
  createRoot(root).render(<PosRuntime />);
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
