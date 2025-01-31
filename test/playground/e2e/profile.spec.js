import { test, expect } from '../../../src/index';

test.describe('Navigation to Profile page', () => {
  test('should display the page title', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('Profile Page')).toBeVisible();
  });
});
