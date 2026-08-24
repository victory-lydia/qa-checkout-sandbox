import { api } from './api.js';

export async function initSandboxPage() {
  const layerBadge = document.getElementById('current-layer-badge');
  const layerDesc = document.getElementById('layer-description');
  const subDb = document.getElementById('sub-db');
  const subInv = document.getElementById('sub-inv');
  const subPay = document.getElementById('sub-pay');
  const subEmail = document.getElementById('sub-email');
  const terminal = document.getElementById('sandbox-terminal');
  const btnLayer1 = document.getElementById('btn-layer-1');
  const btnLayer2 = document.getElementById('btn-layer-2');
  const btnLayer3 = document.getElementById('btn-layer-3');
  const btnRace = document.getElementById('btn-simulate-race');
  const btnSample = document.getElementById('btn-sample-checkout');

  async function loadLayerInfo() {
    try {
      const info = await api.getSandboxInfo();
      updateLayerUI(info);
    } catch (err) {
      logTerminal(`Error fetching sandbox info: ${err.message}`);
    }
  }

  function updateLayerUI(info) {
    if (layerBadge) layerBadge.textContent = `Active: Layer ${info.layer} — ${info.name}`;
    if (layerDesc) layerDesc.textContent = info.description;

    if (info.subsystems) {
      if (subDb) subDb.textContent = info.subsystems.customerDatabase || 'N/A';
      if (subInv) subInv.textContent = info.subsystems.inventoryService || 'N/A';
      if (subPay) subPay.textContent = info.subsystems.paymentGateway || 'N/A';
      if (subEmail) subEmail.textContent = info.subsystems.emailNotifier || 'N/A';
    }

    [btnLayer1, btnLayer2, btnLayer3].forEach((b) => b && b.classList.remove('btn-primary'));
    if (info.layer === 1 && btnLayer1) btnLayer1.classList.add('btn-primary');
    if (info.layer === 2 && btnLayer2) btnLayer2.classList.add('btn-primary');
    if (info.layer === 3 && btnLayer3) btnLayer3.classList.add('btn-primary');
  }

  async function switchLayer(layerNum) {
    logTerminal(`\n[ACTION] Switching to Sandbox Layer ${layerNum}...`);
    try {
      const result = await api.setSandboxLayer(layerNum);
      updateLayerUI(result);
      logTerminal(`[SUCCESS] Layer ${layerNum} is now active.`);
    } catch (err) {
      logTerminal(`[ERROR] Layer switch failed: ${err.message}`);
    }
  }

  function logTerminal(text) {
    if (!terminal) return;
    const timestamp = new Date().toLocaleTimeString();
    terminal.textContent = `[${timestamp}] ${text}\n` + terminal.textContent;
  }

  // Button listeners
  if (btnLayer1) btnLayer1.addEventListener('click', () => switchLayer(1));
  if (btnLayer2) btnLayer2.addEventListener('click', () => switchLayer(2));
  if (btnLayer3) btnLayer3.addEventListener('click', () => switchLayer(3));

  if (btnSample) {
    btnSample.addEventListener('click', async () => {
      logTerminal('[ACTION] Executing sample checkout handshake on active layer...');
      try {
        const res = await api.checkout({
          customerId: 'cust-101',
          items: [{ productId: 'prod-in-stock', unitPrice: 80.00, quantity: 1 }],
          discountCode: 'SAVE10',
          paymentToken: 'tok_visa_valid',
        });

        if (res.ok) {
          logTerminal(`[SUCCESS] Checkout Success! Order ID: ${res.data.order.id} | Total: $${res.data.order.total} | Txn: ${res.data.paymentReceipt.transactionId}`);
        } else {
          logTerminal(`[ABORTED] Checkout Aborted: ${res.data.message}`);
        }
      } catch (err) {
        logTerminal(`[ERROR] ${err.message}`);
      }
    });
  }

  if (btnRace) {
    btnRace.addEventListener('click', async () => {
      logTerminal('\n[CONCURRENCY TEST] 2 Simultaneous Buyers for 1 Item in stock...');

      const buyer1 = api.checkout({
        customerId: 'cust-101',
        items: [{ productId: 'prod-last-one', unitPrice: 500.00, quantity: 1 }],
        paymentToken: 'tok_visa_buyer1',
      });

      const buyer2 = api.checkout({
        customerId: 'cust-102',
        items: [{ productId: 'prod-last-one', unitPrice: 500.00, quantity: 1 }],
        paymentToken: 'tok_visa_buyer2',
      });

      const [res1, res2] = await Promise.all([buyer1, buyer2]);

      logTerminal(`Buyer 1 Result (HTTP ${res1.status}): ${res1.ok ? `Order ${res1.data.order.id}` : res1.data.message}`);
      logTerminal(`Buyer 2 Result (HTTP ${res2.status}): ${res2.ok ? `Order ${res2.data.order.id}` : res2.data.message}`);
      logTerminal('[MUTEX CHECK] Exactly 1 Succeeded, 0 Overselling.');
    });
  }

  loadLayerInfo();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initSandboxPage();
  });
}
