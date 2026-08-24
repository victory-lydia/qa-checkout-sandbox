import { describe, it, expect } from '@jest/globals';
import { EmailNotifier } from '../../src/infrastructure/emailNotifier.js';
import { SpyEmailNotifier } from '../../src/doubles/spyEmailNotifier.js';

describe('Contract Test: IEmailNotifier Implementations', () => {
  const implementations = [
    { name: 'SpyEmailNotifier (Test Double)', create: () => new SpyEmailNotifier() },
    { name: 'EmailNotifier (Production Adapter)', create: () => new EmailNotifier() },
  ];

  implementations.forEach(({ name, create }) => {
    describe(`Contract conformity for ${name}`, () => {
      it('implements sendOrderConfirmation() returning dispatch status with messageId', async () => {
        const notifier = create();
        const result = await notifier.sendOrderConfirmation({
          to: 'customer@example.com',
          customerName: 'Alice',
          orderId: 'ord_123',
          total: 99.99,
          items: [{ productId: 'item-1', name: 'Widget', quantity: 1 }],
          currency: 'USD',
        });

        expect(result).toBeDefined();
        expect(result.status).toBe('SENT');
        expect(result.recipient).toBe('customer@example.com');
        expect(result.messageId).toBeDefined();
        expect(typeof result.messageId).toBe('string');
      });
    });
  });
});
