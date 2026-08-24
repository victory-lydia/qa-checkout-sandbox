import { describe, it, expect } from '@jest/globals';
import { InventoryService } from '../../src/infrastructure/inventoryService.js';
import { StubInventoryService } from '../../src/doubles/stubInventoryService.js';
import { OutOfStockError } from '../../src/domain/errors.js';

describe('Contract Test: IInventoryService Implementations', () => {
  const implementations = [
    { name: 'StubInventoryService (Test Double)', create: () => new StubInventoryService() },
    { name: 'InventoryService (Production Adapter)', create: () => new InventoryService() },
  ];

  implementations.forEach(({ name, create }) => {
    describe(`Contract conformity for ${name}`, () => {
      it('implements getStock(), checkStock(), reserveStock(), and releaseStock()', async () => {
        const inventory = create();
        inventory.setStock('contract-item', 5);

        expect(await inventory.getStock('contract-item')).toBe(5);
        expect(await inventory.checkStock('contract-item', 3)).toBe(true);
        expect(await inventory.checkStock('contract-item', 10)).toBe(false);

        // Reserve 2 items -> remaining should be 3
        const resId = await inventory.reserveStock('contract-item', 2);
        expect(resId).toBeDefined();
        expect(await inventory.getStock('contract-item')).toBe(3);

        // Release 1 item -> remaining should be 4
        await inventory.releaseStock('contract-item', 1);
        expect(await inventory.getStock('contract-item')).toBe(4);
      });

      it('throws OutOfStockError when attempting to reserve more than available stock', async () => {
        const inventory = create();
        inventory.setStock('contract-item-scarce', 1);

        await expect(inventory.reserveStock('contract-item-scarce', 2)).rejects.toThrow(OutOfStockError);
      });
    });
  });
});
