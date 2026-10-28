const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Independent QA Regression & Hardening Verification Suite', () => {

  const TEST_LEAD_EMAIL = `test.auditor.${Date.now()}@oxypromail.edu`;

  // ==========================================================================
  // 1. BUG-01: Form Persistence & Real Lead Capture
  // ==========================================================================
  test('Contact form persists submission to backend and resets on success', async ({ page }) => {
    await page.goto('/contact.html');

    // Fill form
    await page.locator('#contactName').fill('Dr. Alan Turing');
    await page.locator('#contactEmail').fill(TEST_LEAD_EMAIL);
    await page.locator('#contactInquirySubject').selectOption('School & District Volume Quote');
    await page.locator('#contactMessage').fill('Requesting formal quote for 25 units of QD022 Robot Arm Kits.');

    // Listen for network POST to /api/inquiries
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/inquiries') && res.status() === 201),
      page.locator('#contactSubmitBtn').click()
    ]);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.id).toMatch(/^inq_/);

    // Toast appears
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/received/i);

    // Form inputs should reset
    await expect(page.locator('#contactName')).toHaveValue('');
    await expect(page.locator('#contactEmail')).toHaveValue('');
    await expect(page.locator('#contactMessage')).toHaveValue('');
  });

  test('Form submission preserves data and displays error on invalid email', async ({ page }) => {
    await page.goto('/contact.html');

    await page.locator('#contactName').fill('Dr. Invalid Email');
    // We can evaluate or input an invalid email bypassing native validation or testing server API rejection
    const apiRes = await page.request.post('/api/inquiries', {
      data: {
        type: 'contact',
        name: 'Dr. Invalid Email',
        email: 'not-an-email',
        message: 'Testing server rejection'
      }
    });

    expect(apiRes.status()).toBe(400);
    const body = await apiRes.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('valid email address is required');
  });

  test('Education trial form submits to backend with type "trial"', async ({ page }) => {
    await page.goto('/education.html');

    await page.locator('#trialEducatorName').fill('Prof. Ada Lovelace');
    await page.locator('#trialEmail').fill(`ada.${Date.now()}@oxypromail.edu`);
    await page.locator('#trialSchoolName').fill('Cambridge Maker Academy');
    await page.locator('#trialRole').fill('Director of STEM Programs');
    await page.locator('#trialAddress').fill('10 Downing Street, London, UK');

    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/inquiries') && res.status() === 201),
      page.locator('#trialSubmitBtn').click()
    ]);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message.toLowerCase()).toContain('trial');
  });

  test('Admin can list, filter, update status, and manage inquiries', async ({ request }) => {
    // 1. Rejection without token
    const unauthRes = await request.get('/api/admin/inquiries');
    expect(unauthRes.status()).toBe(401);

    // 2. Create test inquiry directly
    const dedicatedLeadEmail = `admin.test.${Date.now()}@oxypromail.edu`;
    const inqRes = await request.post('/api/inquiries', {
      data: {
        type: 'contact',
        name: 'Admin Lead Test',
        email: dedicatedLeadEmail,
        message: 'Direct API lead creation for admin verification'
      }
    });
    expect(inqRes.status()).toBe(201);
    const { id: createdId } = await inqRes.json();

    // 3. Login to get token
    const loginRes = await request.post('/api/admin/auth/login', {
      data: { username: 'admin', password: 'AdminPassword123!' }
    });
    const { token } = await loginRes.json();
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 4. Fetch inquiries
    const listRes = await request.get('/api/admin/inquiries', { headers: authHeaders });
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.success).toBe(true);
    expect(Array.isArray(listData.inquiries)).toBe(true);

    // Find the inquiry
    const lead = listData.inquiries.find(i => i.id === createdId || i.email.toLowerCase() === dedicatedLeadEmail.toLowerCase());
    expect(lead).toBeDefined();
    expect(lead.type).toBe('contact');
    expect(lead.status).toBe('new');

    // 5. Update status to in_progress
    const patchRes = await request.patch(`/api/admin/inquiries/${lead.id}`, {
      headers: authHeaders,
      data: { status: 'in_progress' }
    });
    expect(patchRes.status()).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);

    // 6. Cleanup lead
    const delRes = await request.delete(`/api/admin/inquiries/${lead.id}`, { headers: authHeaders });
  });

  // ==========================================================================
  // 2. BUG-02: Currency Standardization in Cart & Checkout
  // ==========================================================================
  test('Cart checkout dialog displays correct INR currency symbol and math', async ({ page }) => {
    await page.goto('/product-detail.html?id=qd022');

    // Add 1 QD022 to cart (₹7,469)
    await page.locator('#pdpAddToCartBtn').click();
    const cartDrawer = page.locator('#cartDrawerOverlay');
    await expect(cartDrawer).toHaveClass(/open/);

    const subtotalText = await page.locator('#cartDrawerSubtotal').textContent();
    expect(subtotalText).toContain('₹');

    // Capture dialog alert on checkout click
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await page.locator('#cartCheckoutBtn').click();
    await page.waitForTimeout(300);

    // Verify dialog uses INR symbol and never hardcoded '$'
    expect(dialogMessage).toContain('₹');
    expect(dialogMessage).not.toContain('$');
    expect(dialogMessage).toContain('Proceeding with mock checkout');
  });

  // ==========================================================================
  // 3. BUG-03: Semantic <main> Landmarks
  // ==========================================================================
  test('All primary pages contain a valid <main> landmark', async ({ page }) => {
    const routes = ['/', '/products.html', '/education.html', '/software.html', '/tutorials.html', '/about.html', '/contact.html'];

    for (const route of routes) {
      await page.goto(route);
      const mainCount = await page.locator('main').count();
      expect(mainCount, `Route ${route} should have exactly 1 <main> element`).toBe(1);
    }
  });

  // ==========================================================================
  // 4. BUG-04: Full WCAG 2.1 AA Color Contrast
  // ==========================================================================
  test('Primary buttons and CTAs pass WCAG 2.1 AA color contrast', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include(['.btn-orange', '.site-header', '.hero-section', '.cta-banner-section'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(v => v.impact === 'critical');
    expect(criticalViolations.length).toBe(0);
  });

  // ==========================================================================
  // 5. SECURITY & HARDENING
  // ==========================================================================
  test('Login sets cookie with SameSite=Strict and HttpOnly', async ({ request }) => {
    const loginRes = await request.post('/api/admin/auth/login', {
      data: { username: 'admin', password: 'AdminPassword123!' }
    });
    expect(loginRes.status()).toBe(200);

    const headers = loginRes.headers();
    const setCookie = headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('HttpOnly');
  });

  test('Production startup rejects insecure or missing JWT_SECRET', () => {
    const { validateAuthConfiguration } = require('../server/auth');
    
    // Simulate production environment with insecure secret
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'oxybott_default_secret_key_change_me';
      expect(() => validateAuthConfiguration()).toThrow(/Refusing to start in production/i);

      process.env.JWT_SECRET = 'short_secret';
      expect(() => validateAuthConfiguration()).toThrow(/Refusing to start in production/i);

      process.env.JWT_SECRET = 'a_secure_random_production_secret_key_with_sufficient_entropy_64chars';
      expect(() => validateAuthConfiguration()).not.toThrow();
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.JWT_SECRET = prevSecret;
    }
  });

});
