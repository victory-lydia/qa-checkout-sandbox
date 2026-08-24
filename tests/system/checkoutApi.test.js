import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { SandboxContainer } from '../../src/sandbox/container.js';

describe('Week 2 & 3: System / End-to-End API Test Suite', () => {
  let app;
  let container;

  beforeEach(() => {
    container = SandboxContainer.create(1);
    app = createApp(container);
  });

  describe('GET /api/health & GET /api/sandbox/info', () => {
    it('returns 200 OK and healthcheck metadata', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.service).toBe('The QA Checkout Sandbox');
    });

    it('returns 200 OK and active sandbox layer configuration', async () => {
      const res = await request(app).get('/api/sandbox/info');
      expect(res.status).toBe(200);
      expect(res.body.layer).toBe(1);
      expect(res.body.name).toContain('Fully Isolated');
    });
  });

  describe('POST /api/checkout — Complete System Flow', () => {
    it('processes a valid checkout request and returns 201 Created with order receipt', async () => {
      const payload = {
        customerId: 'cust-101',
        items: [
          { productId: 'prod-in-stock', name: 'Wireless Headphones', unitPrice: 80.00, quantity: 2 },
        ],
        discountCode: 'SAVE10',
        paymentToken: 'tok_visa_valid',
      };

      const res = await request(app)
        .post('/api/checkout')
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.order).toBeDefined();
      expect(res.body.order.id).toMatch(/^ord_/);
      expect(res.body.pricing.subtotal).toBe(160.00);
      expect(res.body.pricing.discountAmount).toBe(16.00); // 10% of 160
      expect(res.body.pricing.taxableAmount).toBe(144.00);
      expect(res.body.pricing.taxAmount).toBe(11.52); // 144 * 0.08
      expect(res.body.order.total).toBe(155.52);
      expect(res.body.paymentReceipt.status).toBe('SUCCESS');

      // Verify created order can be retrieved via GET /api/orders/:orderId
      const orderId = res.body.order.id;
      const getRes = await request(app).get(`/api/orders/${orderId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.order.id).toBe(orderId);
      expect(getRes.body.order.total).toBe(155.52);
    });

    it('returns 400 Bad Request when request body is missing required fields', async () => {
      const res = await request(app)
        .post('/api/checkout')
        .send({
          customerId: 'cust-101',
          // missing items and paymentToken
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('ERROR');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 Not Found when customer does not exist', async () => {
      const res = await request(app)
        .post('/api/checkout')
        .send({
          customerId: 'cust-unknown-999',
          items: [{ productId: 'prod-in-stock', unitPrice: 20, quantity: 1 }],
          paymentToken: 'tok_valid',
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('returns 400 Bad Request when product is out of stock', async () => {
      const res = await request(app)
        .post('/api/checkout')
        .send({
          customerId: 'cust-101',
          items: [{ productId: 'prod-out-of-stock', unitPrice: 50, quantity: 1 }],
          paymentToken: 'tok_valid',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('OUT_OF_STOCK');
    });

    it('returns 402 Payment Required when card is declined', async () => {
      container.paymentGateway.setBehavior('DECLINED', 'Card expired or insufficient credit');

      const res = await request(app)
        .post('/api/checkout')
        .send({
          customerId: 'cust-101',
          items: [{ productId: 'prod-in-stock', unitPrice: 50, quantity: 1 }],
          paymentToken: 'tok_card_declined',
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe('PAYMENT_DECLINED');
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('returns 404 when order ID does not exist', async () => {
      const res = await request(app).get('/api/orders/ord_non_existent');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('GET /api/inventory/:productId', () => {
    it('returns stock information for existing product', async () => {
      const res = await request(app).get('/api/inventory/prod-in-stock');
      expect(res.status).toBe(200);
      expect(res.body.productId).toBe('prod-in-stock');
      expect(res.body.availableStock).toBe(100);
      expect(res.body.inStock).toBe(true);
    });
  });

  describe('404 Fallback Handler', () => {
    it('returns 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
