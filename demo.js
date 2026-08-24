/**
 * The QA Checkout Sandbox - Main Entrypoint & Demo Runner
 *
 * This interactive demo demonstrates the complete 6-step checkout flow,
 * the test doubles in action, and the 3 sandbox layers.
 *
 * To run:
 *   node demo.js
 */

import { SandboxEngine } from './src/sandbox/sandboxEngine.js';

async function runDemo() {
  console.log('===============================================================');
  console.log('            WELCOME TO THE QA CHECKOUT SANDBOX                ');
  console.log('===============================================================');

  // 1. Initialize Layer 1 (Isolated Sandbox with Fakes, Mocks, Stubs, and Spies)
  console.log('\n[1] Initializing Sandbox Layer 1 (Fully Isolated)...');
  const engine = new SandboxEngine(1);
  const container = engine.getContainer();

  // 2. Perform a successful checkout transaction
  console.log('\n[2] Executing Customer Checkout Flow:');
  console.log('    - Customer: Alice Johnson (cust-101)');
  console.log('    - Items:    2x Wireless Headphones ($80.00 each)');
  console.log('    - Coupon:   SAVE10 (10% Discount)');
  console.log('    - Payment:  tok_visa_valid');

  try {
    const result = await container.orderService.checkout({
      customerId: 'cust-101',
      items: [
        { productId: 'prod-in-stock', name: 'Wireless Headphones', unitPrice: 80.00, quantity: 2 },
      ],
      discountCode: 'SAVE10',
      paymentToken: 'tok_visa_valid',
    });

    console.log('\n✅ [3] Checkout Completed Successfully:');
    console.log('---------------------------------------------------------------');
    console.log(`  Order ID:          ${result.order.id}`);
    console.log(`  Status:            ${result.order.status}`);
    console.log(`  Subtotal:          $${result.pricing.subtotal.toFixed(2)}`);
    console.log(`  Discount (SAVE10): -$${result.pricing.discountAmount.toFixed(2)}`);
    console.log(`  Tax (8%):          +$${result.pricing.taxAmount.toFixed(2)}`);
    console.log(`  Total Charged:     $${result.order.total.toFixed(2)}`);
    console.log(`  Transaction ID:    ${result.paymentReceipt.transactionId}`);
    console.log(`  Email Dispatched:  ${result.notification.status} to alice@example.com`);
    console.log('---------------------------------------------------------------');

    // 3. Inspect Test Double Records
    console.log('\n[4] Inspecting Test Double Internal State:');
    console.log(`  - MockPaymentGateway Recorded Charges:  ${container.paymentGateway.getChargeCount()}`);
    console.log(`  - SpyEmailNotifier Logged Emails:       ${container.emailNotifier.getSentEmailCount()}`);
    console.log(`  - FakeCustomerDatabase Total Orders:    ${container.customerDatabase.getAllOrders().length}`);

    console.log('\n===============================================================');
    console.log('  Sandbox Demo finished successfully!');
    console.log('  Run "npm test" to execute all automated test suites.');
    console.log('===============================================================');
  } catch (error) {
    console.error('❌ Demo encountered an error:', error.message);
  }
}

runDemo();
