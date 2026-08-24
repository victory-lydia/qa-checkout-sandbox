import { IInventoryService } from './interfaces.js';
import { OutOfStockError } from '../domain/errors.js';

/**
 * Production-like InventoryService with concurrency protection.
 * Implements atomic check-and-decrement semantics to prevent overselling.
 */
export class InventoryService extends IInventoryService {
  constructor(initialStock = {}) {
    super();
    this.stock = new Map();
    this.locks = new Map(); // productId -> Promise chain for mutex simulation

    // Default catalog
    this.stock.set('prod-in-stock', 100);
    this.stock.set('prod-laptop', 50);
    this.stock.set('prod-keyboard', 50);
    this.stock.set('prod-low-stock', 2);
    this.stock.set('prod-last-one', 1);
    this.stock.set('prod-out-of-stock', 0);

    for (const [key, qty] of Object.entries(initialStock)) {
      this.stock.set(key, qty);
    }
  }

  // Mutex lock helper for simulating atomic row-level database locks
  async _withLock(productId, fn) {
    const currentLock = this.locks.get(productId) || Promise.resolve();
    let release;
    const nextLock = new Promise((resolve) => {
      release = resolve;
    });
    this.locks.set(productId, nextLock);

    await currentLock;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  async getStock(productId) {
    return this.stock.get(productId) ?? 0;
  }

  async checkStock(productId, quantity) {
    const available = await this.getStock(productId);
    return available >= quantity;
  }

  async reserveStock(productId, quantity) {
    return this._withLock(productId, async () => {
      const available = this.stock.get(productId) ?? 0;
      if (available < quantity) {
        throw new OutOfStockError(productId, quantity, available);
      }

      this.stock.set(productId, available - quantity);
      return `res_${productId}_${Date.now()}`;
    });
  }

  async releaseStock(productId, quantity) {
    return this._withLock(productId, async () => {
      const current = this.stock.get(productId) ?? 0;
      this.stock.set(productId, current + quantity);
    });
  }

  setStock(productId, quantity) {
    this.stock.set(productId, quantity);
  }
}
