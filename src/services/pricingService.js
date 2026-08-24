import { ValidationError } from '../domain/errors.js';

/**
 * Pricing and Tax calculation engine.
 * Pure business logic component - ideal for extensive unit testing,
 * boundary value analysis, and equivalence partitioning.
 */
export class PricingService {
  constructor(defaultTaxRate = 0.08) {
    this.defaultTaxRate = defaultTaxRate; // 8% default sales tax
    this.validCoupons = new Map([
      ['SAVE10', { type: 'PERCENT', value: 10, description: '10% off order' }],
      ['SAVE20', { type: 'PERCENT', value: 20, description: '20% off order' }],
      ['FLAT5', { type: 'FIXED', value: 5.00, description: '$5 flat discount' }],
      ['FLAT15', { type: 'FIXED', value: 15.00, description: '$15 flat discount' }],
    ]);
  }

  /**
   * Helper to round monetary amounts to 2 decimal places to prevent floating point inaccuracies.
   */
  roundMoney(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Calculate order total, discounts, and taxes.
   *
   * @param {Object} params
   * @param {Array} params.items - List of OrderItems with unitPrice and quantity
   * @param {string} [params.discountCode] - Optional promotional coupon
   * @param {number} [params.customTaxRate] - Optional tax rate override
   * @param {string} [params.customerTier] - Customer tier: 'STANDARD' | 'PRO' | 'VIP'
   * @param {string} [params.currency] - Currency ISO code (default USD)
   */
  calculateTotal({
    items,
    discountCode = null,
    customTaxRate = null,
    customerTier = 'STANDARD',
    currency = 'USD',
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Items list must be a non-empty array');
    }

    let rawSubtotal = 0;
    for (const item of items) {
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        throw new ValidationError(`Invalid item unit price for product '${item.productId}': must be non-negative`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new ValidationError(`Invalid item quantity for product '${item.productId}': must be positive integer`);
      }
      rawSubtotal += item.unitPrice * item.quantity;
    }

    const subtotal = this.roundMoney(rawSubtotal);
    let discountAmount = 0;
    let appliedDiscountCode = null;

    // Apply coupon code if provided
    if (discountCode) {
      const normalizedCode = discountCode.trim().toUpperCase();
      const coupon = this.validCoupons.get(normalizedCode);
      if (!coupon) {
        throw new ValidationError(`Invalid or expired discount code: '${discountCode}'`);
      }

      appliedDiscountCode = normalizedCode;
      if (coupon.type === 'PERCENT') {
        discountAmount = this.roundMoney((subtotal * coupon.value) / 100);
      } else if (coupon.type === 'FIXED') {
        discountAmount = Math.min(subtotal, coupon.value);
      }
    } else if (customerTier === 'PRO') {
      // Automatic 5% loyalty discount for PRO members
      discountAmount = this.roundMoney((subtotal * 5) / 100);
      appliedDiscountCode = 'PRO_TIER_5PCT';
    } else if (customerTier === 'VIP') {
      // Automatic 15% loyalty discount for VIP members
      discountAmount = this.roundMoney((subtotal * 15) / 100);
      appliedDiscountCode = 'VIP_TIER_15PCT';
    }

    // Ensure discount never exceeds subtotal
    discountAmount = Math.min(subtotal, discountAmount);
    const discountedSubtotal = this.roundMoney(subtotal - discountAmount);

    // Calculate sales tax
    const taxRate = typeof customTaxRate === 'number' ? customTaxRate : this.defaultTaxRate;
    if (taxRate < 0 || taxRate > 1) {
      throw new ValidationError(`Tax rate must be between 0.0 and 1.0 (got ${taxRate})`);
    }

    const taxAmount = this.roundMoney(discountedSubtotal * taxRate);
    const total = this.roundMoney(discountedSubtotal + taxAmount);

    return {
      subtotal,
      discountAmount,
      discountCode: appliedDiscountCode,
      taxableAmount: discountedSubtotal,
      taxRate,
      taxAmount,
      total,
      currency,
    };
  }
}
