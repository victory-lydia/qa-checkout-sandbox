/**
 * Frontend API Client communicating with the Express Backend via Fetch API.
 */

const API_BASE = '/api';

export const api = {
  async getProducts() {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error(`Failed to fetch products (HTTP ${res.status})`);
    const data = await res.json();
    return data.products || [];
  },

  async getCustomers() {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error(`Failed to fetch customers (HTTP ${res.status})`);
    const data = await res.json();
    return data.customers || [];
  },

  async getInventory(productId) {
    const res = await fetch(`${API_BASE}/inventory/${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error(`Failed to fetch inventory (HTTP ${res.status})`);
    return res.json();
  },

  async checkout(payload) {
    const res = await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  },

  async getOrder(orderId) {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`);
    const data = await res.json();
    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getSandboxInfo() {
    const res = await fetch(`${API_BASE}/sandbox/info`);
    return res.json();
  },

  async setSandboxLayer(layer) {
    const res = await fetch(`${API_BASE}/sandbox/layer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layer: Number(layer) }),
    });
    return res.json();
  },
};
