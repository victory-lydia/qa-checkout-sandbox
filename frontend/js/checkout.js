import { api } from './api.js';
import { cart } from './cart.js';

export async function initCheckoutPage() {
  const customerSelect = document.getElementById('customer-select');
  const itemsContainer = document.getElementById('checkout-items-list');
  const checkoutSubtotal = document.getElementById('checkout-subtotal');
  const checkoutTax = document.getElementById('checkout-tax');
  const checkoutTotal = document.getElementById('checkout-total');
  const checkoutForm = document.getElementById('checkout-form');
  const alertContainer = document.getElementById('checkout-alert');
  const receiptCard = document.getElementById('receipt-card');
  const receiptDetails = document.getElementById('receipt-details');
  const btnSubmit = document.getElementById('btn-submit-order');

  if (!checkoutForm) return;

  const items = cart.getItems();

  // If cart is empty, show warning
  if (items.length === 0) {
    if (alertContainer) {
      alertContainer.innerHTML = '<div class="alert alert-warning">Your cart is currently empty. <a href="products.html" style="color:#60a5fa;">Browse Products</a> to add items before checking out.</div>';
    }
    if (btnSubmit) btnSubmit.disabled = true;
  }

  // Populate order summary
  if (itemsContainer) {
    itemsContainer.innerHTML = items.map((it) => `
      <div class="summary-row">
        <span>${it.name} <strong>× ${it.quantity}</strong></span>
        <span>$${(it.unitPrice * it.quantity).toFixed(2)}</span>
      </div>
    `).join('');
  }

  const subtotal = cart.getSubtotal();
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  if (checkoutSubtotal) checkoutSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  if (checkoutTax) checkoutTax.textContent = `$${tax.toFixed(2)}`;
  if (checkoutTotal) checkoutTotal.textContent = `$${total.toFixed(2)}`;

  // Populate test customers
  try {
    const customers = await api.getCustomers();
    if (customerSelect) {
      customerSelect.innerHTML = customers.map((c) => `
        <option value="${c.id}">${c.name} (${c.tier} - ${c.discountPerk})</option>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching customers:', err);
  }

  // Handle Checkout Form Submission
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      showAlert('Cannot checkout with an empty cart!', 'danger');
      return;
    }

    const customerId = customerSelect ? customerSelect.value : 'cust-101';
    const discountCode = document.getElementById('discount-code')?.value.trim() || null;
    const paymentToken = document.getElementById('payment-token')?.value || 'tok_visa_valid';

    const payload = {
      customerId,
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
      discountCode: discountCode || undefined,
      paymentToken,
    };

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Processing Handshakes...';
    }

    if (alertContainer) alertContainer.innerHTML = '';
    if (receiptCard) receiptCard.style.display = 'none';

    try {
      const response = await api.checkout(payload);

      if (response.ok && response.data.status === 'SUCCESS') {
        const { order, pricing, paymentReceipt, notification } = response.data;

        // Clear shopping cart on successful order
        cart.clear();

        showAlert('Order placed successfully! 6-Step subsystem handshake complete.', 'success');

        if (receiptCard && receiptDetails) {
          receiptCard.style.display = 'block';
          receiptDetails.innerHTML = `
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Customer ID:</strong> ${order.customerId}</p>
            <p><strong>Order Status:</strong> <span class="badge badge-success">${order.status}</span></p>
            <p><strong>Subtotal:</strong> $${pricing.subtotal.toFixed(2)}</p>
            <p><strong>Discount (${pricing.discountCode || 'None'}):</strong> -$${pricing.discountAmount.toFixed(2)}</p>
            <p><strong>Tax (${(pricing.taxRate * 100).toFixed(0)}%):</strong> +$${pricing.taxAmount.toFixed(2)}</p>
            <p style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-top: 8px;">
              <strong>Total Paid:</strong> $${order.total.toFixed(2)}
            </p>
            <hr style="border-color: #334155; margin: 12px 0;">
            <p><strong>Payment Transaction ID:</strong> ${paymentReceipt.transactionId}</p>
            <p><strong>Confirmation Email:</strong> <span class="badge ${notification && notification.status === 'SENT' ? 'badge-success' : 'badge-warning'}">${notification ? notification.status : 'N/A'}</span></p>
          `;
          receiptCard.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        const err = response.data;
        showAlert(`[Handshake Aborted]: ${err.message || 'Payment or validation error'} (Code: ${err.code || 'ERROR'})`, 'danger');
      }
    } catch (networkErr) {
      showAlert(`Network Communication Error: ${networkErr.message}`, 'danger');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Complete Checkout';
      }
    }
  });

  function showAlert(msg, type = 'info') {
    if (!alertContainer) return;
    alertContainer.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initCheckoutPage();
  });
}
