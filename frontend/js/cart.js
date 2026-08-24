/**
 * Client-side Shopping Cart Manager backed by localStorage.
 */

const CART_STORAGE_KEY = 'qa_checkout_sandbox_cart';

export const cart = {
  getItems() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  addItem(product, quantity = 1) {
    const qty = parseInt(quantity, 10) || 1;
    if (qty <= 0) return false;

    const items = this.getItems();
    const existingIndex = items.findIndex((it) => it.productId === product.id || it.productId === product.productId);

    if (existingIndex > -1) {
      items[existingIndex].quantity += qty;
    } else {
      items.push({
        productId: product.id || product.productId,
        name: product.name,
        unitPrice: parseFloat(product.price || product.unitPrice),
        quantity: qty,
        stock: product.stock !== undefined ? product.stock : 999,
      });
    }

    this.saveItems(items);
    return true;
  },

  updateQuantity(productId, quantity) {
    const qty = parseInt(quantity, 10);
    let items = this.getItems();

    if (qty <= 0) {
      items = items.filter((it) => it.productId !== productId);
    } else {
      const item = items.find((it) => it.productId === productId);
      if (item) {
        item.quantity = qty;
      }
    }

    this.saveItems(items);
    return items;
  },

  removeItem(productId) {
    const items = this.getItems().filter((it) => it.productId !== productId);
    this.saveItems(items);
    return items;
  },

  clear() {
    localStorage.removeItem(CART_STORAGE_KEY);
    this.updateBadge();
  },

  getSubtotal() {
    return this.getItems().reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  },

  getItemCount() {
    return this.getItems().reduce((count, it) => count + it.quantity, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-count, #cart-count');
    const totalCount = this.getItemCount();
    badges.forEach((b) => {
      b.textContent = totalCount;
      b.style.display = totalCount > 0 ? 'inline-block' : 'none';
    });
  },
};

// Initial badge synchronization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    cart.updateBadge();
  });
}
