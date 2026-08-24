import { IEmailNotifier } from './interfaces.js';
import { ValidationError } from '../domain/errors.js';

/**
 * Production EmailNotifier adapter interface implementation.
 * In a real production system, this connects via SMTP / SendGrid / SES.
 * In the sandbox, it validates recipient email and formats message payloads.
 */
export class EmailNotifier extends IEmailNotifier {
  constructor(options = {}) {
    super();
    this.senderAddress = options.senderAddress || 'no-reply@sandbox-store.test';
  }

  async sendOrderConfirmation({ to, customerName, orderId, total, items, currency = 'USD' }) {
    if (!to || !to.includes('@')) {
      throw new ValidationError(`Invalid recipient email address: '${to}'`);
    }
    if (!orderId) {
      throw new ValidationError('Order ID is required to send confirmation email');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      messageId,
      sender: this.senderAddress,
      recipient: to,
      subject: `Order Confirmation #${orderId}`,
      body: `Hi ${customerName}, your order #${orderId} for ${currency} ${total.toFixed(2)} with ${items ? items.length : 0} items has been confirmed.`,
      status: 'SENT',
      timestamp: new Date().toISOString(),
    };
  }
}
