import { cart } from './cart.js';

export function renderCartPage() {
  const tableBody = document.getElementById('cart-items-body');
  const emptyState = document.getElementById('cart-empty-state');
  const cartContent = document.getElementById('cart-content');
  const subtotalElem = document.getElementById('cart-subtotal');
  const estTaxElem = document.getElementById('cart-est-tax');
  const estTotalElem = document.getElementById('cart-est-total');

  if (!tableBody) return;

  const items = cart.getItems();

  if (items.length === 0) {
    if (cartContent) cartContent.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (cartContent) cartContent.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';

  tableBody.innerHTML = '';
  let subtotal = 0;

  for (const item of items) {
    const itemSubtotal = item.unitPrice * item.quantity;
    subtotal += itemSubtotal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <strong>${item.name}</strong><br>
        <small style="color: #94a3b8;">SKU: ${item.productId}</small>
      </td>
      <td>$${item.unitPrice.toFixed(2)}</td>
      <td>
        <div class="qty-control">
          <button class="qty-btn btn-dec" data-id="${item.productId}" aria-label="Decrease quantity">−</button>
          <input type="number" class="qty-input" data-id="${item.productId}" value="${item.quantity}" min="1" max="50">
          <button class="qty-btn btn-inc" data-id="${item.productId}" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td><strong>$${itemSubtotal.toFixed(2)}</strong></td>
      <td>
        <button class="btn btn-danger btn-sm btn-remove" data-id="${item.productId}">Remove</button>
      </td>
    `;
    tableBody.appendChild(row);
  }

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  if (subtotalElem) subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
  if (estTaxElem) estTaxElem.textContent = `$${tax.toFixed(2)}`;
  if (estTotalElem) estTotalElem.textContent = `$${total.toFixed(2)}`;

  // Attach quantity and removal listeners
  tableBody.querySelectorAll('.btn-inc').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const current = items.find((it) => it.productId === id);
      if (current) {
        cart.updateQuantity(id, current.quantity + 1);
        renderCartPage();
      }
    });
  });

  tableBody.querySelectorAll('.btn-dec').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const current = items.find((it) => it.productId === id);
      if (current && current.quantity > 1) {
        cart.updateQuantity(id, current.quantity - 1);
        renderCartPage();
      }
    });
  });

  tableBody.querySelectorAll('.qty-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      const val = parseInt(e.target.value, 10) || 1;
      cart.updateQuantity(id, Math.max(1, val));
      renderCartPage();
    });
  });

  tableBody.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      cart.removeItem(id);
      renderCartPage();
    });
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    renderCartPage();

    const clearBtn = document.getElementById('btn-clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        cart.clear();
        renderCartPage();
      });
    }
  });
}
