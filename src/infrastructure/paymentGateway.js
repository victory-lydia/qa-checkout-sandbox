import { IPaymentGateway } from './interfaces.js';
import { PaymentReceipt } from '../domain/models.js';
import { PaymentDeclinedError, ValidationError } from '../domain/errors.js';

/**
 * Production PaymentGateway adapter interface implementation.
 * In a real production system, this connects via HTTPS to Stripe/PayPal.
 * In the sandbox, it validates input parameters and produces structured payment receipts.
 */
export class PaymentGateway extends IPaymentGateway {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || 'sandbox_pk_live_default';
  }

  async charge({ amount, currency = 'USD', customerId, orderId, paymentToken }) {
    if (!paymentToken || typeof paymentToken !== 'string') {
      throw new ValidationError('Payment token is missing or invalid');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Payment amount must be greater than 0');
    }

    // Simulate standard test card token rules
    if (paymentToken === 'tok_declined') {
      throw new PaymentDeclinedError('Card declined: insufficient funds or invalid card number', {
        orderId,
        amount,
      });
    }

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return new PaymentReceipt({
      transactionId,
      orderId,
      customerId,
      amount,
      currency,
      status: 'SUCCESS',
    });
  }

  async refund({ transactionId, amount, reason = 'Order cancellation' }) {
    if (!transactionId) {
      throw new ValidationError('Transaction ID is required for refund');
    }
    return {
      refundId: `ref_${Date.now()}`,
      transactionId,
      amount,
      reason,
      status: 'REFUNDED',
    };
  }
}
