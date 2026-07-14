import { expect, test } from '@playwright/test';
import { FIXED_TIME, gotoPayments } from '../support/payments-page';

test('payments list matches the baseline', async ({ page }) => {
  await gotoPayments(page);

  await expect(page).toHaveScreenshot('payments-list.png', { fullPage: true });
});

test('payments list matches the baseline in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoPayments(page);

  await expect(page).toHaveScreenshot('payments-list-dark.png', { fullPage: true });
});

test('status filter popover matches the baseline', async ({ page }) => {
  await gotoPayments(page);
  await page.getByRole('button', { name: 'Add Status filter' }).click();

  await expect(page.getByRole('dialog')).toHaveScreenshot('status-filter-popover.png');
});

test('payment details page matches the baseline', async ({ page }) => {
  await gotoPayments(page);
  await page
    .getByRole('link', { name: /^View details for payment/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/payments\/pay_/);

  await expect(page).toHaveScreenshot('payment-details.png', { fullPage: true });
});

test('settings page matches the baseline', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await expect(page).toHaveScreenshot('settings.png', { fullPage: true });
});
