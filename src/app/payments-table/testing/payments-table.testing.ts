import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Payment } from '../payment';
import { PAYMENT_QUERY_DELAY } from '../payment-query-delay';
import { PAGE_SIZE_STORAGE_KEY } from '../payment-table-preferences.adapter';
import { PaymentsTable } from '../payments-table';

export { PAGE_SIZE_STORAGE_KEY };
export const paymentQueryDelay = vi.fn(() => 0);

export const payment: Payment = {
  id: 'pay_3RxQZ9Jx7yL2kA4fB8mD',
  customer: 'olivia.martin@example.com',
  amount: 249,
  currency: 'USD',
  status: 'succeeded',
  description: 'Subscription update',
  paymentMethod: {
    kind: 'card',
    brand: 'visa',
    lastFour: '4242',
  },
  createdAt: '2026-07-13T14:48:00-03:00',
  refundedAt: null,
  declineReason: null,
};

export const explicitSortPayments: readonly Payment[] = [
  {
    ...payment,
    id: 'pay_30',
    customer: 'zoe@example.com',
    amount: 200,
    status: 'disputed',
    paymentMethod: { kind: 'standalone', method: 'ach', lastFour: '6789' },
    createdAt: '2026-07-13T16:00:00Z',
  },
  {
    ...payment,
    id: 'pay_20',
    customer: 'amy@example.com',
    amount: 400,
    status: 'refunded',
    paymentMethod: { kind: 'card', brand: 'visa', lastFour: '4242' },
    createdAt: '2026-07-13T15:00:00Z',
  },
  {
    ...payment,
    id: 'pay_40',
    customer: 'ben@example.com',
    amount: 100,
    status: 'succeeded',
    paymentMethod: { kind: 'standalone', method: 'paypal' },
    createdAt: '2026-07-13T14:00:00Z',
  },
  {
    ...payment,
    id: 'pay_10',
    customer: 'morgan@example.com',
    amount: 300,
    status: 'failed',
    paymentMethod: {
      kind: 'card',
      brand: 'mastercard',
      wallet: 'apple-pay',
      lastFour: '4444',
    },
    createdAt: '2026-07-13T13:00:00Z',
  },
];

export function createPayments(count: number): readonly Payment[] {
  return Array.from({ length: count }, (_, index) => ({
    ...payment,
    id: `pay_test_${String(index + 1).padStart(4, '0')}`,
    customer: `customer.${index + 1}@example.com`,
    // Monotonic with the index so a plain Amount sort mirrors the id order.
    amount: index + 1,
  }));
}

export function setupPaymentsTableTesting(options: { navigate?: boolean } = {}): void {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    paymentQueryDelay.mockReset();
    paymentQueryDelay.mockReturnValue(0);
    await TestBed.configureTestingModule({
      imports: [PaymentsTable],
      providers: [provideRouter([]), { provide: PAYMENT_QUERY_DELAY, useValue: paymentQueryDelay }],
    }).compileComponents();

    if (options.navigate !== false) {
      await TestBed.inject(Router).navigateByUrl('/');
    }
  });

  afterEach(() => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
  });
}

export function getSortButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('.sort-button')).find(
    (candidate) => candidate.querySelector('.sort-button__label')?.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Sort button ${label} was not found.`);
  }

  return button;
}

export function renderedPaymentIds(element: HTMLElement): readonly string[] {
  return Array.from(element.querySelectorAll<HTMLElement>('tbody tr[data-payment-id]')).map(
    (row) => row.getAttribute('data-payment-id') ?? '',
  );
}

export function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Button ${label} was not found.`);
  }

  return button;
}

export function findCheckbox(element: HTMLElement, label: string): HTMLInputElement {
  const checkboxLabel = Array.from(element.querySelectorAll<HTMLLabelElement>('label')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  const checkbox = checkboxLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');

  if (!checkbox) {
    throw new Error(`Checkbox ${label} was not found.`);
  }

  return checkbox;
}

export function setNumberInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function setTextSearchInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function expectRouterState(
  router: Router,
  queryParams: Readonly<Record<string, string>>,
  fragment: string | null = null,
): void {
  const url = router.parseUrl(router.url);

  expect(url.queryParams).toEqual(queryParams);
  expect(url.fragment).toBe(fragment);
}
