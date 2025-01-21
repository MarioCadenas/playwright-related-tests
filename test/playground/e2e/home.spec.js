import { test, expect } from '../../../src/index';

test.describe('Navigation to Home page', () => {
  test('should display the page title', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByText('Home Page')).toBeVisible();
  });
});
