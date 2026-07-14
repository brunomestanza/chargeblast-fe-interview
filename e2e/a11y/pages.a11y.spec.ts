import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  FIXED_TIME,
  gotoPayments,
  textSearch,
  waitForAnimations,
  waitForQuery,
} from '../support/payments-page';

/** AGENTS.md requires WCAG AA, so the scan is pinned to the AA rule sets. */
const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

test('payments list has no accessibility violations', async ({ page }) => {
  await gotoPayments(page);

  const results = await scan(page).analyze();

  expect(results.violations).toEqual([]);
});

test('payments list with an open filter popover has no accessibility violations', async ({
  page,
}) => {
  await gotoPayments(page);
  await page.getByRole('button', { name: 'Add Status filter' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await waitForAnimations(dialog);

  const results = await scan(page).analyze();

  expect(results.violations).toEqual([]);
});

test('empty search results have no accessibility violations', async ({ page }) => {
  await gotoPayments(page);
  await textSearch(page).fill('no-payment-matches-this-query');
  await waitForQuery(page);

  const results = await scan(page).analyze();

  expect(results.violations).toEqual([]);
});

test('payment details page has no accessibility violations', async ({ page }) => {
  await gotoPayments(page);
  await page
    .getByRole('link', { name: /^View details for payment/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/payments\/pay_/);

  const results = await scan(page).analyze();

  expect(results.violations).toEqual([]);
});

test('settings page has no accessibility violations', async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const results = await scan(page).analyze();

  expect(results.violations).toEqual([]);
});
