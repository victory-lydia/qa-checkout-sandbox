import { describe, it, expect } from '@jest/globals';
import { CustomerDatabase } from '../../src/infrastructure/customerDatabase.js';
import { FakeCustomerDatabase } from '../../src/doubles/fakeCustomerDatabase.js';
import { Order } from '../../src/domain/models.js';

describe('Contract Test: ICustomerDatabase Implementations', () => {
  const implementations = [
    { name: 'FakeCustomerDatabase (Test Double)', create: () => new FakeCustomerDatabase() },
    { name: 'CustomerDatabase (Production Implementation)', create: () => new CustomerDatabase() },
  ];

  implementations.forEach(({ name, create }) => {
    describe(`Contract conformity for ${name}`, () => {
      it('implements findById() and returns a Customer domain instance or null', async () => {
        const db = create();
        const customer = await db.findById('cust-101');
        expect(customer).toBeDefined();
        expect(customer.id).toBe('cust-101');
        expect(customer.email).toBe('alice@example.com');

        const nonExistent = await db.findById('non-existent');
        expect(nonExistent).toBeNull();
      });

      it('implements hasCustomer() returning boolean', async () => {
        const db = create();
        expect(await db.hasCustomer('cust-101')).toBe(true);
        expect(await db.hasCustomer('missing')).toBe(false);
      });

      it('implements saveOrder() and findOrderById() with exact fields preserved', async () => {
        const db = create();
        const testOrder = new Order({
          id: 'ord_contract_test_1',
          customerId: 'cust-101',
          items: [{ productId: 'item-1', unitPrice: 20, quantity: 2, subtotal: 40 }],
          subtotal: 40,
          total: 43.20,
          status: 'CONFIRMED',
        });

        const saved = await db.saveOrder(testOrder);
        expect(saved.id).toBe('ord_contract_test_1');

        const retrieved = await db.findOrderById('ord_contract_test_1');
        expect(retrieved).toBeDefined();
        expect(retrieved.id).toBe('ord_contract_test_1');
        expect(retrieved.total).toBe(43.20);
        expect(retrieved.items.length).toBe(1);
      });
    });
  });
});
