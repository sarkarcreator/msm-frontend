import React, { useState, useEffect, useRef } from 'react';
import { ReceiptText, Printer, FileDown, MessageCircle, Trash2, Plus, X, ShoppingCart, CreditCard, Users, Search, Smartphone, Delete, Keyboard } from 'lucide-react';

export function POSLandscape({ data, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState({ 
    customer_uuid: '', 
    payment_type: 'cash', 
    discount: 0, 
    tax: brand?.tax || 0, 
    paid: '',
    due_date: '' 
  });
  const [showCustomer, setShowCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', phone: '' });
  const [receiptFormat, setReceiptFormat] = useState(brand?.receipt_format || '80mm');
  const [numpadValue, setNumpadValue] = useState('');
  const [activeField, setActiveField] = useState(null);
  
  const searchRef = useRef(null);
  
  // Filter products based on search
  const products = (data.products || []).filter(product => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (product.product_name || '').toLowerCase().includes(q) ||
      (product.barcode || '').toLowerCase().includes(q) ||
      (product.sku || '').toLowerCase().includes(q) ||
      (product.brand || '').toLowerCase().includes(q)
    );
  }).slice(0, 50);

  // Customer options
  const customerOptions = data.customers || [];
  const selectedCustomer = customerOptions.find(c => c.uuid === payment.customer_uuid);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
  const discountAmount = Number(payment.discount) || 0;
  const taxAmount = Number(payment.tax) || 0;
  const total = subtotal - discountAmount + taxAmount;
  const paidAmount = payment.payment_type === 'credit' ? 0 : (Number(payment.paid) || 0);
  const changeReturn = Math.max(0, paidAmount - total);
  const dueAmount = Math.max(0, total - paidAmount);

  // Add product to cart
  function addToCart(product) {
    const cartKey = product.uuid;
    const existing = cart.find(item => item.cart_key === cartKey);
    
    if (existing) {
      setCart(cart.map(item => 
        item.cart_key === cartKey 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        cart_key: cartKey,
        product_uuid: product.uuid,
        product_name: product.product_name || product.name || 'Product',
        quantity: 1,
        price: product.sale_price || product.price || 0,
        stock: product.available_stock || product.stock || 999,
      }]);
    }
  }

  // Update cart item
  function updateCartItem(index, field, value) {
    setCart(cart.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }

  // Remove from cart
  function removeFromCart(cartKey) {
    setCart(cart.filter(item => item.cart_key !== cartKey));
  }

  // Clear cart
  function clearCart() {
    setCart([]);
    setPayment({ customer_uuid: '', payment_type: 'cash', discount: 0, tax: brand?.tax || 0, paid: '', due_date: '' });
    setNumpadValue('');
  }

  // Numpad functions
  function appendToNumpad(digit) {
    setNumpadValue(prev => prev + digit);
  }

  function clearNumpad() {
    setNumpadValue('');
  }

  function backspaceNumpad() {
    setNumpadValue(prev => prev.slice(0, -1));
  }

  function applyNumpadToField() {
    if (activeField === 'discount') {
      setPayment({ ...payment, discount: numpadValue });
    } else if (activeField === 'paid') {
      setPayment({ ...payment, paid: numpadValue });
    } else if (activeField === 'quantity') {
      if (selectedCartIndex !== null && cart[selectedCartIndex]) {
        updateCartItem(selectedCartIndex, 'quantity', parseInt(numpadValue) || 1);
      }
    }
    setNumpadValue('');
    setActiveField(null);
  }

  const [selectedCartIndex, setSelectedCartIndex] = useState(null);

  // Format currency
  function formatMoney(amount) {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1') { e.preventDefault(); clearCart(); }
      if (e.key === 'Escape') { setActiveField(null); }
      if (e.key === 'Enter' && cart.length > 0) { completeSale(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  // Complete sale
  async function completeSale() {
    if (cart.length === 0) return;
    alert('Sale completed! Invoice will be printed.');
    clearCart();
  }

  return (
    <div className="pos-landscape">
      {/* Left Panel - Products */}
      <div className="pos-products-panel">
        <div className="pos-header">
          <h2>🛒 Point of Sale</h2>
          <div className="pos-shortcuts">
            <span><Keyboard size={14} /> F1: Clear</span>
            <span>Enter: Pay</span>
          </div>
        </div>
        
        <div className="pos-search-bar">
          <Search size={20} />
          <input 
            ref={searchRef}
            type="text" 
            placeholder="Search products, barcode, SKU..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && <button onClick={() => setQuery('')}><X size={18} /></button>}
        </div>

        <div className="pos-products-grid">
          {products.map(product => (
            <button 
              key={product.uuid} 
              className="pos-product-card"
              onClick={() => addToCart(product)}
            >
              <div className="product-icon">
                <Smartphone size={28} />
              </div>
              <div className="product-info">
                <span className="product-name">{product.product_name || product.name}</span>
                <span className="product-sku">{product.barcode || product.sku || 'No SKU'}</span>
              </div>
              <div className="product-price">{formatMoney(product.sale_price || product.price)}</div>
              <div className="product-stock">Stock: {product.available_stock || product.stock || '∞'}</div>
            </button>
          ))}
          
          {products.length === 0 && (
            <div className="pos-empty">
              <Search size={48} />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="pos-cart-panel">
        {/* Customer Selection */}
        <div className="pos-customer-bar">
          <select 
            value={payment.customer_uuid} 
            onChange={(e) => setPayment({ ...payment, customer_uuid: e.target.value })}
          >
            <option value="">👤 Walk-in Customer</option>
            {customerOptions.map(c => (
              <option key={c.uuid} value={c.uuid}>
                {c.name} {c.phone ? `- ${c.phone}` : ''}
              </option>
            ))}
          </select>
          <button className="icon-btn" onClick={() => setShowCustomer(true)} title="Add Customer">
            <Plus size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <ShoppingCart size={48} />
              <p>Cart is empty</p>
              <small>Click products to add</small>
            </div>
          ) : (
            cart.map((item, index) => (
              <div 
                key={item.cart_key} 
                className={`pos-cart-item ${selectedCartIndex === index ? 'selected' : ''}`}
                onClick={() => setSelectedCartIndex(index)}
              >
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.product_name}</span>
                  <span className="cart-item-price">{formatMoney(item.price)} each</span>
                </div>
                <div className="cart-item-qty">
                  <button onClick={(e) => { e.stopPropagation(); updateCartItem(index, 'quantity', Math.max(1, item.quantity - 1)); }}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); updateCartItem(index, 'quantity', item.quantity + 1); }}>+</button>
                </div>
                <div className="cart-item-total">{formatMoney(item.quantity * item.price)}</div>
                <button className="cart-item-remove" onClick={(e) => { e.stopPropagation(); removeFromCart(item.cart_key); }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="pos-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="summary-row discount-row">
            <button 
              className={activeField === 'discount' ? 'active' : ''} 
              onClick={() => setActiveField(activeField === 'discount' ? null : 'discount')}
            >
              Discount
            </button>
            <span>{formatMoney(discountAmount)}</span>
          </div>
          <div className="summary-row">
            <span>Tax</span>
            <span>{formatMoney(taxAmount)}</span>
          </div>
          <div className="summary-row total-row">
            <span>TOTAL</span>
            <span className="total-amount">{formatMoney(total)}</span>
          </div>
        </div>

        {/* Numpad */}
        <div className="pos-numpad">
          <div className="numpad-display">
            <input 
              type="text" 
              value={numpadValue} 
              readOnly 
              placeholder={activeField === 'discount' ? 'Discount' : activeField === 'paid' ? 'Paid Amount' : '0'}
            />
          </div>
          <div className="numpad-buttons">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
              <button key={num} onClick={() => appendToNumpad(String(num))}>{num}</button>
            ))}
            <button onClick={clearNumpad} className="numpad-clear">C</button>
            <button onClick={backspaceNumpad} className="numpad-back">⌫</button>
            <button onClick={applyNumpadToField} className="numpad-enter">OK</button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pos-quick-actions">
          <select 
            value={payment.payment_type} 
            onChange={(e) => setPayment({ ...payment, payment_type: e.target.value })}
          >
            <option value="cash">💵 Cash</option>
            <option value="credit">📋 Credit</option>
            <option value="card">💳 Card</option>
          </select>
          
          <button 
            className={activeField === 'paid' ? 'active' : ''}
            onClick={() => setActiveField(activeField === 'paid' ? null : 'paid')}
          >
            Paid: {formatMoney(paidAmount)}
          </button>

          {changeReturn > 0 && (
            <div className="change-return">
              Change: {formatMoney(changeReturn)}
            </div>
          )}

          {dueAmount > 0 && payment.payment_type !== 'credit' && (
            <div className="due-amount">
              Due: {formatMoney(dueAmount)}
            </div>
          )}
        </div>

        {/* Payment Buttons */}
        <div className="pos-payment-buttons">
          <button className="btn-clear" onClick={clearCart}>
            <Trash2 size={20} /> Clear
          </button>
          <button className="btn-print" disabled={cart.length === 0}>
            <Printer size={20} /> Print
          </button>
          <button className="btn-complete" onClick={completeSale} disabled={cart.length === 0}>
            <CreditCard size={20} /> Complete Sale
          </button>
        </div>

        {/* Receipt Format */}
        <div className="pos-receipt-format">
          <select value={receiptFormat} onChange={(e) => setReceiptFormat(e.target.value)}>
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
            <option value="a4">A4</option>
          </select>
        </div>
      </div>

      {/* Quick Customer Modal */}
      {showCustomer && (
        <div className="pos-modal-overlay" onClick={() => setShowCustomer(false)}>
          <div className="pos-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Add Customer</h3>
              <button onClick={() => setShowCustomer(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <input 
                placeholder="Customer Name" 
                value={quickCustomer.name}
                onChange={(e) => setQuickCustomer({ ...quickCustomer, name: e.target.value })}
              />
              <input 
                placeholder="Phone Number" 
                value={quickCustomer.phone}
                onChange={(e) => setQuickCustomer({ ...quickCustomer, phone: e.target.value })}
              />
            </div>
            <div className="modal-footer">
              <button className="ghost-btn" onClick={() => setShowCustomer(false)}>Cancel</button>
              <button className="primary-btn" onClick={() => setShowCustomer(false)}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSLandscape;
