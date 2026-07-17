import { expect, test } from '@playwright/test';
import {
  gotoPayments,
  paymentRows,
  textSearch,
  waitForPaymentsTable,
} from '../support/payments-page';

test.beforeEach(async ({ page }) => {
  await gotoPayments(page);
});

test('renders the payments table with rows', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Transactions', level: 1 })).toBeVisible();
  expect(await paymentRows(page).count()).toBeGreaterThan(0);
});

test('text search narrows the table down to the matching payment', async ({ page }) => {
  await textSearch(page).fill('olivia.martin@example.com');
  await waitForPaymentsTable(page);

  await expect(paymentRows(page)).toHaveCount(1);
  await expect(paymentRows(page).first()).toContainText('olivia.martin@example.com');
});

test('clearing the text search restores every row', async ({ page }) => {
  const rowCount = await paymentRows(page).count();

  await textSearch(page).fill('olivia.martin@example.com');
  await waitForPaymentsTable(page);
  await page.getByRole('button', { name: 'Clear text search filter' }).click();
  await waitForPaymentsTable(page);

  await expect(paymentRows(page)).toHaveCount(rowCount);
});

test('activating a column header sorts by that column', async ({ page }) => {
  const amountHeader = page.getByRole('columnheader', { name: /Amount/ });

  await amountHeader.getByRole('button', { name: 'Amount', exact: true }).click();
  await waitForPaymentsTable(page);

  await expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
});

test('loading skeleton fills the table viewport and blocks scrolling', async ({ page }) => {
  const region = page.getByRole('region', { name: 'Payments data' });
  const amountHeader = page.getByRole('columnheader', { name: /Amount/ });
  const initialScrollLeft = await region.evaluate((element) => {
    const scroll = element as HTMLElement;
    scroll.scrollTop = 120;
    scroll.scrollLeft = Math.min(30, scroll.scrollWidth - scroll.clientWidth);
    return scroll.scrollLeft;
  });

  await amountHeader.getByRole('button', { name: 'Amount', exact: true }).click();
  await expect(region).toHaveAttribute('aria-busy', 'true');

  const loading = await region.evaluate((element) => {
    const scroll = element as HTMLElement;
    const lastSkeletonRow = scroll.querySelector<HTMLElement>('.payment-skeleton-row:last-child');
    const scrollRect = scroll.getBoundingClientRect();
    const styles = getComputedStyle(scroll);

    return {
      clientHeight: scroll.clientHeight,
      scrollHeight: scroll.scrollHeight,
      scrollLeft: scroll.scrollLeft,
      scrollTop: scroll.scrollTop,
      overflowX: styles.overflowX,
      overflowY: styles.overflowY,
      skeletonRows: scroll.querySelectorAll('.payment-skeleton-row').length,
      lastSkeletonOffset: lastSkeletonRow
        ? Math.abs(lastSkeletonRow.getBoundingClientRect().bottom - scrollRect.bottom)
        : Number.POSITIVE_INFINITY,
      windowScrollY: window.scrollY,
    };
  });

  expect(loading.overflowX).toBe('hidden');
  expect(loading.overflowY).toBe('hidden');
  expect(loading.scrollTop).toBe(0);
  expect(loading.scrollLeft).toBe(initialScrollLeft);
  expect(loading.scrollHeight).toBeLessThanOrEqual(loading.clientHeight + 1);
  expect(loading.skeletonRows).toBeGreaterThan(0);
  expect(loading.lastSkeletonOffset).toBeLessThanOrEqual(1);

  const regionBox = await region.boundingBox();

  if (!regionBox) {
    throw new Error('Payments data region is not visible.');
  }

  await page.mouse.move(regionBox.x + regionBox.width / 2, regionBox.y + regionBox.height / 2);
  await page.mouse.wheel(200, 400);

  await expect
    .poll(() =>
      region.evaluate((element) => {
        const scroll = element as HTMLElement;
        return {
          scrollLeft: scroll.scrollLeft,
          scrollTop: scroll.scrollTop,
          windowScrollY: window.scrollY,
        };
      }),
    )
    .toEqual({
      scrollLeft: initialScrollLeft,
      scrollTop: 0,
      windowScrollY: loading.windowScrollY,
    });

  await waitForPaymentsTable(page);
});

test('a table row links through to its details page', async ({ page }) => {
  await page.locator('tbody tr[data-payment-id] .customer').first().click();

  await expect(page).toHaveURL(/\/payments\/pay_/);
});
