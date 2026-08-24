/**
 * Domain models for the QA Checkout Sandbox.
 */

export class Customer {
  constructor({ id, name, email, tier = 'STANDARD', status = 'ACTIVE' }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.tier = tier; // 'STANDARD' | 'PRO' | 'VIP'
    this.status = status; // 'ACTIVE' | 'SUSPENDED'
  }
}

export class OrderItem {
  constructor({ productId, name, unitPrice, quantity }) {
    if (!productId || typeof productId !== 'string') {
      throw new Error('OrderItem: productId is required');
    }
    if (typeof unitPrice !== 'number' || unitPrice < 0) {
      throw new Error('OrderItem: unitPrice must be a non-negative number');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('OrderItem: quantity must be a positive integer');
    }

    this.productId = productId;
    this.name = name || productId;
    this.unitPrice = unitPrice;
    this.quantity = quantity;
    this.subtotal = unitPrice * quantity;
  }
}

export class Order {
  constructor({
    id,
    customerId,
    items = [],
    subtotal,
    discountAmount = 0,
    discountCode = null,
    taxAmount = 0,
    total,
    currency = 'USD',
    paymentTransactionId = null,
    status = 'PENDING',
    createdAt = new Date().toISOString(),
  }) {
    this.id = id;
    this.customerId = customerId;
    this.items = items;
    this.subtotal = subtotal;
    this.discountAmount = discountAmount;
    this.discountCode = discountCode;
    this.taxAmount = taxAmount;
    this.total = total;
    this.currency = currency;
    this.paymentTransactionId = paymentTransactionId;
    this.status = status; // 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
    this.createdAt = createdAt;
  }
}

export class PaymentReceipt {
  constructor({ transactionId, orderId, customerId, amount, currency, status, timestamp }) {
    this.transactionId = transactionId;
    this.orderId = orderId;
    this.customerId = customerId;
    this.amount = amount;
    this.currency = currency;
    this.status = status; // 'SUCCESS' | 'DECLINED' | 'REFUNDED'
    this.timestamp = timestamp || new Date().toISOString();
  }
}
