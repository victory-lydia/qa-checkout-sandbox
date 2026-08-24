#!/usr/bin/env node

/**
 * Sandbox CLI Runner
 * Allows testing and inspecting different sandbox configuration layers.
 *
 * Usage:
 *   npm run sandbox -- --layer=1
 *   npm run sandbox -- --layer=2
 *   npm run sandbox -- --layer=3
 */

import { SandboxEngine } from '../src/sandbox/sandboxEngine.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let layer = 1;
  let runSample = true;

  for (const arg of args) {
    if (arg.startsWith('--layer=')) {
      layer = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--no-sample') {
      runSample = false;
    }
  }

  return { layer, runSample };
}

async function main() {
  const { layer, runSample } = parseArgs();

  console.log('===============================================================');
  console.log('            THE QA CHECKOUT SANDBOX ENGINE                   ');
  console.log('===============================================================');

  const engine = new SandboxEngine(layer);
  const info = engine.describeLayer();

  console.log(`\n[Active Layer]: Layer ${info.layer} — ${info.name}`);
  console.log(`[Description]:  ${info.description}`);
  console.log('\n[Subsystem Configuration]:');
  for (const [key, value] of Object.entries(info.subsystems)) {
    console.log(`  - ${key.padEnd(18)}: ${value}`);
  }

  if (runSample) {
    console.log('\n[Executing Sample Checkout Simulation]...');
    const container = engine.getContainer();

    try {
      const result = await container.orderService.checkout({
        customerId: 'cust-101',
        items: [{ productId: 'prod-in-stock', unitPrice: 45.00, quantity: 2 }],
        paymentToken: 'tok_visa_4242',
      });

      console.log('\n✅ Sample Checkout Completed Successfully:');
      console.log(`  - Order ID:           ${result.order.id}`);
      console.log(`  - Customer ID:        ${result.order.customerId}`);
      console.log(`  - Subtotal:           $${result.pricing.subtotal.toFixed(2)}`);
      console.log(`  - Tax (${(result.pricing.taxRate * 100).toFixed(0)}%):           $${result.pricing.taxAmount.toFixed(2)}`);
      console.log(`  - Total Charged:      $${result.order.total.toFixed(2)}`);
      console.log(`  - Status:             ${result.order.status}`);
      console.log(`  - Payment Txn ID:     ${result.paymentReceipt.transactionId}`);
      console.log(`  - Notification:       ${result.notification ? result.notification.status : 'N/A'}`);
    } catch (err) {
      console.error(`\n❌ Sample Checkout Failed: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n===============================================================');
  console.log('  Sandbox engine operational. Ready for test execution.');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Fatal Sandbox Error:', err);
  process.exit(1);
});
