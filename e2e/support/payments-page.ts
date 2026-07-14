import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The fixture rebases every payment date onto `Date.now()` and the table shows
 * relative timestamps, so the rendered text only settles if the clock does.
 */
export const FIXED_TIME = new Date('2026-03-10T12:00:00.000Z');

export async function gotoPayments(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto('/');
  await waitForPaymentsTable(page);
}

/** Resolves once the artificial query delay is over, whatever the result set is. */
export async function waitForQuery(page: Page): Promise<void> {
  const region = page.getByRole('region', { name: 'Payments data' });
  await expect(region).toHaveAttribute('aria-busy', 'false');
}

/** Resolves once the query settled and real rows replaced the skeleton. */
export async function waitForPaymentsTable(page: Page): Promise<void> {
  await waitForQuery(page);
  await expect(paymentRows(page).first()).toBeVisible();
}

/**
 * Axe samples computed colors, so a half-finished fade-in reports the blended
 * color as a contrast violation. Settle animations before scanning.
 */
export async function waitForAnimations(locator: Locator): Promise<void> {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
}

export function paymentRows(page: Page) {
  return page.locator('#payments-table tbody tr');
}

export function textSearch(page: Page) {
  return page.getByRole('searchbox', { name: 'Search payments' });
}
