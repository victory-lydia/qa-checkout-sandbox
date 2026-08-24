import { test, expect } from '@playwright/test';

test.describe('End-to-End (E2E) Checkout Journey & Error Handshakes', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('User Journey: Browse products -> Add to Cart -> Modify Qty -> Complete Checkout', async ({ page }) => {
    // 1. Open Products page
    await page.goto('/products.html');
    await expect(page.locator('.page-title')).toHaveText('Available Products');

    // 2. Locate product card for Wireless Headphones and add to cart
    const headphonesCard = page.locator('.product-card', { hasText: 'Wireless ANC Headphones' });
    await expect(headphonesCard).toBeVisible();
    await headphonesCard.locator('.add-to-cart-btn').click();

    // Verify cart badge updated to 1
    await expect(page.locator('#cart-count')).toHaveText('1');

    // 3. Open Shopping Cart page
    await page.goto('/cart.html');
    await expect(page.locator('.page-title')).toHaveText('Your Shopping Cart');

    // Verify item row is rendered
    const itemRow = page.locator('#cart-items-body tr');
    await expect(itemRow).toHaveCount(1);
    await expect(itemRow).toContainText('Wireless ANC Headphones');

    // 4. Increase quantity to 2
    await itemRow.locator('.btn-inc').click();
    await expect(itemRow.locator('.qty-input')).toHaveValue('2');
    await expect(page.locator('#cart-subtotal')).toHaveText('$160.00');

    // 5. Proceed to Checkout
    await page.locator('#btn-proceed-checkout').click();
    await expect(page).toHaveURL(/.*checkout\.html/);

    // 6. Fill Checkout form with coupon 'SAVE10'
    await page.selectOption('#customer-select', 'cust-101'); // Alice Johnson
    await page.selectOption('#discount-code', 'SAVE10');
    await page.selectOption('#payment-token', 'tok_visa_valid');

    // 7. Submit order
    await page.locator('#btn-submit-order').click();

    // 8. Verify Order Confirmation Receipt
    const receiptCard = page.locator('#receipt-card');
    await expect(receiptCard).toBeVisible({ timeout: 5000 });
    await expect(receiptCard).toContainText('Order Status: CONFIRMED');
    await expect(receiptCard).toContainText('Total Paid: $155.52');
    await expect(page.locator('#checkout-alert')).toContainText('Order placed successfully');
  });

  test('Failure Handshake: Card Declined triggers rollback and error alert', async ({ page }) => {
    // Add product to cart and go to checkout
    await page.goto('/products.html');
    await page.locator('.product-card', { hasText: 'Wireless ANC Headphones' }).locator('.add-to-cart-btn').click();
    await page.goto('/checkout.html');

    // Select declined card token
    await page.selectOption('#customer-select', 'cust-101');
    await page.selectOption('#payment-token', 'tok_declined');

    // Submit order
    await page.locator('#btn-submit-order').click();

    // Verify error alert
    const alert = page.locator('#checkout-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Handshake Aborted');
    await expect(alert).toContainText('PAYMENT_DECLINED');

    // Verify receipt was NOT displayed
    await expect(page.locator('#receipt-card')).toBeHidden();
  });

  test('Failure Handshake: Suspended customer account returns 403 error', async ({ page }) => {
    await page.goto('/products.html');
    await page.locator('.product-card', { hasText: 'Mechanical Gaming Keyboard' }).locator('.add-to-cart-btn').click();
    await page.goto('/checkout.html');

    // Select suspended customer
    await page.selectOption('#customer-select', 'cust-103'); // Carol Suspended
    await page.locator('#btn-submit-order').click();

    const alert = page.locator('#checkout-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('CUSTOMER_SUSPENDED');
  });

  test('Testing Sandbox Dashboard: Layer switching and Concurrency simulation', async ({ page }) => {
    await page.goto('/sandbox.html');
    await expect(page.locator('.page-title')).toContainText('Testing Sandbox Dashboard');

    // Test layer switching
    await page.locator('#btn-layer-2').click();
    await expect(page.locator('#current-layer-badge')).toContainText('Layer 2');

    await page.locator('#btn-layer-1').click();
    await expect(page.locator('#current-layer-badge')).toContainText('Layer 1');

    // Simulate concurrency race condition
    await page.locator('#btn-simulate-race').click();
    await expect(page.locator('#sandbox-terminal')).toContainText('Exactly 1 Succeeded');
  });
});
