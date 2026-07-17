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

/**
 * Axe cannot flag this: a focusable logo or timestamp is valid markup, it just
 * makes every row cost a handful of keystrokes to walk past. Each row may only
 * hold the payment link and its copy button.
 */
test('table rows only offer tab stops that do something', async ({ page }) => {
  await gotoPayments(page);

  const rowCount = await page.locator('tbody tr').count();
  const stops: string[] = [];

  for (let i = 0; i < rowCount * 6; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || !active.closest('tbody')) {
        return null;
      }
      return active.tagName.toLowerCase() + '.' + active.className.toString().split(' ')[0];
    });

    if (stop === null) {
      if (stops.length > 0) {
        break;
      }
      continue;
    }
    stops.push(stop);
  }

  expect(new Set(stops)).toEqual(new Set(['input.', 'button.row-menu']));
  expect(stops.length).toBe(rowCount * 2);
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
  await page.locator('tbody tr[data-payment-id] .customer').first().click();
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
