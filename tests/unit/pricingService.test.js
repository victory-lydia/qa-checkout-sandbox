import { describe, it, expect } from '@jest/globals';
import { PricingService } from '../../src/services/pricingService.js';
import { ValidationError } from '../../src/domain/errors.js';

describe('Unit Test: PricingService', () => {
  const pricingService = new PricingService(0.08); // 8% tax

  describe('Subtotal Calculation & Boundary Value Analysis', () => {
    it('calculates subtotal for a single item correctly', () => {
      const result = pricingService.calculateTotal({
        items: [{ productId: 'item-1', unitPrice: 25.00, quantity: 2 }],
      });

      expect(result.subtotal).toBe(50.00);
      expect(result.taxAmount).toBe(4.00); // 50 * 0.08
      expect(result.total).toBe(54.00);
      expect(result.discountAmount).toBe(0);
    });

    it('calculates subtotal for multiple distinct items', () => {
      const result = pricingService.calculateTotal({
        items: [
          { productId: 'item-1', unitPrice: 10.50, quantity: 2 }, // 21.00
          { productId: 'item-2', unitPrice: 15.25, quantity: 4 }, // 61.00
          { productId: 'item-3', unitPrice: 5.00, quantity: 1 },  // 5.00
        ],
      });

      expect(result.subtotal).toBe(87.00);
      expect(result.taxAmount).toBe(6.96); // 87 * 0.08
      expect(result.total).toBe(93.96);
    });

    it('handles floating point precision gracefully without precision drift', () => {
      const result = pricingService.calculateTotal({
        items: [
          { productId: 'item-1', unitPrice: 0.10, quantity: 1 },
          { productId: 'item-2', unitPrice: 0.20, quantity: 1 },
        ],
      });

      expect(result.subtotal).toBe(0.30);
      expect(result.taxAmount).toBe(0.02);
      expect(result.total).toBe(0.32);
    });

    it('allows zero-priced free promotional items', () => {
      const result = pricingService.calculateTotal({
        items: [{ productId: 'freebie', unitPrice: 0.00, quantity: 1 }],
      });

      expect(result.subtotal).toBe(0.00);
      expect(result.total).toBe(0.00);
    });
  });

  describe('Promotional Coupons & Equivalence Partitioning', () => {
    const baseItems = [{ productId: 'book', unitPrice: 50.00, quantity: 2 }]; // subtotal = 100.00

    it('applies percentage discount coupon (SAVE10 = 10% off)', () => {
      const result = pricingService.calculateTotal({
        items: baseItems,
        discountCode: 'SAVE10',
      });

      expect(result.subtotal).toBe(100.00);
      expect(result.discountAmount).toBe(10.00);
      expect(result.discountCode).toBe('SAVE10');
      expect(result.taxableAmount).toBe(90.00);
      expect(result.taxAmount).toBe(7.20); // 90 * 0.08
      expect(result.total).toBe(97.20);
    });

    it('applies percentage discount coupon (SAVE20 = 20% off)', () => {
      const result = pricingService.calculateTotal({
        items: baseItems,
        discountCode: 'save20', // lower-case testing
      });

      expect(result.discountAmount).toBe(20.00);
      expect(result.taxableAmount).toBe(80.00);
      expect(result.taxAmount).toBe(6.40);
      expect(result.total).toBe(86.40);
    });

    it('applies fixed-amount discount coupon (FLAT5 = $5 off)', () => {
      const result = pricingService.calculateTotal({
        items: [{ productId: 'shirt', unitPrice: 30.00, quantity: 1 }],
        discountCode: 'FLAT5',
      });

      expect(result.subtotal).toBe(30.00);
      expect(result.discountAmount).toBe(5.00);
      expect(result.taxableAmount).toBe(25.00);
      expect(result.taxAmount).toBe(2.00); // 25 * 0.08
      expect(result.total).toBe(27.00);
    });

    it('caps fixed discount so order total does not become negative', () => {
      const result = pricingService.calculateTotal({
        items: [{ productId: 'pen', unitPrice: 4.00, quantity: 1 }],
        discountCode: 'FLAT15', // $15 off on a $4 item
      });

      expect(result.subtotal).toBe(4.00);
      expect(result.discountAmount).toBe(4.00); // capped at subtotal
      expect(result.taxableAmount).toBe(0.00);
      expect(result.taxAmount).toBe(0.00);
      expect(result.total).toBe(0.00);
    });

    it('throws ValidationError for invalid discount codes', () => {
      expect(() => {
        pricingService.calculateTotal({
          items: baseItems,
          discountCode: 'INVALID_EXPIRED_CODE',
        });
      }).toThrow(ValidationError);
    });
  });

  describe('Customer Tier Loyalty Discounts', () => {
    const items = [{ productId: 'gadget', unitPrice: 100.00, quantity: 1 }];

    it('applies 0% discount for STANDARD tier', () => {
      const result = pricingService.calculateTotal({ items, customerTier: 'STANDARD' });
      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(108.00);
    });

    it('applies 5% automatic discount for PRO tier', () => {
      const result = pricingService.calculateTotal({ items, customerTier: 'PRO' });
      expect(result.discountAmount).toBe(5.00);
      expect(result.discountCode).toBe('PRO_TIER_5PCT');
      expect(result.taxableAmount).toBe(95.00);
      expect(result.taxAmount).toBe(7.60);
      expect(result.total).toBe(102.60);
    });

    it('applies 15% automatic discount for VIP tier', () => {
      const result = pricingService.calculateTotal({ items, customerTier: 'VIP' });
      expect(result.discountAmount).toBe(15.00);
      expect(result.discountCode).toBe('VIP_TIER_15PCT');
      expect(result.taxableAmount).toBe(85.00);
      expect(result.taxAmount).toBe(6.80);
      expect(result.total).toBe(91.80);
    });

    it('prefers explicit discount coupon over automatic tier discount', () => {
      const result = pricingService.calculateTotal({
        items,
        discountCode: 'SAVE20', // 20%
        customerTier: 'PRO', // 5%
      });
      expect(result.discountAmount).toBe(20.00);
      expect(result.discountCode).toBe('SAVE20');
    });
  });

  describe('Custom Tax Rate & Input Validation Rules', () => {
    it('supports custom tax rate override (e.g., 0% for tax-exempt jurisdiction)', () => {
      const result = pricingService.calculateTotal({
        items: [{ productId: 'item', unitPrice: 50.00, quantity: 2 }],
        customTaxRate: 0.0,
      });
      expect(result.taxAmount).toBe(0.00);
      expect(result.total).toBe(100.00);
    });

    it('throws ValidationError for invalid tax rate (> 1.0 or < 0)', () => {
      expect(() => {
        pricingService.calculateTotal({
          items: [{ productId: 'item', unitPrice: 50.00, quantity: 1 }],
          customTaxRate: 1.5,
        });
      }).toThrow(ValidationError);
    });

    it('throws ValidationError for empty items list', () => {
      expect(() => {
        pricingService.calculateTotal({ items: [] });
      }).toThrow(ValidationError);
    });

    it('throws ValidationError for negative unit prices', () => {
      expect(() => {
        pricingService.calculateTotal({
          items: [{ productId: 'item', unitPrice: -10.00, quantity: 1 }],
        });
      }).toThrow(ValidationError);
    });

    it('throws ValidationError for non-integer or zero quantities', () => {
      expect(() => {
        pricingService.calculateTotal({
          items: [{ productId: 'item', unitPrice: 10.00, quantity: 0 }],
        });
      }).toThrow(ValidationError);

      expect(() => {
        pricingService.calculateTotal({
          items: [{ productId: 'item', unitPrice: 10.00, quantity: 1.5 }],
        });
      }).toThrow(ValidationError);
    });
  });
});
