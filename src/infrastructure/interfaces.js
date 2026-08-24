/**
 * Formal interface contracts for the 4 core checkout subsystems.
 * Both production infrastructure adapters and test doubles adhere to these contracts.
 */

export class ICustomerDatabase {
  async findById(_customerId) {
    throw new Error('ICustomerDatabase#findById must be implemented');
  }

  async saveOrder(_order) {
    throw new Error('ICustomerDatabase#saveOrder must be implemented');
  }

  async findOrderById(_orderId) {
    throw new Error('ICustomerDatabase#findOrderById must be implemented');
  }

  async hasCustomer(_customerId) {
    throw new Error('ICustomerDatabase#hasCustomer must be implemented');
  }
}

export class IInventoryService {
  async checkStock(_productId, _quantity) {
    throw new Error('IInventoryService#checkStock must be implemented');
  }

  async reserveStock(_productId, _quantity) {
    throw new Error('IInventoryService#reserveStock must be implemented');
  }

  async releaseStock(_productId, _quantity) {
    throw new Error('IInventoryService#releaseStock must be implemented');
  }

  async getStock(_productId) {
    throw new Error('IInventoryService#getStock must be implemented');
  }
}

export class IPaymentGateway {
  async charge(_params) {
    // params: { amount, currency, customerId, orderId, paymentToken }
    throw new Error('IPaymentGateway#charge must be implemented');
  }

  async refund(_params) {
    // params: { transactionId, amount, reason }
    throw new Error('IPaymentGateway#refund must be implemented');
  }
}

export class IEmailNotifier {
  async sendOrderConfirmation(_params) {
    // params: { to, customerName, orderId, total, items }
    throw new Error('IEmailNotifier#sendOrderConfirmation must be implemented');
  }
}
