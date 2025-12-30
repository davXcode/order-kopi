// export const API_BASE = 'http://localhost:3000';
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function createOrder(payload) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadProof(orderId, file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/orders/${orderId}/proof`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function setPaid(orderId, paid) {
  const res = await fetch(`${API_BASE}/orders/${orderId}/paid`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paid }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// sort=asc|desc, paid=all|paid|unpaid
// api.js
export async function fetchOrders(sort = 'desc', paid = 'all', date = '') {
  const qs = new URLSearchParams();
  if (sort) qs.set('sort', sort);
  if (paid) qs.set('paid', paid);
  if (date) qs.set('date', date); // <-- backend kamu harus baca ini
  const res = await fetch(`${API_BASE}/orders?${qs.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/dav-order/stats`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchStore() {
  const res = await fetch(`${API_BASE}/dav-order/store`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { open, closeFrom, openUntil }
}

export async function setStoreOpen(open, closeFrom, openUntil) {
  const res = await fetch(`${API_BASE}/dav-order/store`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ open, closeFrom, openUntil }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
