const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Automated Accessibility Audits (WCAG 2.1 AA)', () => {

  test('Homepage accessibility audit', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = accessibilityScanResults.violations;
    if (violations.length > 0) {
      console.log('Homepage a11y violations:', violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })));
    }
    expect(violations.length).toBe(0);
  });

  test('Product catalog accessibility audit', async ({ page }) => {
    await page.goto('/products.html');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations.length).toBe(0);
  });

  test('Product detail page accessibility audit', async ({ page }) => {
    await page.goto('/product-detail.html?id=qd022');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations.length).toBe(0);
  });

  test('All public pages have valid alt text on rendered images', async ({ page }) => {
    const pages = ['/', '/products.html', '/product-detail.html?id=qd022', '/education.html', '/software.html'];
    
    for (const p of pages) {
      await page.goto(p);
      const imagesWithoutAlt = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.hasAttribute('alt')).map(img => img.src);
      });
      expect(imagesWithoutAlt).toEqual([]);
    }
  });

  test('Form elements have accessible labels or placeholders', async ({ page }) => {
    await page.goto('/contact.html');
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      return inputs.filter(el => {
        const type = el.getAttribute('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') return false;
        const hasLabel = document.querySelector(`label[for="${el.id}"]`) || el.closest('label');
        const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        const hasPlaceholder = el.getAttribute('placeholder');
        return !hasLabel && !hasAria && !hasPlaceholder;
      }).map(el => el.outerHTML);
    });
    expect(unlabeledInputs.length).toBe(0);
  });

});
