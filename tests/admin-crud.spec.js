const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard & Product Lifecycle', () => {

  const TEST_PRODUCT_ID = 'qa-temp-autotest-kit';
  const TEST_SKU = 'OXY-QA-AUTO-001';

  test('Admin authentication handles invalid credentials and successful login', async ({ page }) => {
    await page.goto('/admin/');

    // Login screen should be visible
    const loginScreen = page.locator('#loginScreen');
    await expect(loginScreen).toBeVisible();

    // Test invalid login
    await page.locator('#loginUsername').fill('admin');
    await page.locator('#loginPassword').fill('WrongPassword999!');
    await page.locator('#loginBtn').click();

    const alertBox = page.locator('#loginAlert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText(/Invalid username or password/i);

    // Test valid login
    await page.locator('#loginPassword').fill('AdminPassword123!');
    await page.locator('#loginBtn').click();

    // Admin shell should become visible
    const adminShell = page.locator('#adminShell');
    await expect(adminShell).toBeVisible();
    await expect(page.locator('#headerWelcome')).toContainText('admin');

    // Overview KPIs should be populated
    const totalProdEl = page.locator('#metricTotalProducts');
    await expect(totalProdEl).not.toHaveText('0');
  });

  test('Complete product lifecycle: create, update, unpublish, and cleanup', async ({ page }) => {
    // 1. Log in via UI
    await page.goto('/admin/');
    await page.locator('#loginUsername').fill('admin');
    await page.locator('#loginPassword').fill('AdminPassword123!');
    await page.locator('#loginBtn').click();
    await expect(page.locator('#adminShell')).toBeVisible();

    // 2. Open Products view
    await page.locator('.sidebar-nav .nav-link[data-section="sectionProducts"]').click();
    await expect(page.locator('#sectionProducts')).toHaveClass(/active/);

    // 3. Open Add Product Modal
    await page.locator('#openAddProductModalBtn').click();
    const modal = page.locator('#productModal');
    await expect(modal).toHaveClass(/open/);

    // 4. Fill Product Form
    await page.locator('#editProdName').fill('Oxybott QA Automation Test Robot');
    await page.locator('#editProdSku').fill(TEST_SKU);
    await page.locator('#editProdShortName').fill('QA Test Robot');
    await page.locator('#editProdSeries').selectOption('Inventor Series');
    await page.locator('#editProdPrice').fill('5500');
    await page.locator('#editProdSalePrice').fill('6500');
    await page.locator('#editProdStock').fill('30');
    await page.locator('#editProdAge').fill('12+');
    await page.locator('#editProdTagline').fill('Automated Test Kit for QA Verification');
    await page.locator('#editProdDescription').fill('This is a temporary test kit created during automated QA auditing.');
    
    // Add specification
    const specKeyInputs = page.locator('#specsRowsContainer input[placeholder="e.g. Microcontroller"]');
    const specValInputs = page.locator('#specsRowsContainer input[placeholder="e.g. ESP32 Dual Core"]');
    if (await specKeyInputs.count() > 0) {
      await specKeyInputs.first().fill('Test Processor');
      await specValInputs.first().fill('Dual-Core ESP32 240MHz');
    }

    // Save Product
    await page.locator('#saveProductBtn').click();
    await page.waitForTimeout(500);

    // If modal re-opened in edit mode to allow image upload, dismiss it to inspect table
    const closeBtn = page.locator('#closeProductModalBtn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
    await expect(modal).not.toHaveClass(/open/);

    // 5. Verify product appears in Admin table
    const searchInput = page.locator('#productSearchInput');
    await searchInput.fill(TEST_SKU);
    await page.waitForTimeout(400);

    const productRow = page.locator('#productsTableBody tr').first();
    await expect(productRow).toContainText(TEST_SKU);
    await expect(productRow).toContainText('Oxybott QA Automation Test Robot');
    await expect(productRow).toContainText('₹5500.00');

    // 6. Verify product appears in public catalog API
    const pubRes = await page.request.get('/api/products');
    const pubData = await pubRes.json();
    const foundInPublic = pubData.products.find(p => p.sku === TEST_SKU);
    expect(foundInPublic).toBeDefined();
    expect(foundInPublic.price).toBe(5500);

    // 7. Toggle to Draft via UI button
    const publishToggleBtn = productRow.locator('button', { hasText: 'Published' });
    await publishToggleBtn.click();
    await page.waitForTimeout(500);

    // Verify button text switched to Draft
    await expect(productRow.locator('button', { hasText: 'Draft' })).toBeVisible();

    // 8. Verify Draft product is hidden from public API
    const pubResAfterDraft = await page.request.get('/api/products');
    const pubDataAfterDraft = await pubResAfterDraft.json();
    const foundAfterDraft = pubDataAfterDraft.products.find(p => p.sku === TEST_SKU);
    expect(foundAfterDraft).toBeUndefined();

    // 9. Clean up test product via Delete button
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    const deleteBtn = productRow.locator('button.btn-danger');
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Verify test product is removed from table
    await searchInput.fill(TEST_SKU);
    await page.waitForTimeout(300);
    const tableBody = page.locator('#productsTableBody');
    await expect(tableBody).toContainText('No products found matching filters');
  });

  test('Audit trail logs record administrative actions', async ({ page }) => {
    // Log in and check audit section
    await page.goto('/admin/');
    await page.locator('#loginUsername').fill('admin');
    await page.locator('#loginPassword').fill('AdminPassword123!');
    await page.locator('#loginBtn').click();
    await expect(page.locator('#adminShell')).toBeVisible();

    await page.locator('.sidebar-nav .nav-link[data-section="sectionAudit"]').click();
    await expect(page.locator('#sectionAudit')).toHaveClass(/active/);

    const auditRows = page.locator('#fullAuditTableBody tr');
    const count = await auditRows.count();
    expect(count).toBeGreaterThan(0);
    
    // First row should contain admin username
    await expect(auditRows.first()).toContainText('admin');
  });

});
