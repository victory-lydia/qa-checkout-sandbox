import { describe, it, expect, beforeEach } from '@jest/globals';
import { OrderService } from '../../src/services/orderService.js';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';
import { InventoryService } from '../../src/infrastructure/inventoryService.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';
import { PricingService } from '../../src/services/pricingService.js';
import { OutOfStockError } from '../../src/domain/errors.js';

describe('Concurrency and Race Condition Testing', () => {
  let db;
  let payment;
  let inventory;
  let email;
  let orderService;

  beforeEach(() => {
    db = new FakeCustomerDatabase();
    payment = new MockPaymentGateway();
    inventory = new InventoryService({ 'prod-last-item': 1 }); // Exactly 1 item in stock
    email = new SpyEmailNotifier();

    orderService = new OrderService({
      customerDatabase: db,
      inventoryService: inventory,
      paymentGateway: payment,
      emailNotifier: email,
      pricingService: new PricingService(0.08),
    });
  });

  it('prevents overselling when 2 customers simultaneously checkout the last remaining item', async () => {
    // Both requests fire concurrently via Promise.allSettled
    const buyer1Promise = orderService.checkout({
      customerId: 'cust-101', // Alice
      items: [{ productId: 'prod-last-item', name: 'Rare Collectible', unitPrice: 500.00, quantity: 1 }],
      paymentToken: 'tok_alice',
    });

    const buyer2Promise = orderService.checkout({
      customerId: 'cust-102', // Bob
      items: [{ productId: 'prod-last-item', name: 'Rare Collectible', unitPrice: 500.00, quantity: 1 }],
      paymentToken: 'tok_bob',
    });

    const results = await Promise.allSettled([buyer1Promise, buyer2Promise]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly 1 checkout succeeds
    expect(fulfilled.length).toBe(1);
    // Exactly 1 checkout fails
    expect(rejected.length).toBe(1);

    // The failing request must be an OutOfStockError
    expect(rejected[0].reason).toBeInstanceOf(OutOfStockError);

    // Verify inventory is exactly 0 (no negative stock oversell)
    const finalStock = await inventory.getStock('prod-last-item');
    expect(finalStock).toBe(0);

    // Verify exactly 1 order was saved in database
    expect(db.getAllOrders().length).toBe(1);

    // Verify payment was charged exactly once
    expect(payment.getChargeCount()).toBe(1);

    // Verify exactly one confirmation email was dispatched
    expect(email.getSentEmailCount()).toBe(1);
  });

  it('handles N concurrent requests for K available items deterministically', async () => {
    const totalStock = 3;
    const concurrentRequests = 10;
    inventory.setStock('prod-multi-test', totalStock);

    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      orderService.checkout({
        customerId: i % 2 === 0 ? 'cust-101' : 'cust-102',
        items: [{ productId: 'prod-multi-test', unitPrice: 50.00, quantity: 1 }],
        paymentToken: `tok_buyer_${i}`,
      })
    );

    const results = await Promise.allSettled(promises);

    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(successful.length).toBe(totalStock);
    expect(failed.length).toBe(concurrentRequests - totalStock);

    // Ensure final inventory is exactly 0
    expect(await inventory.getStock('prod-multi-test')).toBe(0);
    expect(payment.getChargeCount()).toBe(totalStock);
    expect(email.getSentEmailCount()).toBe(totalStock);
  });
});
