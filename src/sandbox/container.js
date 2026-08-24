import { FakeCustomerDatabase } from '../doubles/fakeCustomerDatabase.js';
import { MockPaymentGateway } from '../doubles/mockPaymentGateway.js';
import { StubInventoryService } from '../doubles/stubInventoryService.js';
import { SpyEmailNotifier } from '../doubles/spyEmailNotifier.js';
import { CustomerDatabase } from '../infrastructure/customerDatabase.js';
import { InventoryService } from '../infrastructure/inventoryService.js';
import { PaymentGateway } from '../infrastructure/paymentGateway.js';
import { EmailNotifier } from '../infrastructure/emailNotifier.js';
import { PricingService } from '../services/pricingService.js';
import { OrderService } from '../services/orderService.js';
import { CheckoutController } from '../controllers/checkoutController.js';

/**
 * Dependency Injection Container for The QA Checkout Sandbox.
 * Configures Layer 1, Layer 2, or Layer 3 based on runtime configuration.
 */
export class SandboxContainer {
  static create(layer = 1, options = {}) {
    let customerDatabase;
    let inventoryService;
    let paymentGateway;
    let emailNotifier;

    switch (Number(layer)) {
      case 1:
        // Layer 1: Fully Isolated
        // Uses purely doubled subsystems for fast, offline, side-effect-free testing
        customerDatabase = options.customerDatabase || new FakeCustomerDatabase();
        inventoryService = options.inventoryService || new StubInventoryService();
        paymentGateway = options.paymentGateway || new MockPaymentGateway();
        emailNotifier = options.emailNotifier || new SpyEmailNotifier();
        break;

      case 2:
        // Layer 2: Partially Integrated
        // Realistic in-memory relational database & inventory, doubled external third parties
        customerDatabase = options.customerDatabase || new CustomerDatabase();
        inventoryService = options.inventoryService || new InventoryService();
        paymentGateway = options.paymentGateway || new MockPaymentGateway();
        emailNotifier = options.emailNotifier || new SpyEmailNotifier();
        break;

      case 3:
        // Layer 3: Contract Verified
        // Uses production infrastructure implementations with verified API contracts
        customerDatabase = options.customerDatabase || new CustomerDatabase();
        inventoryService = options.inventoryService || new InventoryService();
        paymentGateway = options.paymentGateway || new PaymentGateway();
        emailNotifier = options.emailNotifier || new EmailNotifier();
        break;

      default:
        throw new Error(`Invalid Sandbox Layer: '${layer}'. Supported layers are 1, 2, or 3.`);
    }

    const pricingService = options.pricingService || new PricingService(options.taxRate || 0.08);

    const orderService = new OrderService({
      customerDatabase,
      inventoryService,
      paymentGateway,
      emailNotifier,
      pricingService,
    });

    const checkoutController = new CheckoutController(orderService, inventoryService);

    return {
      layer: Number(layer),
      customerDatabase,
      inventoryService,
      paymentGateway,
      emailNotifier,
      pricingService,
      orderService,
      checkoutController,
    };
  }
}
