const { test, expect } = require('@playwright/test');

test.describe('Security & API Access Control Audits', () => {

  test('All protected admin endpoints reject unauthenticated access with 401', async ({ request }) => {
    const protectedEndpoints = [
      { method: 'GET', url: '/api/admin/stats' },
      { method: 'GET', url: '/api/admin/products' },
      { method: 'POST', url: '/api/admin/products' },
      { method: 'PUT', url: '/api/admin/products/qd022' },
      { method: 'DELETE', url: '/api/admin/products/qd022' },
      { method: 'PATCH', url: '/api/admin/products/qd022/publish' },
      { method: 'POST', url: '/api/admin/products/qd022/duplicate' },
      { method: 'GET', url: '/api/admin/categories' },
      { method: 'POST', url: '/api/admin/categories' },
      { method: 'GET', url: '/api/admin/banners' },
      { method: 'GET', url: '/api/admin/settings' },
      { method: 'PUT', url: '/api/admin/settings' },
      { method: 'GET', url: '/api/admin/audit-logs' }
    ];

    for (const ep of protectedEndpoints) {
      let res;
      if (ep.method === 'GET') res = await request.get(ep.url);
      else if (ep.method === 'POST') res = await request.post(ep.url, { data: {} });
      else if (ep.method === 'PUT') res = await request.put(ep.url, { data: {} });
      else if (ep.method === 'PATCH') res = await request.patch(ep.url, { data: {} });
      else if (ep.method === 'DELETE') res = await request.delete(ep.url);

      expect(res.status(), `Expected 401 for ${ep.method} ${ep.url}`).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Authentication required');
    }
  });

  test('Public API is resilient against SQL Injection payloads', async ({ request }) => {
    const sqliPayloads = [
      "' OR 1=1 --",
      "'; DROP TABLE products; --",
      "' UNION SELECT username, password_hash FROM admin_users --",
      "\" OR \"\"=\"",
      "1' OR '1'='1"
    ];

    for (const payload of sqliPayloads) {
      const res = await request.get(`/api/products?search=${encodeURIComponent(payload)}`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.products)).toBe(true);

      // Verify no sensitive user hashes leaked in product data
      const jsonStr = JSON.stringify(data);
      expect(jsonStr).not.toContain('$2a$');
      expect(jsonStr).not.toContain('$2b$');
    }
  });

  test('Product creation rejects missing required fields and duplicate SKUs', async ({ request }) => {
    // 1. Get auth token
    const loginRes = await request.post('/api/admin/auth/login', {
      data: { username: 'admin', password: 'AdminPassword123!' }
    });
    const { token } = await loginRes.json();
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 2. Missing name
    const missingNameRes = await request.post('/api/admin/products', {
      headers: authHeaders,
      data: { sku: 'TEST-FAIL-01', price: 100 }
    });
    expect(missingNameRes.status()).toBe(400);

    // 3. Duplicate SKU with existing product (e.g. OXY-QD022)
    const dupSkuRes = await request.post('/api/admin/products', {
      headers: authHeaders,
      data: { name: 'Duplicate SKU Kit', sku: 'OXY-QD022', price: 100 }
    });
    expect(dupSkuRes.status()).toBe(400);
    const dupBody = await dupSkuRes.json();
    expect(dupBody.error).toContain('already in use');
  });

  test('Upload API rejects unsafe file extensions', async ({ request }) => {
    // Get token
    const loginRes = await request.post('/api/admin/auth/login', {
      data: { username: 'admin', password: 'AdminPassword123!' }
    });
    const { token } = await loginRes.json();

    // Attempt to upload dangerous file (.sh or .exe)
    const uploadRes = await request.post('/api/admin/products/qd022/images', {
      headers: { 'Authorization': `Bearer ${token}` },
      multipart: {
        images: {
          name: 'malicious.sh',
          mimeType: 'application/x-sh',
          buffer: Buffer.from('#!/bin/bash\necho "exploit"')
        }
      }
    });

    // Multer filter should reject non-images
    const body = await uploadRes.json();
    expect(uploadRes.status() === 400 || body.success === false).toBe(true);
  });

  test('Environment secrets are never exposed in public settings API', async ({ request }) => {
    const res = await request.get('/api/settings');
    expect(res.status()).toBe(200);
    const data = await res.json();
    
    const settingsStr = JSON.stringify(data.settings).toLowerCase();
    expect(settingsStr).not.toContain('jwt_secret');
    expect(settingsStr).not.toContain('password');
    expect(settingsStr).not.toContain('secret');
  });

});
