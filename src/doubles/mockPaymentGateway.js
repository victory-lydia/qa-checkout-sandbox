import { IPaymentGateway } from '../infrastructure/interfaces.js';
import { PaymentReceipt } from '../domain/models.js';
import { PaymentDeclinedError, PaymentGatewayError } from '../domain/errors.js';

/**
 * MOCK PaymentGateway (Test Double)
 *
 * Characteristics of a Mock (Gerard Meszaros / Martin Fowler taxonomy):
 * - Behavior-verification focused.
 * - Records all incoming invocations (charges, refunds) with exact parameters.
 * - Configured with expected behavioral outcomes (success, decline, timeout).
 * - Provides assertions to verify that exact calls occurred with precise arguments.
 */
export class MockPaymentGateway extends IPaymentGateway {
  constructor(options = {}) {
    super();
    this.chargeCalls = [];
    this.refundCalls = [];
    this.behavior = options.behavior || 'SUCCESS'; // 'SUCCESS' | 'DECLINED' | 'ERROR'
    this.declineReason = options.declineReason || 'Insufficient funds';
    this.errorMessage = options.errorMessage || 'Network timeout communicating with payment provider';
    this.customResponses = new Map(); // orderId -> 'SUCCESS' | 'DECLINED' | 'ERROR'
    this.transactionCounter = 1000;
  }

  setBehavior(behavior, reasonOrMessage = null) {
    this.behavior = behavior;
    if (behavior === 'DECLINED' && reasonOrMessage) {
      this.declineReason = reasonOrMessage;
    } else if (behavior === 'ERROR' && reasonOrMessage) {
      this.errorMessage = reasonOrMessage;
    }
  }

  setBehaviorForOrder(orderId, behavior) {
    this.customResponses.set(orderId, behavior);
  }

  async charge({ amount, currency = 'USD', customerId, orderId, paymentToken }) {
    const callRecord = {
      timestamp: new Date().toISOString(),
      amount,
      currency,
      customerId,
      orderId,
      paymentToken,
    };
    this.chargeCalls.push(callRecord);

    const effectiveBehavior = this.customResponses.get(orderId) || (paymentToken === 'tok_declined' ? 'DECLINED' : this.behavior);

    if (effectiveBehavior === 'ERROR') {
      throw new PaymentGatewayError(this.errorMessage, { orderId, amount });
    }

    if (effectiveBehavior === 'DECLINED') {
      throw new PaymentDeclinedError(this.declineReason, { orderId, amount, customerId });
    }

    this.transactionCounter += 1;
    const transactionId = `txn_${this.transactionCounter}_${Date.now()}`;

    return new PaymentReceipt({
      transactionId,
      orderId,
      customerId,
      amount,
      currency,
      status: 'SUCCESS',
      timestamp: callRecord.timestamp,
    });
  }

  async refund({ transactionId, amount, reason = 'Order cancellation' }) {
    const callRecord = {
      timestamp: new Date().toISOString(),
      transactionId,
      amount,
      reason,
    };
    this.refundCalls.push(callRecord);

    return {
      refundId: `ref_${Date.now()}`,
      transactionId,
      amount,
      status: 'REFUNDED',
      timestamp: callRecord.timestamp,
    };
  }

  // --- Mock Verification and Inspection Methods ---

  getChargeCount() {
    return this.chargeCalls.length;
  }

  getRefundCount() {
    return this.refundCalls.length;
  }

  getLastCharge() {
    return this.chargeCalls[this.chargeCalls.length - 1] || null;
  }

  getLastRefund() {
    return this.refundCalls[this.refundCalls.length - 1] || null;
  }

  verifyChargeCalledWith({ customerId, orderId, amount, currency }) {
    const match = this.chargeCalls.find((c) => {
      let isMatch = true;
      if (customerId !== undefined && c.customerId !== customerId) isMatch = false;
      if (orderId !== undefined && c.orderId !== orderId) isMatch = false;
      if (amount !== undefined && Math.abs(c.amount - amount) > 0.001) isMatch = false;
      if (currency !== undefined && c.currency !== currency) isMatch = false;
      return isMatch;
    });

    if (!match) {
      throw new Error(
        `MockPaymentGateway: Expected charge call matching ${JSON.stringify({ customerId, orderId, amount, currency })} was not found in recorded calls: ${JSON.stringify(this.chargeCalls)}`
      );
    }
    return true;
  }

  verifyNoCharges() {
    if (this.chargeCalls.length !== 0) {
      throw new Error(`MockPaymentGateway: Expected 0 charges, but recorded ${this.chargeCalls.length} calls.`);
    }
    return true;
  }

  reset() {
    this.chargeCalls = [];
    this.refundCalls = [];
    this.behavior = 'SUCCESS';
    this.customResponses.clear();
  }
}
