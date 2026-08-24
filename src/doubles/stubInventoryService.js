import { IInventoryService } from '../infrastructure/interfaces.js';
import { OutOfStockError } from '../domain/errors.js';

/**
 * STUB InventoryService (Test Double)
 *
 * Characteristics of a Stub (Gerard Meszaros / Martin Fowler taxonomy):
 * - State-verification / indirect-input focused.
 * - Provides pre-canned, controlled answers to incoming inventory queries.
 * - Returns deterministic stock responses without external warehouse systems.
 */
export class StubInventoryService extends IInventoryService {
  constructor(initialStock = {}) {
    super();
    this.stock = new Map();
    this.reservations = new Map(); // reservationKey -> { productId, quantity }

    // Seed default items
    this.stock.set('prod-in-stock', 100);
    this.stock.set('prod-laptop', 50);
    this.stock.set('prod-keyboard', 50);
    this.stock.set('prod-low-stock', 2);
    this.stock.set('prod-last-one', 1);
    this.stock.set('prod-out-of-stock', 0);

    // Apply any initial custom stock overrides
    for (const [key, qty] of Object.entries(initialStock)) {
      this.stock.set(key, qty);
    }
  }

  setStock(productId, quantity) {
    this.stock.set(productId, quantity);
  }

  async getStock(productId) {
    if (!this.stock.has(productId)) {
      return 0;
    }
    return this.stock.get(productId);
  }

  async checkStock(productId, quantity) {
    const available = await this.getStock(productId);
    return available >= quantity;
  }

  async reserveStock(productId, quantity) {
    const available = await this.getStock(productId);
    if (available < quantity) {
      throw new OutOfStockError(productId, quantity, available);
    }

    // Atomic decrement in-memory
    this.stock.set(productId, available - quantity);
    const reservationId = `res_${productId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.reservations.set(reservationId, { productId, quantity });
    return reservationId;
  }

  async releaseStock(productId, quantity) {
    const current = await this.getStock(productId);
    this.stock.set(productId, current + quantity);
  }

  reset() {
    this.stock.clear();
    this.reservations.clear();
    this.stock.set('prod-in-stock', 100);
    this.stock.set('prod-laptop', 50);
    this.stock.set('prod-keyboard', 50);
    this.stock.set('prod-low-stock', 2);
    this.stock.set('prod-last-one', 1);
    this.stock.set('prod-out-of-stock', 0);
  }
}
