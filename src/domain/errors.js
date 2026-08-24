/**
 * Domain-specific error hierarchy for the QA Checkout Sandbox.
 * These map to distinct testing assertions and HTTP status codes.
 */

export class DomainError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DomainError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class CustomerNotFoundError extends DomainError {
  constructor(customerId) {
    super(`Customer with ID '${customerId}' was not found.`, 'CUSTOMER_NOT_FOUND', 404, { customerId });
  }
}

export class CustomerSuspendedError extends DomainError {
  constructor(customerId) {
    super(`Customer account '${customerId}' is suspended.`, 'CUSTOMER_SUSPENDED', 403, { customerId });
  }
}

export class OutOfStockError extends DomainError {
  constructor(productId, requested, available) {
    super(
      `Product '${productId}' is out of stock. Requested: ${requested}, Available: ${available}.`,
      'OUT_OF_STOCK',
      400,
      { productId, requested, available }
    );
  }
}

export class PaymentDeclinedError extends DomainError {
  constructor(reason = 'Card declined by issuing bank', details = null) {
    super(`Payment was declined: ${reason}`, 'PAYMENT_DECLINED', 402, details);
  }
}

export class PaymentGatewayError extends DomainError {
  constructor(message = 'Payment gateway communication failure', details = null) {
    super(message, 'PAYMENT_GATEWAY_ERROR', 502, details);
  }
}

export class PersistenceError extends DomainError {
  constructor(message = 'Failed to persist order to storage', details = null) {
    super(message, 'PERSISTENCE_ERROR', 500, details);
  }
}

export class ConcurrencyConflictError extends DomainError {
  constructor(resourceId, message = 'Resource modified by concurrent transaction') {
    super(message, 'CONCURRENCY_CONFLICT', 409, { resourceId });
  }
}
