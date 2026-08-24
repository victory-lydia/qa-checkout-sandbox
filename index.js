/**
 * Main exports for The QA Checkout Sandbox package.
 */

export { createApp } from './src/app.js';
export { OrderService } from './src/services/orderService.js';
export { PricingService } from './src/services/pricingService.js';
export { SandboxContainer } from './src/sandbox/container.js';
export { SandboxEngine } from './src/sandbox/sandboxEngine.js';

// Test Doubles
export { FakeCustomerDatabase } from './src/doubles/fakeCustomerDatabase.js';
export { MockPaymentGateway } from './src/doubles/mockPaymentGateway.js';
export { StubInventoryService } from './src/doubles/stubInventoryService.js';
export { SpyEmailNotifier } from './src/doubles/spyEmailNotifier.js';

// Domain Models & Errors
export * from './src/domain/models.js';
export * from './src/domain/errors.js';
