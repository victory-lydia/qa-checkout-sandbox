import { describe, it, expect, beforeEach } from '@jest/globals';
import { OrderService } from '../../src/services/orderService.js';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';
import { StubInventoryService } from '../../src/doubles/stubInventoryService.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';
import { ValidationError } from '../../src/domain/errors.js';
import { OrderItem } from '../../src/domain/models.js';

describe('Unit Test: Payload and Domain Validation', () => {
  let orderService;

  beforeEach(() => {
    orderService = new OrderService({
      customerDatabase: new FakeCustomerDatabase(),
      inventoryService: new StubInventoryService(),
      paymentGateway: new MockPaymentGateway(),
      emailNotifier: new SpyEmailNotifier(),
    });
  });

  it('rejects missing or whitespace customerId', async () => {
    await expect(
      orderService.checkout({
        customerId: '',
        items: [{ productId: 'item', unitPrice: 10, quantity: 1 }],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      orderService.checkout({
        customerId: '   ',
        items: [{ productId: 'item', unitPrice: 10, quantity: 1 }],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('rejects missing or empty paymentToken', async () => {
    await expect(
      orderService.checkout({
        customerId: 'cust-101',
        items: [{ productId: 'item', unitPrice: 10, quantity: 1 }],
        paymentToken: '',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('rejects empty or non-array items payload', async () => {
    await expect(
      orderService.checkout({
        customerId: 'cust-101',
        items: [],
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(ValidationError);

    await expect(
      orderService.checkout({
        customerId: 'cust-101',
        items: 'invalid-string',
        paymentToken: 'tok_valid',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('validates OrderItem constructor invariants', () => {
    expect(() => new OrderItem({ unitPrice: 10, quantity: 1 })).toThrow(/productId is required/);
    expect(() => new OrderItem({ productId: 'p1', unitPrice: -5, quantity: 1 })).toThrow(/unitPrice/);
    expect(() => new OrderItem({ productId: 'p1', unitPrice: 5, quantity: 0 })).toThrow(/quantity/);
  });
});
