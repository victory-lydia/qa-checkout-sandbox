import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SandboxContainer } from './sandbox/container.js';
import { SandboxEngine } from './sandbox/sandboxEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Express Application Factory.
 * Accepts an optional Dependency Injection container or creates one for the desired layer.
 */
export function createApp(containerOrLayer = 1) {
  let container;
  if (typeof containerOrLayer === 'number' || typeof containerOrLayer === 'string') {
    container = SandboxContainer.create(Number(containerOrLayer));
  } else if (containerOrLayer && containerOrLayer.checkoutController) {
    container = containerOrLayer;
  } else {
    container = SandboxContainer.create(1);
  }

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../frontend')));
  app.use(express.static(path.join(__dirname, '../public')));

  // Store container in app locals for inspection/testing
  app.locals.container = container;

  const controller = container.checkoutController;
  let activeEngine = new SandboxEngine(container.layer);

  // Health and Sandbox Metadata
  app.get('/api/health', (req, res) => controller.handleHealthCheck(req, res));
  app.get('/api/sandbox/info', (_req, res) => {
    res.status(200).json(activeEngine.describeLayer());
  });
  app.post('/api/sandbox/layer', (req, res) => {
    const { layer } = req.body || {};
    try {
      const newContainer = SandboxContainer.create(layer);
      app.locals.container = newContainer;
      activeEngine = new SandboxEngine(newContainer.layer);
      return res.status(200).json({
        status: 'SUCCESS',
        message: `Active sandbox layer switched to Layer ${newContainer.layer}`,
        ...activeEngine.describeLayer(),
      });
    } catch (err) {
      return res.status(400).json({
        status: 'ERROR',
        message: err.message,
      });
    }
  });

  // Core E-Commerce Catalog & Checkout Endpoints
  app.get('/api/products', (req, res) => controller.handleGetProducts(req, res));
  app.get('/api/customers', (req, res) => controller.handleGetCustomers(req, res));
  app.post('/api/checkout', (req, res) => controller.handleCheckout(req, res));
  app.get('/api/orders/:orderId', (req, res) => controller.handleGetOrder(req, res));
  app.get('/api/inventory/:productId', (req, res) => controller.handleGetInventory(req, res));

  // Fallback 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      status: 'ERROR',
      code: 'ROUTE_NOT_FOUND',
      message: 'Endpoint does not exist',
    });
  });

  return app;
}

// Default export creates an app with Layer 1 for direct imports
export default createApp(1);
