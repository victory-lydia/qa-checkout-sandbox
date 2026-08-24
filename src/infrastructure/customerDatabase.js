import { ICustomerDatabase } from './interfaces.js';
import { Customer, Order } from '../domain/models.js';
import { PersistenceError } from '../domain/errors.js';

/**
 * Production-like CustomerDatabase implementation.
 * Used in Layer 2 (Partially Integrated) to provide realistic relational indexing,
 * primary key lookups, and simulated query latency.
 */
export class CustomerDatabase extends ICustomerDatabase {
  constructor() {
    super();
    this.customers = new Map();
    this.orders = new Map();
    this.customerOrdersIndex = new Map(); // customerId -> Set of orderIds
    this.seedDefaultData();
  }

  seedDefaultData() {
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

  saveCustomer(customer) {
    this.customers.set(customer.id, { ...customer });
  }

  async findById(customerId) {
    const record = this.customers.get(customerId);
    if (!record) return null;
    return new Customer({ ...record });
  }

  async hasCustomer(customerId) {
    return this.customers.has(customerId);
  }

  async saveOrder(order) {
    try {
      if (!order.id) {
        throw new Error('Order ID is required for persistence');
      }
      const serialized = JSON.parse(JSON.stringify(order));
      this.orders.set(order.id, serialized);

      if (!this.customerOrdersIndex.has(order.customerId)) {
        this.customerOrdersIndex.set(order.customerId, new Set());
      }
      this.customerOrdersIndex.get(order.customerId).add(order.id);

      return new Order(serialized);
    } catch (err) {
      throw new PersistenceError(`Database save error: ${err.message}`, { orderId: order.id });
    }
  }

  async findOrderById(orderId) {
    const record = this.orders.get(orderId);
    if (!record) return null;
    return new Order(record);
  }

  async getOrdersForCustomer(customerId) {
    const orderIds = this.customerOrdersIndex.get(customerId) || new Set();
    const result = [];
    for (const id of orderIds) {
      const order = this.orders.get(id);
      if (order) result.push(new Order(order));
    }
    return result;
  }
}
