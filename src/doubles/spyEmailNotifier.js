import { IEmailNotifier } from '../infrastructure/interfaces.js';

/**
 * SPY EmailNotifier (Test Double)
 *
 * Characteristics of a Spy (Gerard Meszaros / Martin Fowler taxonomy):
 * - Indirect-output observation focused.
 * - Wraps or replaces real email dispatching and records every call without sending real emails.
 * - Exposes history logs, call count inspections, and parameter matching for assertions.
 */
export class SpyEmailNotifier extends IEmailNotifier {
  constructor() {
    super();
    this.sentEmails = [];
  }

  async sendOrderConfirmation({ to, customerName, orderId, total, items, currency = 'USD' }) {
    const record = {
      timestamp: new Date().toISOString(),
      type: 'ORDER_CONFIRMATION',
      to,
      customerName,
      orderId,
      total,
      items: items ? items.map((i) => ({ ...i })) : [],
      currency,
    };
    this.sentEmails.push(record);
    return {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'SENT',
      recipient: to,
    };
  }

  // --- Spy Inspection and Assertion Methods ---

  getSentEmailCount() {
    return this.sentEmails.length;
  }

  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  wasEmailSentTo(email) {
    return this.sentEmails.some((e) => e.to === email);
  }

  getEmailsForOrder(orderId) {
    return this.sentEmails.filter((e) => e.orderId === orderId);
  }

  verifyExactlyOneEmailSentTo(email, expectedOrderId = null) {
    const matches = this.sentEmails.filter((e) => {
      let isMatch = e.to === email;
      if (expectedOrderId) isMatch = isMatch && e.orderId === expectedOrderId;
      return isMatch;
    });

    if (matches.length !== 1) {
      throw new Error(
        `SpyEmailNotifier: Expected exactly 1 email to '${email}'${expectedOrderId ? ` for order '${expectedOrderId}'` : ''}, but found ${matches.length}. Total sent: ${this.sentEmails.length}`
      );
    }
    return true;
  }

  verifyNoEmailsSent() {
    if (this.sentEmails.length !== 0) {
      throw new Error(`SpyEmailNotifier: Expected 0 emails sent, but recorded ${this.sentEmails.length}.`);
    }
    return true;
  }

  clear() {
    this.sentEmails = [];
  }
}
