import React, { useEffect, useMemo, useState } from 'react';
import { Barcode, CreditCard, Search, UserPlus, PackagePlus, ShoppingCart, ReceiptText, RefreshCw, X } from 'lucide-react';
import { listRecords } from '../../lib/db.js';
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

function focusSearch(value = '', submit = false) {
  const input = findSearchInput();
  if (!input) return false;
  input.focus();
  if (value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (submit) input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', code: 'Enter' }));
  return true;
}

function isPosVisible() {
  const body = document.body;
  const activeText = textOf(body);
  const markers = ['sales pos', 'point of sale', 'shopping cart'];
  return markers.some((marker) => activeText.includes(marker)) && !!findSearchInput();
}

function productName(product = {}) {
  return product.product_name || product.name || product.brand_name || product.generic_name || product.model || 'Product';
}

function productCode(product = {}) {
  return product.barcode || product.secondary_barcode || product.qr_code || product.sku || product.product_code || product.imei || '';
}

function productMatches(product, query) {
  const haystack = [productName(product), product.brand, product.category, product.barcode, product.secondary_barcode, product.qr_code, product.sku, product.product_code, product.imei, product.model]
    .map((value) => String(value || '').toLowerCase()).join(' ');
  return !query || haystack.includes(query.toLowerCase());
}

function PosRuntime() {
  const [visible, setVisible] = useState(isPosVisible());
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const refresh = () => setVisible(isPosVisible());
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const timer = window.setInterval(refresh, 1000);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    setLoadingProducts(true);
    listRecords('products').then((rows) => {
      if (!cancelled) setProducts(rows.filter((row) => Number(row.quantity || 0) > 0).slice(0, 80));
    }).catch(() => {
      if (!cancelled) setProducts([]);
    }).finally(() => {
      if (!cancelled) setLoadingProducts(false);
    });
    return () => { cancelled = true; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
      }
      if (event.key === 'F2') {
        event.preventDefault();
        focusSearch();
      }
      if (event.key === 'Escape') setSearch('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  const business = useMemo(() => localStorage.getItem('dsh_business_type') || 'Business', []);
  const filteredProducts = useMemo(() => products.filter((product) => productMatches(product, search)).slice(0, 12), [products, search]);

  if (!visible) return null;

  const run = (label, fn) => {
    const ok = fn();
    setMessage(ok ? `${label} opened` : `${label} is available inside POS`);
    window.setTimeout(() => setMessage(''), 1800);
  };

  const chooseProduct = (product) => {
    const value = productCode(product) || productName(product);
    run(productName(product), () => focusSearch(value, true));
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
          onKeyDown={(event) => { if (event.key === 'Enter') run('Product search', () => focusSearch(search, true)); }}
          placeholder="Search product, barcode, SKU, IMEI..."
          aria-label="POS product search"
        />
        {search && <button className="dsh-pos-runtime__clear" aria-label="Clear product search" onClick={() => setSearch('')}><X size={18} /></button>}
        <button onClick={() => run('Product search', () => focusSearch(search, true))}>Search</button>
      </div>

      <div className="dsh-pos-runtime__products" aria-label="Touch product shortcuts">
        <div className="dsh-pos-runtime__section-head">
          <div><strong>Quick Products</strong><span>{loadingProducts ? 'Loading...' : `${filteredProducts.length} available`}</span></div>
          <small>Tap a product to add it through the existing POS search</small>
        </div>
        {filteredProducts.length ? (
          <div className="dsh-pos-runtime__product-grid">
            {filteredProducts.map((product) => (
              <button key={product.uuid || productCode(product) || productName(product)} className="dsh-pos-runtime__product-card" onClick={() => chooseProduct(product)}>
                <span className="dsh-pos-runtime__product-icon"><ShoppingCart size={19} /></span>
                <strong>{productName(product)}</strong>
                <span>{product.brand || product.category || 'Product'}</span>
                <b>{Number(product.quantity || 0)} in stock</b>
              </button>
            ))}
          </div>
        ) : (
          <div className="dsh-pos-runtime__empty">Search above to find products, or use Scan / Barcode.</div>
        )}
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