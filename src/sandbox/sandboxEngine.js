import { SandboxContainer } from './container.js';

/**
 * SandboxEngine manages the lifecycle, layer inspection,
 * and contract checks of the QA Sandbox.
 */
export class SandboxEngine {
  constructor(layer = 1, options = {}) {
    this.container = SandboxContainer.create(layer, options);
  }

  getLayer() {
    return this.container.layer;
  }

  getContainer() {
    return this.container;
  }

  describeLayer() {
    switch (this.container.layer) {
      case 1:
        return {
          layer: 1,
          name: 'Fully Isolated (Fast / Offline)',
          description: 'Subsystems replaced with Fake DB, Mock Payment, Stub Inventory, Spy Email. Zero external dependencies or network operations.',
          subsystems: {
            customerDatabase: 'FakeCustomerDatabase (Stateful In-Memory Store)',
            inventoryService: 'StubInventoryService (Pre-Programmed Canned Responses)',
            paymentGateway: 'MockPaymentGateway (Call Recording & Parameter Assertions)',
            emailNotifier: 'SpyEmailNotifier (Call Logging & Recipient Verification)',
          },
        };
      case 2:
        return {
          layer: 2,
          name: 'Partially Integrated (Realistic In-Memory)',
          description: 'Realistic relational in-memory database and mutex-locked inventory; external payment and email remain mocked/spied.',
          subsystems: {
            customerDatabase: 'CustomerDatabase (Relational Index & Realistic Queries)',
            inventoryService: 'InventoryService (Atomic Mutex Locking)',
            paymentGateway: 'MockPaymentGateway (Mocked Payment Adapter)',
            emailNotifier: 'SpyEmailNotifier (Spied Notification Dispatch)',
          },
        };
      case 3:
        return {
          layer: 3,
          name: 'Contract Verified (Production Interface Adapters)',
          description: 'Production infrastructure interface adapters implementing exact contracts for databases, warehouses, payment gateways, and email dispatchers.',
          subsystems: {
            customerDatabase: 'CustomerDatabase (Conforms to ICustomerDatabase contract)',
            inventoryService: 'InventoryService (Conforms to IInventoryService contract)',
            paymentGateway: 'PaymentGateway (Conforms to IPaymentGateway contract)',
            emailNotifier: 'EmailNotifier (Conforms to IEmailNotifier contract)',
          },
        };
      default:
        throw new Error(`Unknown layer: ${this.container.layer}`);
    }
  }
}
