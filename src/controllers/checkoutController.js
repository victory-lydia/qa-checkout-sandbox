import { DomainError } from '../domain/errors.js';

/**
 * REST Controller for the Checkout API endpoints.
 */
export class CheckoutController {
  constructor(orderService, inventoryService) {
    this.orderService = orderService;
    this.inventoryService = inventoryService;
  }

  /**
   * POST /api/checkout
   */
  async handleCheckout(req, res) {
    try {
      const { customerId, items, paymentToken, discountCode, customTaxRate } = req.body || {};

      const result = await this.orderService.checkout({
        customerId,
        items,
        paymentToken,
        discountCode,
        customTaxRate,
      });

      return res.status(201).json({
        status: 'SUCCESS',
        message: 'Checkout completed successfully',
        order: result.order,
        pricing: result.pricing,
        paymentReceipt: result.paymentReceipt,
        notification: result.notification,
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * GET /api/orders/:orderId
   */
  async handleGetOrder(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.orderService.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          status: 'ERROR',
          code: 'ORDER_NOT_FOUND',
          message: `Order '${orderId}' not found`,
        });
      }

      return res.status(200).json({
        status: 'SUCCESS',
        order,
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * GET /api/inventory/:productId
   */
  async handleGetInventory(req, res) {
    try {
      const { productId } = req.params;
      const stock = await this.inventoryService.getStock(productId);
      return res.status(200).json({
        productId,
        availableStock: stock,
        inStock: stock > 0,
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * GET /api/products
   */
  async handleGetProducts(_req, res) {
    try {
      const catalog = [
        {
          id: 'prod-laptop',
          name: 'MacBook Pro 16"',
          description: 'High-performance laptop with M3 Max chip and 32GB RAM.',
          price: 1200.00,
          category: 'Electronics',
        },
        {
          id: 'prod-in-stock',
          name: 'Wireless ANC Headphones',
          description: 'Premium noise-cancelling over-ear wireless headphones.',
          price: 80.00,
          category: 'Audio',
        },
        {
          id: 'prod-keyboard',
          name: 'Mechanical Gaming Keyboard',
          description: 'RGB mechanical keyboard with hot-swappable tactile switches.',
          price: 120.00,
          category: 'Accessories',
        },
        {
          id: 'prod-last-one',
          name: 'Rare Vintage Collectible',
          description: 'Limited edition collector item. Only 1 unit remaining in warehouse.',
          price: 500.00,
          category: 'Collectibles',
        },
        {
          id: 'prod-out-of-stock',
          name: 'Sold Out Smartwatch',
          description: 'Popular smartwatch. Currently out of stock across all fulfillment centers.',
          price: 199.00,
          category: 'Wearables',
        },
      ];

      const productsWithStock = await Promise.all(
        catalog.map(async (prod) => {
          const stock = await this.inventoryService.getStock(prod.id);
          return {
            ...prod,
            stock,
            inStock: stock > 0,
          };
        })
      );

      return res.status(200).json({
        status: 'SUCCESS',
        products: productsWithStock,
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * GET /api/customers
   */
  async handleGetCustomers(_req, res) {
    try {
      const customers = [
        {
          id: 'cust-101',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          tier: 'STANDARD',
          discountPerk: '0% (Standard)',
          status: 'ACTIVE',
        },
        {
          id: 'cust-102',
          name: 'Bob Smith',
          email: 'bob@example.com',
          tier: 'PRO',
          discountPerk: '5% Automatic Loyalty Discount',
          status: 'ACTIVE',
        },
        {
          id: 'cust-103',
          name: 'Carol Suspended',
          email: 'carol@example.com',
          tier: 'STANDARD',
          discountPerk: '0%',
          status: 'SUSPENDED',
        },
        {
          id: 'cust-unknown-999',
          name: 'Unknown Customer (Simulated Miss)',
          email: 'ghost@example.com',
          tier: 'STANDARD',
          discountPerk: '0%',
          status: 'NOT_FOUND',
        },
      ];

      return res.status(200).json({
        status: 'SUCCESS',
        customers,
      });
    } catch (error) {
      return this._handleError(res, error);
    }
  }

  /**
   * GET /api/health
   */
  async handleHealthCheck(_req, res) {
    return res.status(200).json({
      status: 'HEALTHY',
      service: 'The QA Checkout Sandbox',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Map domain errors to HTTP responses.
   */
  _handleError(res, error) {
    if (error instanceof DomainError) {
      return res.status(error.statusCode).json({
        status: 'ERROR',
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({
      status: 'ERROR',
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    });
  }
}
