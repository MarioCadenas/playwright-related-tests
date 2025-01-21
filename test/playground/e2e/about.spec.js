import { test, expect } from '../../../src/index';

test.describe('Navigation to About page', () => {
  test('should display the page title', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText('About Page')).toBeVisible();
  });
});
