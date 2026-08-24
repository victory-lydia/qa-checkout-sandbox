import { Order, OrderItem } from '../domain/models.js';
import {
  ValidationError,
  CustomerNotFoundError,
  CustomerSuspendedError,
} from '../domain/errors.js';
import { PricingService } from './pricingService.js';

/**
 * OrderService - Main business orchestration component.
 *
 * Coordinates the 6-step handshake flow across 4 core subsystems:
 * 1. Customer Verification (CustomerDatabase)
 * 2. Inventory Check & Reservation (InventoryService)
 * 3. Total Price Calculation (PricingService)
 * 4. Payment Processing (PaymentGateway)
 * 5. Order Persistence (CustomerDatabase)
 * 6. Customer Confirmation Notification (EmailNotifier)
 */
export class OrderService {
  constructor({
    customerDatabase,
    inventoryService,
    paymentGateway,
    emailNotifier,
    pricingService = new PricingService(),
  }) {
    if (!customerDatabase) throw new Error('OrderService: customerDatabase is required');
    if (!inventoryService) throw new Error('OrderService: inventoryService is required');
    if (!paymentGateway) throw new Error('OrderService: paymentGateway is required');
    if (!emailNotifier) throw new Error('OrderService: emailNotifier is required');

    this.customerDatabase = customerDatabase;
    this.inventoryService = inventoryService;
    this.paymentGateway = paymentGateway;
    this.emailNotifier = emailNotifier;
    this.pricingService = pricingService;
    this.orderSequence = 1000;
  }

  /**
   * Validate checkout request parameters.
   */
  _validateCheckoutPayload({ customerId, items, paymentToken }) {
    if (!customerId || typeof customerId !== 'string' || customerId.trim() === '') {
      throw new ValidationError('Field "customerId" is required and must be a non-empty string');
    }
    if (!paymentToken || typeof paymentToken !== 'string' || paymentToken.trim() === '') {
      throw new ValidationError('Field "paymentToken" is required and must be a valid token string');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Field "items" must be a non-empty array of items');
    }

    return items.map((raw) => {
      if (!raw || typeof raw !== 'object') {
        throw new ValidationError('Each item in "items" must be a valid object');
      }
      return new OrderItem({
        productId: raw.productId,
        name: raw.name || raw.productId,
        unitPrice: raw.unitPrice,
        quantity: raw.quantity,
      });
    });
  }

  /**
   * Execute the complete checkout flow with automatic rollback on handshake failures.
   */
  async checkout({
    customerId,
    items: rawItems,
    paymentToken,
    discountCode = null,
    customTaxRate = null,
  }) {
    // 0. Payload Validation
    const validatedItems = this._validateCheckoutPayload({ customerId, items: rawItems, paymentToken });

    // 1. Handshake 1: Customer Database Verification
    const customer = await this.customerDatabase.findById(customerId);
    if (!customer) {
      throw new CustomerNotFoundError(customerId);
    }
    if (customer.status === 'SUSPENDED') {
      throw new CustomerSuspendedError(customerId);
    }

    // 2. Handshake 2: Inventory Check and Atomic Reservation
    const reservedItems = [];
    try {
      for (const item of validatedItems) {
        await this.inventoryService.reserveStock(item.productId, item.quantity);
        reservedItems.push(item);
      }
    } catch (stockError) {
      // Rollback any partial reservations made before failure
      for (const item of reservedItems) {
        await this.inventoryService.releaseStock(item.productId, item.quantity);
      }
      throw stockError;
    }

    // 3. Handshake 3: Price Calculation
    const pricing = this.pricingService.calculateTotal({
      items: validatedItems,
      discountCode,
      customTaxRate,
      customerTier: customer.tier,
    });

    // Generate unique Order ID
    this.orderSequence += 1;
    const orderId = `ord_${this.orderSequence}_${Date.now().toString(36)}`;

    // 4. Handshake 4: Payment Processing
    let paymentReceipt;
    try {
      paymentReceipt = await this.paymentGateway.charge({
        amount: pricing.total,
        currency: pricing.currency,
        customerId: customer.id,
        orderId,
        paymentToken,
      });
    } catch (paymentError) {
      // Rollback all reserved stock on payment failure
      for (const item of reservedItems) {
        await this.inventoryService.releaseStock(item.productId, item.quantity);
      }
      throw paymentError;
    }

    // 5. Handshake 5: Order Persistence
    const order = new Order({
      id: orderId,
      customerId: customer.id,
      items: validatedItems,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      discountCode: pricing.discountCode,
      taxAmount: pricing.taxAmount,
      total: pricing.total,
      currency: pricing.currency,
      paymentTransactionId: paymentReceipt.transactionId,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    });

    let savedOrder;
    try {
      savedOrder = await this.customerDatabase.saveOrder(order);
    } catch (saveError) {
      // Rollback 1: Refund payment
      try {
        await this.paymentGateway.refund({
          transactionId: paymentReceipt.transactionId,
          amount: pricing.total,
          reason: 'Order persistence failure compensation',
        });
      } catch (_refundErr) {
        // Log critical compensation alert in production telemetry
      }

      // Rollback 2: Release stock
      for (const item of reservedItems) {
        await this.inventoryService.releaseStock(item.productId, item.quantity);
      }

      throw saveError;
    }

    // 6. Handshake 6: Email Confirmation Dispatch
    let notificationResult;
    try {
      notificationResult = await this.emailNotifier.sendOrderConfirmation({
        to: customer.email,
        customerName: customer.name,
        orderId: savedOrder.id,
        total: savedOrder.total,
        items: savedOrder.items,
        currency: savedOrder.currency,
      });
    } catch (emailErr) {
      // Non-fatal warning: order is confirmed, notification dispatch logged as pending retry
      notificationResult = {
        status: 'FAILED',
        error: emailErr.message,
      };
    }

    return {
      order: savedOrder,
      pricing,
      paymentReceipt,
      notification: notificationResult,
    };
  }

  async getOrder(orderId) {
    if (!orderId) throw new ValidationError('Order ID is required');
    return this.customerDatabase.findOrderById(orderId);
  }
}
