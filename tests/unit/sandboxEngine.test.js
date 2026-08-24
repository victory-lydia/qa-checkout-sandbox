import { describe, it, expect } from '@jest/globals';
import { SandboxContainer } from '../../src/sandbox/container.js';
import { SandboxEngine } from '../../src/sandbox/sandboxEngine.js';

describe('Unit Test: Sandbox Container and Engine', () => {
  it('instantiates Layer 1 (Isolated) correctly with all doubled subsystems', () => {
    const container = SandboxContainer.create(1);
    expect(container.layer).toBe(1);
    expect(container.customerDatabase.constructor.name).toBe('FakeCustomerDatabase');
    expect(container.inventoryService.constructor.name).toBe('StubInventoryService');
    expect(container.paymentGateway.constructor.name).toBe('MockPaymentGateway');
    expect(container.emailNotifier.constructor.name).toBe('SpyEmailNotifier');
  });

  it('instantiates Layer 2 (Partially Integrated) with realistic DB and inventory', () => {
    const container = SandboxContainer.create(2);
    expect(container.layer).toBe(2);
    expect(container.customerDatabase.constructor.name).toBe('CustomerDatabase');
    expect(container.inventoryService.constructor.name).toBe('InventoryService');
    expect(container.paymentGateway.constructor.name).toBe('MockPaymentGateway');
    expect(container.emailNotifier.constructor.name).toBe('SpyEmailNotifier');
  });

  it('instantiates Layer 3 (Contract Verified) with production interface adapters', () => {
    const container = SandboxContainer.create(3);
    expect(container.layer).toBe(3);
    expect(container.customerDatabase.constructor.name).toBe('CustomerDatabase');
    expect(container.inventoryService.constructor.name).toBe('InventoryService');
    expect(container.paymentGateway.constructor.name).toBe('PaymentGateway');
    expect(container.emailNotifier.constructor.name).toBe('EmailNotifier');
  });

  it('throws error for invalid layer number', () => {
    expect(() => SandboxContainer.create(99)).toThrow(/Invalid Sandbox Layer/);
  });

  it('provides comprehensive metadata descriptions for all 3 layers via SandboxEngine', () => {
    for (const layer of [1, 2, 3]) {
      const engine = new SandboxEngine(layer);
      const desc = engine.describeLayer();
      expect(desc.layer).toBe(layer);
      expect(desc.name).toBeDefined();
      expect(desc.description).toBeDefined();
      expect(desc.subsystems).toBeDefined();
      expect(engine.getLayer()).toBe(layer);
      expect(engine.getContainer()).toBeDefined();
    }
  });

  it('allows custom overrides in SandboxContainer.create()', () => {
    const customContainer = SandboxContainer.create(1, { taxRate: 0.12 });
    expect(customContainer.pricingService.defaultTaxRate).toBe(0.12);
  });
});
