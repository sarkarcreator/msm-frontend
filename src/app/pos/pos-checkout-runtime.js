const ROOT_ID = 'dsh-pos-checkout-runtime-root';
const STYLE_ID = 'dsh-pos-checkout-runtime-style';

const textOf = (node) => String(node?.textContent || '').trim().toLowerCase();

function findButton(terms) {
  return [...document.querySelectorAll('button, [role="button"]')].find((node) => terms.some((term) => textOf(node).includes(term)));
}

function clickExisting(terms) {
  const target = findButton(terms);
  if (!target) return false;
  target.click();
  return true;
}

function findLabelInput(labelText) {
  const label = [...document.querySelectorAll('label')].find((node) => textOf(node).startsWith(labelText.toLowerCase()));
  return label?.querySelector('input, select, textarea') || null;
}

function findPaymentMethod() {
  return [...document.querySelectorAll('select')].find((node) => {
    const label = node.closest('label');
    return label && textOf(label).startsWith('payment');
  }) || null;
}

function setNativeValue(element, value) {
  if (!element) return false;
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function isPosVisible() {
  const bodyText = textOf(document.body);
  return ['sales pos', 'modern pos', 'quick cart', 'point of sale'].some((marker) => bodyText.includes(marker))
    && !!document.querySelector('[data-product-search], .pos-cart-lines');
}

function readSummary() {
  const rows = [...document.querySelectorAll('.payment-summary span')];
  return rows.map((row) => ({ label: row.childNodes[0]?.textContent?.trim() || '', value: row.querySelector('strong')?.textContent?.trim() || '' }));
}

function readCartTotal() {
  const totalRow = readSummary().find((row) => row.label.toLowerCase().includes('grand total'));
  return totalRow?.value || document.querySelector('.payment-summary span:nth-child(4) strong')?.textContent?.trim() || '0';
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:18px;bottom:18px;z-index:1600;font-family:inherit}
    .dsh-checkout-launch{min-height:54px;padding:0 20px;border:0;border-radius:16px;background:#0f766e;color:#fff;font-weight:800;font-size:15px;box-shadow:0 14px 34px rgba(15,118,110,.28);display:flex;align-items:center;gap:10px;cursor:pointer}
    .dsh-checkout-launch strong{font-size:17px}
    .dsh-checkout-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.34);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:flex-end;padding:18px;z-index:1599}
    .dsh-checkout-card{width:min(430px,calc(100vw - 28px));max-height:min(760px,calc(100vh - 36px));overflow:auto;background:#fff;border:1px solid rgba(15,23,42,.09);border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.25);padding:18px}
    .dsh-checkout-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    .dsh-checkout-head small{display:block;color:#64748b;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .dsh-checkout-head h3{margin:3px 0 0;font-size:21px;color:#0f172a}
    .dsh-checkout-close{width:44px;height:44px;border:0;border-radius:12px;background:#f1f5f9;color:#334155;font-size:20px;cursor:pointer}
    .dsh-checkout-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .dsh-checkout-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#334155}
    .dsh-checkout-field.full{grid-column:1/-1}
    .dsh-checkout-field select,.dsh-checkout-field input{min-height:50px;border:1px solid #cbd5e1;border-radius:13px;padding:0 13px;font:inherit;font-size:15px;background:#fff;color:#0f172a}
    .dsh-checkout-summary{margin:14px 0;padding:13px;border-radius:16px;background:#f8fafc;display:grid;gap:8px}
    .dsh-checkout-summary-row{display:flex;justify-content:space-between;gap:10px;color:#475569;font-size:13px}
    .dsh-checkout-summary-row.total{padding-top:8px;border-top:1px solid #e2e8f0;color:#0f172a;font-weight:900;font-size:18px}
    .dsh-checkout-summary-row.result{color:#0f766e;font-weight:900}
    .dsh-checkout-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .dsh-checkout-actions button{min-height:52px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;padding:0 12px}
    .dsh-checkout-actions .primary{grid-column:1/-1;background:#0f766e;color:#fff;font-size:16px}
    .dsh-checkout-actions .secondary{background:#e2e8f0;color:#0f172a}
    .dsh-checkout-actions .danger{background:#fee2e2;color:#991b1b}
    .dsh-checkout-note{margin-top:10px;text-align:center;color:#64748b;font-size:11px}
    @media(max-width:640px){#${ROOT_ID}{right:10px;bottom:10px}.dsh-checkout-launch{width:calc(100vw - 20px);justify-content:center}.dsh-checkout-backdrop{padding:10px}.dsh-checkout-card{width:100%;max-height:calc(100vh - 20px);border-radius:20px}.dsh-checkout-grid{grid-template-columns:1fr}.dsh-checkout-field.full{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

function buildField(label, control) {
  const wrapper = document.createElement('label');
  wrapper.className = 'dsh-checkout-field';
  wrapper.textContent = label;
  wrapper.appendChild(control);
  return wrapper;
}

function makeControl(source, type = 'input') {
  const control = document.createElement(type === 'select' ? 'select' : 'input');
  control.className = 'dsh-checkout-control';
  if (source) {
    if (type === 'select') {
      [...source.options].forEach((option) => {
        const clone = document.createElement('option');
        clone.value = option.value;
        clone.textContent = option.textContent;
        control.appendChild(clone);
      });
    } else {
      control.type = source.type || 'number';
      control.step = source.step || '0.01';
      control.min = source.min || '0';
    }
    control.value = source.value;
  }
  return control;
}

function openCheckout() {
  if (!isPosVisible()) return;
  const existing = document.querySelector('.dsh-checkout-backdrop');
  if (existing) return;

  const customerSource = document.querySelector('[data-customer-select]');
  const paymentSource = findPaymentMethod();
  const discountSource = findLabelInput('discount');
  const paidSource = document.querySelector('[data-paid-input]');

  const backdrop = document.createElement('div');
  backdrop.className = 'dsh-checkout-backdrop';
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop.remove(); });

  const card = document.createElement('section');
  card.className = 'dsh-checkout-card';

  const head = document.createElement('div');
  head.className = 'dsh-checkout-head';
  head.innerHTML = '<div><small>TOUCH CHECKOUT</small><h3>Complete Sale</h3></div>';
  const close = document.createElement('button');
  close.className = 'dsh-checkout-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close checkout');
  close.onclick = () => backdrop.remove();
  head.appendChild(close);
  card.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'dsh-checkout-grid';

  const customer = makeControl(customerSource, 'select');
  customer.onchange = () => setNativeValue(customerSource, customer.value);
  if (!customerSource) {
    const option = document.createElement('option');
    option.textContent = 'POS customer selector unavailable';
    customer.appendChild(option);
    customer.disabled = true;
  }
  const customerField = buildField(customerSource ? (customerSource.closest('label')?.childNodes[0]?.textContent?.trim() || 'Customer') : 'Customer', customer);
  customerField.classList.add('full');
  grid.appendChild(customerField);

  const payment = makeControl(paymentSource, 'select');
  payment.onchange = () => setNativeValue(paymentSource, payment.value);
  grid.appendChild(buildField('Payment Method', payment));

  const discount = makeControl(discountSource);
  discount.oninput = () => setNativeValue(discountSource, discount.value);
  grid.appendChild(buildField('Discount', discount));

  const paid = makeControl(paidSource);
  paid.oninput = () => setNativeValue(paidSource, paid.value);
  grid.appendChild(buildField('Paid Amount', paid));

  card.appendChild(grid);

  const summary = document.createElement('div');
  summary.className = 'dsh-checkout-summary';
  const summaryRows = new Map();
  ['Subtotal', 'Discount', 'Tax', 'Grand Total', 'Paid Amount', 'Change Return', 'Due Amount'].forEach((label) => {
    const row = document.createElement('div');
    row.className = `dsh-checkout-summary-row ${label === 'Grand Total' ? 'total' : ''}`;
    row.innerHTML = `<span>${label}</span><strong>0</strong>`;
    summaryRows.set(label.toLowerCase(), row.querySelector('strong'));
    summary.appendChild(row);
  });
  card.appendChild(summary);

  const actions = document.createElement('div');
  actions.className = 'dsh-checkout-actions';
  const action = (label, terms, className = 'secondary') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.onclick = () => {
      if (!clickExisting(terms)) return;
      if (label === 'Complete Sale') window.setTimeout(() => backdrop.remove(), 500);
    };
    return button;
  };
  actions.appendChild(action('Complete Sale', ['complete sale'], 'primary'));
  actions.appendChild(action('Print Bill', ['print bill', 'invoice'], 'secondary'));
  actions.appendChild(action('PDF Bill', ['pdf bill'], 'secondary'));
  actions.appendChild(action('WhatsApp Bill', ['whatsapp bill'], 'secondary'));
  actions.appendChild(action('Clear Cart', ['clear cart'], 'danger'));
  card.appendChild(actions);

  const note = document.createElement('div');
  note.className = 'dsh-checkout-note';
  note.textContent = `Using existing POS sale engine · Current cart total: Rs ${readCartTotal()}`;
  card.appendChild(note);

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  const refresh = () => {
    const rows = readSummary();
    rows.forEach(({ label, value }) => {
      const target = summaryRows.get(label.toLowerCase());
      if (target) target.textContent = value;
    });
    note.textContent = `Using existing POS sale engine · Current cart total: Rs ${readCartTotal()}`;
    if (customerSource) customer.value = customerSource.value;
    if (paymentSource) payment.value = paymentSource.value;
    if (discountSource) discount.value = discountSource.value;
    if (paidSource) paid.value = paidSource.value;
  };
  refresh();
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
  const timer = window.setInterval(refresh, 350);
  backdrop.addEventListener('remove', () => { observer.disconnect(); window.clearInterval(timer); });
}

function mount() {
  ensureStyle();
  if (document.getElementById(ROOT_ID)) return;
  const root = document.createElement('div');
  root.id = ROOT_ID;
  document.body.appendChild(root);
  const render = () => {
    if (!isPosVisible()) {
      root.innerHTML = '';
      document.querySelector('.dsh-checkout-backdrop')?.remove();
      return;
    }
    if (!root.querySelector('button')) {
      const launch = document.createElement('button');
      launch.className = 'dsh-checkout-launch';
      launch.type = 'button';
      launch.innerHTML = '<span>💳</span><span><strong>Checkout</strong><br><small>Touch Payment</small></span>';
      launch.onclick = openCheckout;
      root.appendChild(launch);
    }
  };
  render();
  const observer = new MutationObserver(render);
  observer.observe(document.body, { childList: true, subtree: true });
  window.setInterval(render, 700);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
