import React, { useEffect, useMemo, useState } from 'react';
import { Barcode, CreditCard, Minus, Plus, Search, ShoppingCart, Trash2, UserPlus, PackagePlus, ReceiptText, RefreshCw, X } from 'lucide-react';
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

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount);
}

function parseMoney(value) {
  const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function readCartFromExistingPos() {
  return [...document.querySelectorAll('.pos-cart-lines .pos-cart-line')].map((node, index) => {
    const title = node.querySelector('.pos-cart-title strong')?.textContent?.trim() || `Item ${index + 1}`;
    const qty = Number(node.querySelector('.qty-stepper input')?.value || 1);
    const stock = node.querySelector('.pos-cart-title span')?.textContent?.trim() || '';
    const totalText = node.querySelector('.line-total')?.textContent || '0';
    return { key: `cart-${index}-${title}`, title, qty, stock, total: parseMoney(totalText), node };
  });
}

function PosRuntime() {
  const [visible, setVisible] = useState(isPosVisible());
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const refresh = () => {
      setVisible(isPosVisible());
      if (isPosVisible()) setCart(readCartFromExistingPos());
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    const timer = window.setInterval(refresh, 500);
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
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  if (!visible) return null;

  const flash = (label, fn) => {
    const ok = fn();
    setMessage(ok ? label : `${label} is available inside POS`);
    window.setTimeout(() => setMessage(''), 1800);
  };

  const chooseProduct = (product) => {
    const value = productCode(product) || productName(product);
    flash(`${productName(product)} added`, () => focusSearch(value, true));
  };

  const clickCartControl = (row, selector) => {
    const target = row.node?.querySelector(selector);
    if (!target) return false;
    target.click();
    window.setTimeout(() => setCart(readCartFromExistingPos()), 80);
    return true;
  };

  return (
    <div className="dsh-pos-runtime" data-business={business}>
      <div className="dsh-pos-runtime__top">
        <div>
          <span className="dsh-pos-runtime__eyebrow">TOUCH POS</span>
          <strong>Fast Sale Workspace</strong>
        </div>
        <button className="dsh-pos-runtime__scan" onClick={() => flash('Barcode search ready', () => focusSearch())}>
          <Barcode size={20} /> Scan / Barcode
        </button>
      </div>

      <div className="dsh-pos-runtime__search">
        <Search size={22} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') flash('Product search', () => focusSearch(search, true)); }}
          placeholder="Search product, barcode, SKU, IMEI..."
          aria-label="POS product search"
        />
        {search && <button className="dsh-pos-runtime__clear" aria-label="Clear product search" onClick={() => setSearch('')}><X size={18} /></button>}
        <button onClick={() => flash('Product search', () => focusSearch(search, true))}>Search</button>
      </div>

      <div className="dsh-pos-runtime__cart" aria-label="Live touch cart">
        <div className="dsh-pos-runtime__section-head">
          <div><strong><ShoppingCart size={16} /> Live Cart</strong><span>{cart.length} line{cart.length === 1 ? '' : 's'}</span></div>
          <b>Rs {money(cartTotal)}</b>
        </div>
        {cart.length ? (
          <div className="dsh-pos-runtime__cart-list">
            {cart.map((row) => (
              <div className="dsh-pos-runtime__cart-row" key={row.key}>
                <div className="dsh-pos-runtime__cart-info">
                  <strong>{row.title}</strong>
                  <small>{row.stock}</small>
                </div>
                <div className="dsh-pos-runtime__cart-controls">
                  <button aria-label={`Decrease ${row.title}`} onClick={() => clickCartControl(row, '.qty-stepper button:first-child')}><Minus size={16} /></button>
                  <b>{row.qty}</b>
                  <button aria-label={`Increase ${row.title}`} onClick={() => clickCartControl(row, '.qty-stepper button:last-child')}><Plus size={16} /></button>
                  <button className="remove" aria-label={`Remove ${row.title}`} onClick={() => clickCartControl(row, '.pos-remove')}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="dsh-pos-runtime__cart-empty">Cart empty — tap a product below to start the sale.</div>}
      </div>

      <div className="dsh-pos-runtime__products" aria-label="Touch product shortcuts">
        <div className="dsh-pos-runtime__section-head">
          <div><strong>Quick Products</strong><span>{loadingProducts ? 'Loading...' : `${filteredProducts.length} available`}</span></div>
          <small>Tap a product to add it through the existing POS workflow</small>
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
          <button key={id} onClick={() => flash(label, () => clickExisting(terms))}>
            <Icon size={22} /> <span>{label}</span>
          </button>
        ))}
        <button onClick={() => flash('Refreshing POS', () => { window.dispatchEvent(new CustomEvent('msm:dashboard-refresh')); window.location.reload(); return true; })}>
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