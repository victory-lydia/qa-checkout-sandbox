import { describe, it, expect, beforeEach } from '@jest/globals';
import { OrderService } from '../../src/services/orderService.js';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';
import { StubInventoryService } from '../../src/doubles/stubInventoryService.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';
import { PricingService } from '../../src/services/pricingService.js';
import {
  CustomerNotFoundError,
  CustomerSuspendedError,
  OutOfStockError,
  PaymentDeclinedError,
} from '../../src/domain/errors.js';

describe('Unit Test: OrderService Business Orchestration', () => {
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

  it('completes successful checkout for active standard customer', async () => {
    const response = await orderService.checkout({
      customerId: 'cust-101',
      items: [{ productId: 'prod-in-stock', unitPrice: 50.00, quantity: 2 }],
      paymentToken: 'tok_valid_visa',
    });

    expect(response.order).toBeDefined();
    expect(response.order.status).toBe('CONFIRMED');
    expect(response.order.total).toBe(108.00); // 100 + 8% tax
    expect(response.paymentReceipt.status).toBe('SUCCESS');

    // Verify Mock Payment was charged with exact values
    mockPayment.verifyChargeCalledWith({
      customerId: 'cust-101',
      amount: 108.00,
      currency: 'USD',
    });

    // Verify Spy Email recorded exactly 1 confirmation email
    spyEmail.verifyExactlyOneEmailSentTo('alice@example.com', response.order.id);

    // Verify Fake DB persisted the order
    const saved = await fakeDb.findOrderById(response.order.id);
    expect(saved).toBeDefined();
    expect(saved.total).toBe(108.00);
  });

  it('applies PRO tier discount and saves correct order totals', async () => {
    const response = await orderService.checkout({
      customerId: 'cust-102', // Bob Smith (PRO tier)
      items: [{ productId: 'prod-in-stock', unitPrice: 100.00, quantity: 1 }],
      paymentToken: 'tok_valid_visa',
    });

    // 100 subtotal - 5% discount = 95 taxable -> 95 * 1.08 = 102.60
    expect(response.order.total).toBe(102.60);
    expect(response.order.discountCode).toBe('PRO_TIER_5PCT');
    expect(response.paymentReceipt.amount).toBe(102.60);
    mockPayment.verifyChargeCalledWith({ amount: 102.60 });
  });

  it('throws CustomerNotFoundError when customer does not exist', async () => {
    await expect(
      orderService.checkout({
        customerId: 'cust-non-existent',
        items: [{ productId: 'prod-in-stock', unitPrice: 10.00, quantity: 1 }],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(CustomerNotFoundError);

    // Verify no side effects occurred
    mockPayment.verifyNoCharges();
    spyEmail.verifyNoEmailsSent();
  });

  it('throws CustomerSuspendedError when customer account is suspended', async () => {
    await expect(
      orderService.checkout({
        customerId: 'cust-103', // Carol Suspended
        items: [{ productId: 'prod-in-stock', unitPrice: 10.00, quantity: 1 }],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(CustomerSuspendedError);

    mockPayment.verifyNoCharges();
    spyEmail.verifyNoEmailsSent();
  });

  it('throws OutOfStockError and prevents payment when item is out of stock', async () => {
    await expect(
      orderService.checkout({
        customerId: 'cust-101',
        items: [{ productId: 'prod-out-of-stock', unitPrice: 20.00, quantity: 1 }],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(OutOfStockError);

    mockPayment.verifyNoCharges();
    spyEmail.verifyNoEmailsSent();
  });

  it('rolls back reserved inventory if payment is declined', async () => {
    stubInventory.setStock('prod-test-rollback', 5);
    mockPayment.setBehavior('DECLINED', 'Card expired');

    await expect(
      orderService.checkout({
        customerId: 'cust-101',
        items: [{ productId: 'prod-test-rollback', unitPrice: 15.00, quantity: 2 }],
        paymentToken: 'tok_declined_card',
      })
    ).rejects.toThrow(PaymentDeclinedError);

    // Verify stock was restored to 5
    const remainingStock = await stubInventory.getStock('prod-test-rollback');
    expect(remainingStock).toBe(5);

    // Verify no email was dispatched
    spyEmail.verifyNoEmailsSent();
  });

  it('retrieves an existing order by ID via getOrder()', async () => {
    const checkoutResult = await orderService.checkout({
      customerId: 'cust-101',
      items: [{ productId: 'prod-in-stock', unitPrice: 25.00, quantity: 1 }],
      paymentToken: 'tok_valid',
    });

    const fetched = await orderService.getOrder(checkoutResult.order.id);
    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(checkoutResult.order.id);
    expect(fetched.customerId).toBe('cust-101');
  });
});
