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
  await expect(page.getByRole('heading', { name: 'Payments', level: 1 })).toBeVisible();
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

test('a payment ID links through to its details page', async ({ page }) => {
  await page
    .getByRole('link', { name: /^View details for payment/ })
    .first()
    .click();

  await expect(page).toHaveURL(/\/payments\/pay_/);
});
