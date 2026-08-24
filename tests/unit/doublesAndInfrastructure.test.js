import { describe, it, expect } from '@jest/globals';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';
import { StubInventoryService } from '../../src/doubles/stubInventoryService.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';
import { CustomerDatabase } from '../../src/infrastructure/customerDatabase.js';
import { PaymentGateway } from '../../src/infrastructure/paymentGateway.js';
import { EmailNotifier } from '../../src/infrastructure/emailNotifier.js';
import {
  ICustomerDatabase,
  IInventoryService,
  IPaymentGateway,
  IEmailNotifier,
} from '../../src/infrastructure/interfaces.js';
import {
  DomainError,
  ValidationError,
  CustomerNotFoundError,
  CustomerSuspendedError,
  OutOfStockError,
  PaymentDeclinedError,
  PaymentGatewayError,
  PersistenceError,
  ConcurrencyConflictError,
} from '../../src/domain/errors.js';
import { Customer } from '../../src/domain/models.js';

describe('Unit Test: Test Doubles, Infrastructure & Domain Errors', () => {
  describe('Domain Error Hierarchy', () => {
    it('instantiates all domain error classes with expected status codes and fields', () => {
      const base = new DomainError('base msg', 'BASE_CODE', 500, { key: 'val' });
      expect(base.statusCode).toBe(500);
      expect(base.code).toBe('BASE_CODE');

      const v = new ValidationError('bad input');
      expect(v.statusCode).toBe(400);

      const cnf = new CustomerNotFoundError('c1');
      expect(cnf.statusCode).toBe(404);

      const cs = new CustomerSuspendedError('c1');
      expect(cs.statusCode).toBe(403);

      const oos = new OutOfStockError('p1', 5, 2);
      expect(oos.statusCode).toBe(400);

      const pd = new PaymentDeclinedError('insufficient funds');
      expect(pd.statusCode).toBe(402);

      const pge = new PaymentGatewayError('timeout');
      expect(pge.statusCode).toBe(502);

      const pe = new PersistenceError('disk full');
      expect(pe.statusCode).toBe(500);

      const cce = new ConcurrencyConflictError('res-1');
      expect(cce.statusCode).toBe(409);
    });
  });

  describe('Abstract Interface Stubs', () => {
    it('throws errors when calling unimplemented interface methods', async () => {
      const db = new ICustomerDatabase();
      await expect(db.findById('1')).rejects.toThrow('must be implemented');
      await expect(db.saveOrder({})).rejects.toThrow('must be implemented');
      await expect(db.findOrderById('1')).rejects.toThrow('must be implemented');
      await expect(db.hasCustomer('1')).rejects.toThrow('must be implemented');

      const inv = new IInventoryService();
      await expect(inv.checkStock('1', 1)).rejects.toThrow('must be implemented');
      await expect(inv.reserveStock('1', 1)).rejects.toThrow('must be implemented');
      await expect(inv.releaseStock('1', 1)).rejects.toThrow('must be implemented');
      await expect(inv.getStock('1')).rejects.toThrow('must be implemented');

      const pay = new IPaymentGateway();
      await expect(pay.charge({})).rejects.toThrow('must be implemented');
      await expect(pay.refund({})).rejects.toThrow('must be implemented');

      const email = new IEmailNotifier();
      await expect(email.sendOrderConfirmation({})).rejects.toThrow('must be implemented');
    });
  });

  describe('FakeCustomerDatabase Edge Cases & Helpers', () => {
    it('supports custom initial seeding and reset()', async () => {
      const customCustomer = new Customer({ id: 'c-custom', name: 'Custom', email: 'custom@test.com' });
      const fakeDb = new FakeCustomerDatabase([customCustomer]);
      expect(await fakeDb.hasCustomer('c-custom')).toBe(true);

      fakeDb.reset();
      expect(await fakeDb.hasCustomer('cust-101')).toBe(true);
    });
  });

  describe('MockPaymentGateway Error Behaviors and Assertions', () => {
    it('supports ERROR behavior throwing PaymentGatewayError', async () => {
      const mockPay = new MockPaymentGateway({ behavior: 'ERROR' });
      await expect(
        mockPay.charge({ amount: 100, customerId: 'c1', orderId: 'o1', paymentToken: 'tok' })
      ).rejects.toThrow(PaymentGatewayError);
    });

    it('supports order-specific custom behavior overrides', async () => {
      const mockPay = new MockPaymentGateway();
      mockPay.setBehaviorForOrder('order-decline', 'DECLINED');

      await expect(
        mockPay.charge({ amount: 50, customerId: 'c1', orderId: 'order-decline', paymentToken: 'tok' })
      ).rejects.toThrow(PaymentDeclinedError);
    });

    it('throws when verifyChargeCalledWith() does not find matching call', async () => {
      const mockPay = new MockPaymentGateway();
      await mockPay.charge({ amount: 50, customerId: 'c1', orderId: 'o1', paymentToken: 'tok' });

      expect(() => {
        mockPay.verifyChargeCalledWith({ customerId: 'non-matching' });
      }).toThrow(/Expected charge call matching/);
    });

    it('throws when verifyNoCharges() is called after charges occurred', async () => {
      const mockPay = new MockPaymentGateway();
      await mockPay.charge({ amount: 50, customerId: 'c1', orderId: 'o1', paymentToken: 'tok' });

      expect(() => mockPay.verifyNoCharges()).toThrow(/Expected 0 charges/);
    });
  });

  describe('SpyEmailNotifier Helper Queries', () => {
    it('tracks sent emails and supports queries and assertions', async () => {
      const spy = new SpyEmailNotifier();
      await spy.sendOrderConfirmation({
        to: 'user1@test.com',
        customerName: 'User 1',
        orderId: 'ord-1',
        total: 100,
        items: [],
      });

      expect(spy.wasEmailSentTo('user1@test.com')).toBe(true);
      expect(spy.wasEmailSentTo('other@test.com')).toBe(false);
      expect(spy.getEmailsForOrder('ord-1').length).toBe(1);

      expect(() => spy.verifyNoEmailsSent()).toThrow(/Expected 0 emails sent/);
      expect(() => spy.verifyExactlyOneEmailSentTo('other@test.com')).toThrow(/Expected exactly 1 email/);

      spy.clear();
      expect(spy.getSentEmailCount()).toBe(0);
      expect(spy.verifyNoEmailsSent()).toBe(true);
    });
  });

  describe('Production Infrastructure Adapters Validation', () => {
    it('CustomerDatabase validates order ID on save and supports getOrdersForCustomer', async () => {
      const db = new CustomerDatabase();
      await expect(db.saveOrder({})).rejects.toThrow(PersistenceError);

      const orders = await db.getOrdersForCustomer('cust-101');
      expect(Array.isArray(orders)).toBe(true);
    });

    it('PaymentGateway validates required tokens, amounts, and decline tokens', async () => {
      const pg = new PaymentGateway();
      await expect(pg.charge({ amount: 100, paymentToken: '' })).rejects.toThrow(ValidationError);
      await expect(pg.charge({ amount: -10, paymentToken: 'tok' })).rejects.toThrow(ValidationError);
      await expect(pg.charge({ amount: 100, paymentToken: 'tok_declined' })).rejects.toThrow(PaymentDeclinedError);
      await expect(pg.refund({ transactionId: '' })).rejects.toThrow(ValidationError);
    });

    it('EmailNotifier validates email formatting and required order ID', async () => {
      const en = new EmailNotifier();
      await expect(en.sendOrderConfirmation({ to: 'invalid-email', orderId: 'ord-1' })).rejects.toThrow(ValidationError);
      await expect(en.sendOrderConfirmation({ to: 'valid@email.com', orderId: '' })).rejects.toThrow(ValidationError);
    });

    it('StubInventoryService resets catalog properly', async () => {
      const stub = new StubInventoryService();
      stub.setStock('prod-in-stock', 0);
      stub.reset();
      expect(await stub.getStock('prod-in-stock')).toBe(100);
    });
  });
});
