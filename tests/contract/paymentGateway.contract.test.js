import { describe, it, expect } from '@jest/globals';
import { PaymentGateway } from '../../src/infrastructure/paymentGateway.js';
import { MockPaymentGateway } from '../../src/doubles/mockPaymentGateway.js';

describe('Contract Test: IPaymentGateway Implementations', () => {
  const implementations = [
    { name: 'MockPaymentGateway (Test Double)', create: () => new MockPaymentGateway() },
    { name: 'PaymentGateway (Production Adapter)', create: () => new PaymentGateway() },
  ];

  implementations.forEach(({ name, create }) => {
    describe(`Contract conformity for ${name}`, () => {
      it('implements charge({ amount, currency, customerId, orderId, paymentToken }) returning PaymentReceipt', async () => {
        const gateway = create();
        const receipt = await gateway.charge({
          amount: 150.00,
          currency: 'USD',
          customerId: 'cust-101',
          orderId: 'ord-1234',
          paymentToken: 'tok_visa_valid',
        });

        expect(receipt).toBeDefined();
        expect(receipt.transactionId).toBeDefined();
        expect(typeof receipt.transactionId).toBe('string');
        expect(receipt.amount).toBe(150.00);
        expect(receipt.currency).toBe('USD');
        expect(receipt.status).toBe('SUCCESS');
      });

      it('implements refund({ transactionId, amount }) returning refund confirmation', async () => {
        const gateway = create();
        const refund = await gateway.refund({
          transactionId: 'txn_test_999',
          amount: 150.00,
          reason: 'Customer return',
        });

        expect(refund).toBeDefined();
        expect(refund.transactionId).toBe('txn_test_999');
        expect(refund.amount).toBe(150.00);
        expect(refund.status).toBe('REFUNDED');
      });
    });
  });
});
