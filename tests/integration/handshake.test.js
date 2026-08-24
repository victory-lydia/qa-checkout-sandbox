import { describe, it, expect, beforeEach } from '@jest/globals';
import { OrderService } from '../../src/services/orderService.js';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';
import { StubInventoryService } from '../../src/doubles/stubInventoryService.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';
import { PricingService } from '../../src/services/pricingService.js';
import {
  CustomerNotFoundError,
  OutOfStockError,
  PaymentDeclinedError,
  PersistenceError,
} from '../../src/domain/errors.js';

describe('Week 6: Integration and Handshake Testing Suite', () => {
  let fakeDb;
  let mockPayment;
  let stubInventory;
  let spyEmail;
  let orderService;

  beforeEach(() => {
    fakeDb = new FakeCustomerDatabase();
    mockPayment = new MockPaymentGateway();
    stubInventory = new StubInventoryService();
    spyEmail = new SpyEmailNotifier();

    orderService = new OrderService({
      customerDatabase: fakeDb,
      inventoryService: stubInventory,
      paymentGateway: mockPayment,
      emailNotifier: spyEmail,
      pricingService: new PricingService(0.08),
    });
  });

  describe('Happy Path: Complete 6-Step Subsystem Handshake', () => {
    it('executes all 6 subsystem handshakes in strict sequence and maintains state consistency', async () => {
      // Setup initial state
      stubInventory.setStock('prod-laptop', 10);

      const result = await orderService.checkout({
        customerId: 'cust-101', // Alice Johnson
        items: [{ productId: 'prod-laptop', name: 'MacBook Pro', unitPrice: 1200.00, quantity: 1 }],
        paymentToken: 'tok_visa_valid',
      });

      // Handshake 1: Customer Found
      expect(result.order.customerId).toBe('cust-101');

      // Handshake 2: Inventory Reserved (10 - 1 = 9)
      const remainingStock = await stubInventory.getStock('prod-laptop');
      expect(remainingStock).toBe(9);

      // Handshake 3: Total Calculated (1200 * 1.08 = 1296.00)
      expect(result.pricing.total).toBe(1296.00);

      // Handshake 4: Payment Charged with exact amount
      mockPayment.verifyChargeCalledWith({
        customerId: 'cust-101',
        amount: 1296.00,
        currency: 'USD',
      });
      expect(mockPayment.getChargeCount()).toBe(1);

      // Handshake 5: Order Persisted in DB
      const persisted = await fakeDb.findOrderById(result.order.id);
      expect(persisted).toBeDefined();
      expect(persisted.status).toBe('CONFIRMED');
      expect(persisted.total).toBe(1296.00);

      // Handshake 6: Confirmation Email Sent
      expect(spyEmail.getSentEmailCount()).toBe(1);
      const email = spyEmail.getLastEmail();
      expect(email.to).toBe('alice@example.com');
      expect(email.orderId).toBe(result.order.id);
      expect(email.total).toBe(1296.00);
    });
  });

  describe('Failure Handshake 1: Customer Database Miss', () => {
    it('aborts at Step 1 when customer is not found, avoiding stock, payment, or email side effects', async () => {
      stubInventory.setStock('prod-laptop', 10);

      await expect(
        orderService.checkout({
          customerId: 'cust-non-existent-999',
          items: [{ productId: 'prod-laptop', unitPrice: 1200.00, quantity: 1 }],
          paymentToken: 'tok_valid',
        })
      ).rejects.toThrow(CustomerNotFoundError);

      // Verify Handshake 2 did NOT decrement stock
      expect(await stubInventory.getStock('prod-laptop')).toBe(10);
      // Verify Handshake 4 did NOT charge payment
      expect(mockPayment.getChargeCount()).toBe(0);
      // Verify Handshake 5 did NOT persist orders
      expect(fakeDb.getAllOrders().length).toBe(0);
      // Verify Handshake 6 did NOT send email
      expect(spyEmail.getSentEmailCount()).toBe(0);
    });
  });

  describe('Failure Handshake 2: Out of Stock Product', () => {
    it('aborts at Step 2 when inventory is insufficient, avoiding payment charges and notifications', async () => {
      stubInventory.setStock('prod-limited', 2);

      await expect(
        orderService.checkout({
          customerId: 'cust-101',
          items: [{ productId: 'prod-limited', unitPrice: 50.00, quantity: 5 }], // requesting 5, only 2 available
          paymentToken: 'tok_valid',
        })
      ).rejects.toThrow(OutOfStockError);

      // Verify stock remained intact at 2
      expect(await stubInventory.getStock('prod-limited')).toBe(2);
      // Verify downstream subsystems were never called
      expect(mockPayment.getChargeCount()).toBe(0);
      expect(fakeDb.getAllOrders().length).toBe(0);
      expect(spyEmail.getSentEmailCount()).toBe(0);
    });
  });

  describe('Failure Handshake 3: Declined Payment', () => {
    it('aborts at Step 4, restores reserved inventory, prevents order save, and skips email notification', async () => {
      stubInventory.setStock('prod-camera', 5);
      mockPayment.setBehavior('DECLINED', 'Card declined: Insufficient credit limit');

      await expect(
        orderService.checkout({
          customerId: 'cust-101',
          items: [{ productId: 'prod-camera', unitPrice: 800.00, quantity: 2 }],
          paymentToken: 'tok_declined_card',
        })
      ).rejects.toThrow(PaymentDeclinedError);

      // Verify payment was attempted exactly once
      expect(mockPayment.getChargeCount()).toBe(1);

      // Crucial rollback verification: Stock was temporarily reserved then restored to 5
      expect(await stubInventory.getStock('prod-camera')).toBe(5);

      // Crucial consistency verification: Order was NOT saved as confirmed
      expect(fakeDb.getAllOrders().length).toBe(0);

      // Crucial notification verification: No email sent for declined order
      expect(spyEmail.getSentEmailCount()).toBe(0);
    });
  });

  describe('Failure Handshake 4: Database Save Failure & Compensation', () => {
    it('handles persistence crash by issuing compensation refund, restoring inventory, and preventing email', async () => {
      stubInventory.setStock('prod-watch', 3);
      fakeDb.setSimulateSaveFailure(true, 'Disk I/O error while writing to orders table');

      await expect(
        orderService.checkout({
          customerId: 'cust-101',
          items: [{ productId: 'prod-watch', unitPrice: 200.00, quantity: 1 }],
          paymentToken: 'tok_valid',
        })
      ).rejects.toThrow(PersistenceError);

      // Payment was charged...
      expect(mockPayment.getChargeCount()).toBe(1);
      // ...but immediately refunded via compensation rollback
      expect(mockPayment.getRefundCount()).toBe(1);
      const refund = mockPayment.getLastRefund();
      expect(refund.amount).toBe(216.00); // 200 + 8% tax

      // Stock was rolled back
      expect(await stubInventory.getStock('prod-watch')).toBe(3);

      // No confirmation email was sent
      expect(spyEmail.getSentEmailCount()).toBe(0);
    });
  });
});
