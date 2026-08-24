import { api } from './api.js';
import { cart } from './cart.js';

export async function initProductsPage() {
  const grid = document.getElementById('products-grid');
  const alertContainer = document.getElementById('alert-container');

  if (!grid) return;

  try {
    grid.innerHTML = '<div class="alert alert-info">Loading available products...</div>';
    const products = await api.getProducts();

    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="alert alert-warning">No products currently available in inventory.</div>';
      return;
    }

    grid.innerHTML = '';
    for (const prod of products) {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.setAttribute('data-product-id', prod.id);

      let stockBadgeClass = 'badge-success';
      let stockLabel = `${prod.stock} In Stock`;

      if (prod.stock === 0) {
        stockBadgeClass = 'badge-danger';
        stockLabel = 'Out of Stock';
      } else if (prod.stock <= 2) {
        stockBadgeClass = 'badge-warning';
        stockLabel = `Only ${prod.stock} Left!`;
      }

      card.innerHTML = `
        <div>
          <div class="product-category">${prod.category || 'General'}</div>
          <div class="product-header">
            <h3 class="product-name">${prod.name}</h3>
            <span class="badge ${stockBadgeClass}">${stockLabel}</span>
          </div>
          <p class="product-desc">${prod.description}</p>
        </div>
        <div class="product-footer">
          <div class="product-price">$${prod.price.toFixed(2)}</div>
          <button class="btn btn-primary add-to-cart-btn" data-id="${prod.id}" ${prod.stock === 0 ? 'disabled' : ''}>
            ${prod.stock === 0 ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      `;

      grid.appendChild(card);
    }

    // Attach Add-to-Cart event listeners
    grid.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const prod = products.find((p) => p.id === id);
        if (prod) {
          cart.addItem(prod, 1);
          showAlert(`Added "${prod.name}" to cart!`, 'success');
        }
      });
    });
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-danger">Error loading products: ${err.message}</div>`;
  }

  function showAlert(msg, type = 'info') {
    if (!alertContainer) return;
    alertContainer.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(() => {
      if (alertContainer) alertContainer.innerHTML = '';
    }, 3000);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initProductsPage();
  });
}
