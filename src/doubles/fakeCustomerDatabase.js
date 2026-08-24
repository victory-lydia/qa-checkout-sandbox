import { ICustomerDatabase } from '../infrastructure/interfaces.js';
import { Customer, Order } from '../domain/models.js';
import { PersistenceError } from '../domain/errors.js';

/**
 * FAKE CustomerDatabase (Test Double)
 *
 * Characteristics of a Fake (Gerard Meszaros / Martin Fowler taxonomy):
 * - Has a working implementation with real in-memory state storage.
 * - Simulates realistic queries, inserts, and consistency checks without external DB servers.
 * - Supports controlled state seeding and simulated persistence failures for testing.
 */
export class FakeCustomerDatabase extends ICustomerDatabase {
  constructor(initialCustomers = []) {
    super();
    this.customers = new Map();
    this.orders = new Map();
    this.shouldFailSave = false;
    this.saveFailureMessage = 'Simulated database write timeout';

    // Seed default or provided customers
    if (initialCustomers.length > 0) {
      this.seedCustomers(initialCustomers);
    } else {
      this.seedDefaultCustomers();
    }
  }

  seedDefaultCustomers() {
    this.saveCustomer(new Customer({
      id: 'cust-101',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      tier: 'STANDARD',
      status: 'ACTIVE',
    }));
    this.saveCustomer(new Customer({
      id: 'cust-102',
      name: 'Bob Smith',
      email: 'bob@example.com',
      tier: 'PRO',
      status: 'ACTIVE',
    }));
    this.saveCustomer(new Customer({
      id: 'cust-103',
      name: 'Carol Suspended',
      email: 'carol@example.com',
      tier: 'STANDARD',
      status: 'SUSPENDED',
    }));
  }

  seedCustomers(customers) {
    for (const c of customers) {
      this.saveCustomer(c);
    }
  }

  saveCustomer(customer) {
    this.customers.set(customer.id, customer);
  }

  async findById(customerId) {
    // Return a clone to prevent external state mutation
    const customer = this.customers.get(customerId);
    if (!customer) return null;
    return new Customer({ ...customer });
  }

  async hasCustomer(customerId) {
    return this.customers.has(customerId);
  }

  async saveOrder(order) {
    if (this.shouldFailSave) {
      throw new PersistenceError(this.saveFailureMessage, { orderId: order.id });
    }

    const clonedOrder = new Order({
      ...order,
      items: order.items.map((it) => ({ ...it })),
    });
    this.orders.set(order.id, clonedOrder);
    return clonedOrder;
  }

  async findOrderById(orderId) {
    const order = this.orders.get(orderId);
    if (!order) return null;
    return new Order({
      ...order,
      items: order.items.map((it) => ({ ...it })),
    });
  }

  // Test control helpers
  setSimulateSaveFailure(shouldFail, message = 'Simulated database write timeout') {
    this.shouldFailSave = shouldFail;
    this.saveFailureMessage = message;
  }

  getAllOrders() {
    return Array.from(this.orders.values());
  }

  reset() {
    this.customers.clear();
    this.orders.clear();
    this.shouldFailSave = false;
    this.seedDefaultCustomers();
  }
}
