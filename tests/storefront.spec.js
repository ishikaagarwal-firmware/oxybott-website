const { test, expect } = require('@playwright/test');

test.describe('Oxybott Storefront & User Journeys', () => {

  test('Homepage loads with correct branding, meta, and dynamic products', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Check title and favicon
    await expect(page).toHaveTitle(/Oxybott/i);
    const logo = page.locator('.site-header .brand-logo-img');
    await expect(logo).toBeVisible();

    // Verify top announcement bar
    const announcement = page.locator('.announcement-content');
    await expect(announcement).toBeVisible();

    // Verify dynamic products in homepageProductGrid
    const grid = page.locator('#homepageProductGrid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('.product-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify product card contains price with INR currency symbol
    const firstCardPrice = cards.first().locator('.product-price');
    await expect(firstCardPrice).toContainText('₹');

    // Verify filter tabs toggle cards
    const roboticsTab = page.locator('.filter-tab[data-filter="Robotics"]');
    await roboticsTab.click();
    await page.waitForTimeout(300);

    const visibleRoboticsCards = grid.locator('.product-card:visible');
    const count = await visibleRoboticsCards.count();
    expect(count).toBeGreaterThan(0);

    // No severe unhandled runtime errors
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon.ico'));
    expect(criticalErrors.length).toBe(0);
  });

  test('Quick search modal finds products by keyword', async ({ page }) => {
    await page.goto('/');

    // Open search modal
    const searchTrigger = page.locator('.search-trigger').first();
    await searchTrigger.click();

    const searchModal = page.locator('#searchModalOverlay');
    await expect(searchModal).toHaveClass(/open/);

    const searchInput = page.locator('#searchModalInput');
    await searchInput.fill('arm');
    await page.waitForTimeout(300);

    const searchResults = page.locator('#searchResultsList .search-result-item');
    await expect(searchResults.first()).toBeVisible();
    await expect(searchResults.first()).toContainText('Robot Arm');

    // Close search modal using Escape
    await page.keyboard.press('Escape');
    await expect(searchModal).not.toHaveClass(/open/);
  });

  test('Product catalog filtering and sorting works correctly', async ({ page }) => {
    await page.goto('/products.html');

    const countEl = page.locator('#catalogResultsCount');
    await expect(countEl).toContainText('Showing 15 of 15 kits');

    const grid = page.locator('#catalogGrid');
    const cards = grid.locator('.product-card');
    await expect(cards).toHaveCount(15);

    // Filter by Inventor Series
    const inventorCheckbox = page.locator('input[name="seriesFilter"][value="Inventor Series"]');
    await inventorCheckbox.check();
    await page.waitForTimeout(300);

    const filteredCards = grid.locator('.product-card:visible');
    const inventorCount = await filteredCards.count();
    expect(inventorCount).toBeGreaterThan(0);
    await expect(countEl).toContainText(`Showing ${inventorCount} of 15 kits`);

    // Reset filters
    const resetBtn = page.locator('#resetFiltersBtn');
    await resetBtn.click();
    await page.waitForTimeout(300);
    await expect(grid.locator('.product-card:visible')).toHaveCount(15);

    // Sort by price ascending
    const sortSelect = page.locator('#catalogSortSelect');
    await sortSelect.selectOption('price-asc');
    await page.waitForTimeout(300);

    const firstCardPrice = await grid.locator('.product-card').first().locator('.product-price').textContent();
    const lastCardPrice = await grid.locator('.product-card').last().locator('.product-price').textContent();
    
    // Convert e.g. ₹3,319 to numeric 3319
    const parsePrice = str => parseFloat(str.replace(/[^0-9.]/g, ''));
    expect(parsePrice(firstCardPrice)).toBeLessThan(parsePrice(lastCardPrice));
  });

  test('Product detail page displays live database specs, gallery, and quantity logic', async ({ page }) => {
    await page.goto('/product-detail.html?id=qd022');

    // Title and breadcrumb
    await expect(page.locator('#pdpTitle')).toContainText('Oxybott QD022 4-DOF Programmable Robot Arm Kit');
    await expect(page.locator('#pdpBreadcrumbTitle')).toContainText('Programmable Robot Arm Kit');
    await expect(page.locator('#pdpSku')).toContainText('OXY-QD022');

    // Price
    const pdpPrice = page.locator('#pdpPrice');
    await expect(pdpPrice).toContainText('₹7,469');

    // Specs table
    const specsTable = page.locator('#pdpSpecsTable');
    await expect(specsTable.locator('tr')).toHaveCount(9);

    // Highlights
    const highlights = page.locator('#pdpHighlights .pdp-highlight-item');
    await expect(highlights).toHaveCount(6);

    // Quantity counter
    const qtyInput = page.locator('#qtyInput');
    const plusBtn = page.locator('#qtyPlusBtn');
    const btnPrice = page.locator('#pdpBtnPrice');

    await expect(qtyInput).toHaveValue('1');
    await expect(btnPrice).toContainText('₹7,469');

    await plusBtn.click();
    await expect(qtyInput).toHaveValue('2');
    await expect(btnPrice).toContainText('₹14,938');

    // Add to Cart
    const addBtn = page.locator('#pdpAddToCartBtn');
    await addBtn.click();

    // Cart drawer should open
    const cartDrawer = page.locator('#cartDrawerOverlay');
    await expect(cartDrawer).toHaveClass(/open/);

    const cartItems = page.locator('#cartDrawerItems .cart-item');
    await expect(cartItems).toHaveCount(1);
    await expect(cartItems.first()).toContainText('Programmable Robot Arm Kit');

    const subtotal = page.locator('#cartDrawerSubtotal');
    await expect(subtotal).toContainText('₹14,938');

    // Close drawer
    await page.locator('#cartCloseBtn').click();
    await expect(cartDrawer).not.toHaveClass(/open/);
  });

  test('Public content pages load without error', async ({ page }) => {
    const routes = [
      { url: '/education.html', titleSnippet: /Education/i },
      { url: '/software.html', titleSnippet: /Software/i },
      { url: '/tutorials.html', titleSnippet: /Tutorial/i },
      { url: '/about.html', titleSnippet: /About/i },
      { url: '/contact.html', titleSnippet: /Contact/i }
    ];

    for (const route of routes) {
      const res = await page.goto(route.url);
      expect(res.status()).toBe(200);
      await expect(page).toHaveTitle(route.titleSnippet);
      await expect(page.locator('.site-header')).toBeVisible();
      await expect(page.locator('.site-footer')).toBeVisible();
    }
  });

  test('Mobile viewport responsiveness and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check header and mobile toggle
    const mobileBtn = page.locator('#mobileMenuToggle');
    await expect(mobileBtn).toBeVisible();

    // Verify mobile nav drawer opens
    await mobileBtn.click();
    const navDrawer = page.locator('#mobileNavDrawer');
    await expect(navDrawer).toBeVisible();

    await page.locator('#mobileNavClose').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#mobileNavOverlay')).not.toHaveClass(/open/);

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

});
