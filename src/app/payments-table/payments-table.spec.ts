import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Payment } from './payment';
import { formatCreatedDate, formatRelativeTime } from './payment-row';
import { PaymentsTable } from './payments-table';

const PAGE_SIZE_STORAGE_KEY = 'chargeblast.payments.page-size';

const payment: Payment = {
  id: 'pay_3RxQZ9Jx7yL2kA4fB8mD',
  customer: 'olivia.martin@example.com',
  amount: 249,
  currency: 'USD',
  status: 'succeeded',
  paymentMethod: {
    kind: 'card',
    brand: 'visa',
    lastFour: '4242',
  },
  createdAt: '2026-07-13T14:48:00-03:00',
};

function createPayments(count: number): readonly Payment[] {
  return Array.from({ length: count }, (_, index) => ({
    ...payment,
    id: `pay_test_${String(index + 1).padStart(4, '0')}`,
    customer: `customer.${index + 1}@example.com`,
  }));
}

const explicitSortPayments: readonly Payment[] = [
  {
    ...payment,
    id: 'pay_30',
    customer: 'zoe@example.com',
    amount: 200,
    status: 'pending',
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

const explicitSortCases = [
  {
    label: 'Payment ID',
    urlKey: 'payment-id',
    expectedIds: ['pay_10', 'pay_20', 'pay_30', 'pay_40'],
  },
  {
    label: 'Customer',
    urlKey: 'customer',
    expectedIds: ['pay_20', 'pay_40', 'pay_10', 'pay_30'],
  },
  {
    label: 'Amount',
    urlKey: 'amount',
    expectedIds: ['pay_40', 'pay_30', 'pay_10', 'pay_20'],
  },
  {
    label: 'Status',
    urlKey: 'status',
    expectedIds: ['pay_10', 'pay_30', 'pay_20', 'pay_40'],
  },
  {
    label: 'Payment method',
    urlKey: 'payment-method',
    expectedIds: ['pay_30', 'pay_10', 'pay_40', 'pay_20'],
  },
] as const;

function getSortButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('.sort-button')).find(
    (candidate) => candidate.querySelector('.sort-button__label')?.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Sort button ${label} was not found.`);
  }

  return button;
}

function renderedPaymentIds(element: HTMLElement): readonly string[] {
  return Array.from(element.querySelectorAll<HTMLElement>('.payment-id')).map(
    (paymentId) => paymentId.getAttribute('title') ?? '',
  );
}

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );

  if (!button) {
    throw new Error(`Button ${label} was not found.`);
  }

  return button;
}

function findCheckbox(element: HTMLElement, label: string): HTMLInputElement {
  const checkboxLabel = Array.from(element.querySelectorAll<HTMLLabelElement>('label')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  const checkbox = checkboxLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');

  if (!checkbox) {
    throw new Error(`Checkbox ${label} was not found.`);
  }

  return checkbox;
}

function setNumberInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setTextSearchInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function expectRouterState(
  router: Router,
  queryParams: Readonly<Record<string, string>>,
  fragment: string | null = null,
): void {
  const url = router.parseUrl(router.url);

  expect(url.queryParams).toEqual(queryParams);
  expect(url.fragment).toBe(fragment);
}

describe('PaymentsTable', () => {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [PaymentsTable],
      providers: [provideRouter([])],
    }).compileComponents();
    await TestBed.inject(Router).navigateByUrl('/');
  });

  afterEach(() => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
  });

  it('shows 25 payments by default and offers the supported page sizes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(126));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const pageSizeSelect = element.querySelector<HTMLSelectElement>('#payments-page-size');
    const pageSizeOptions = Array.from(pageSizeSelect?.options ?? []).map((option) => option.value);
    const buttons = element.querySelectorAll<HTMLButtonElement>('.pagination button');

    expect(pageSizeSelect?.value).toBe('25');
    expect(pageSizeOptions).toEqual(['25', '50', '100']);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(element.querySelector('label[for="payments-page-size"]')?.textContent?.trim()).toBe(
      'Rows per page',
    );
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 1–25 of 126 payments',
    );
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(false);
  });

  it('renders an accessible text search and keeps Clean all filters disabled without filters', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search');
    const cleanFiltersButton = findButton(element, 'Clean all filters');

    expect(searchInput?.type).toBe('search');
    expect(searchInput?.getAttribute('aria-controls')).toBe('payments-table');
    expect(searchInput?.getAttribute('aria-describedby')).toBe('payments-text-search-help');
    expect(element.querySelector('label[for="payments-text-search"]')?.textContent?.trim()).toBe(
      'Search payments',
    );
    expect(element.querySelector('#payments-text-search-help')?.textContent?.trim()).toBe(
      'Results update two seconds after you stop typing.',
    );
    expect(element.querySelector('.text-search-filter__clear')).toBeNull();
    expect(cleanFiltersButton.type).toBe('button');
    expect(cleanFiltersButton.disabled).toBe(true);
  });

  it('restarts the two-second text-search delay after each input and writes it last in the URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?sort=amount.desc&view=compact#payments-table');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;
      const cleanFiltersButton = findButton(element, 'Clean all filters');

      setTextSearchInput(searchInput, 'amy');
      fixture.detectChanges();

      expect(cleanFiltersButton.disabled).toBe(false);
      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc&view=compact#payments-table');

      vi.advanceTimersByTime(1_500);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc&view=compact#payments-table');

      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();
      vi.advanceTimersByTime(1_999);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc&view=compact#payments-table');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40']);
      expect(router.url).toBe('/?view=compact&sort=amount.desc&text-search=ben#payments-table');
      expect(element.textContent).toContain('Text search filter applied: ben. 1 payment found.');

      setTextSearchInput(searchInput, '3R');
      fixture.detectChanges();
      vi.advanceTimersByTime(2_000);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual([]);
      expect(element.querySelector('.payments-empty')?.textContent?.trim()).toBe(
        'No payments match the selected filters.',
      );
      expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe(
        '0 payments',
      );
      expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
        'Viewing 0 of 0 payments',
      );
      expect(router.url.endsWith('text-search=3R#payments-table')).toBe(true);
      expect(element.textContent).toContain('Text search filter applied: 3R. 0 payments found.');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('debounces clearing text search while preserving every other active filter', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?status=failed&text-search=pay_target');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      { ...payment, id: 'pay_target', status: 'failed', createdAt: '2026-07-13T16:00:00Z' },
      {
        ...payment,
        id: 'pay_other_failed',
        customer: 'other@example.com',
        status: 'failed',
        createdAt: '2026-07-13T15:00:00Z',
      },
      {
        ...payment,
        id: 'pay_succeeded',
        customer: 'success@example.com',
        status: 'succeeded',
        createdAt: '2026-07-13T14:00:00Z',
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;

      expect(searchInput.value).toBe('pay_target');
      expect(renderedPaymentIds(element)).toEqual(['pay_target']);

      const clearTextSearchButton = element.querySelector<HTMLButtonElement>(
        '.text-search-filter__clear',
      );

      expect(clearTextSearchButton?.type).toBe('button');
      expect(clearTextSearchButton?.getAttribute('aria-label')).toBe('Clear text search filter');

      clearTextSearchButton?.click();
      fixture.detectChanges();

      expect(searchInput.value).toBe('');
      expect(document.activeElement).toBe(searchInput);
      expect(element.querySelector('.text-search-filter__clear')).toBeNull();

      vi.advanceTimersByTime(1_999);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_target']);
      expect(router.url).toBe('/?status=failed&text-search=pay_target');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_target', 'pay_other_failed']);
      expectRouterState(router, { status: 'failed' });
      expect(element.textContent).toContain('Text search filter cleared. 2 payments found.');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('restores text search immediately and canonicalizes it to the end of the URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?text-search=PAY_30&view=compact&status=pending#payments-table');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLInputElement>('#payments-text-search')?.value).toBe('PAY_30');
    expect(renderedPaymentIds(element)).toEqual(['pay_30']);
    expect(router.url).toBe('/?view=compact&status=pending&text-search=PAY_30#payments-table');
  });

  it('cancels a pending draft when external URL navigation restores the applied search', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?text-search=amy');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;

      expect(renderedPaymentIds(element)).toEqual(['pay_20']);
      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();
      vi.advanceTimersByTime(1_000);

      await router.navigateByUrl('/?view=compact&text-search=amy');
      fixture.detectChanges();

      expect(searchInput.value).toBe('amy');
      expect(renderedPaymentIds(element)).toEqual(['pay_20']);

      vi.advanceTimersByTime(1_000);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(searchInput.value).toBe('amy');
      expect(renderedPaymentIds(element)).toEqual(['pay_20']);
      expect(router.url).toBe('/?view=compact&text-search=amy');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('clears all filters immediately, preserves unrelated URL state, and cancels pending search', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?sort=amount.desc&view=compact&date-range=2026-07-13..2026-07-13&status=failed&payment-method=wallet:apple-pay&amount-range=200.00..400.00&text-search=pay_10#payments-table',
    );

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;
      const cleanFiltersButton = findButton(element, 'Clean all filters');

      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(cleanFiltersButton.disabled).toBe(false);

      setTextSearchInput(searchInput, 'amy');
      fixture.detectChanges();
      cleanFiltersButton.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(searchInput.value).toBe('');
      expect(document.activeElement).toBe(searchInput);
      expect(cleanFiltersButton.disabled).toBe(true);
      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expectRouterState(router, { view: 'compact', sort: 'amount.desc' }, 'payments-table');
      expect(element.querySelectorAll('.filter-button__value')).toHaveLength(0);
      expect(element.textContent).toContain('All payment filters cleared. 4 payments found.');

      vi.advanceTimersByTime(2_000);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expectRouterState(router, { view: 'compact', sort: 'amount.desc' }, 'payments-table');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('applies and clears the Date range filter before sorting and pagination', async () => {
    const now = Date.now();
    const recentPayment: Payment = {
      ...payment,
      id: 'pay_recent',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    };
    const oldPayment: Payment = {
      ...payment,
      id: 'pay_old',
      customer: 'older.customer@example.com',
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [oldPayment, recentPayment]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();

    const preset = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.date-filter__presets button'),
    ).find((button) => button.textContent?.trim() === '30d')!;
    const apply = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.date-filter__actions button'),
    ).find((button) => button.textContent?.trim() === 'Apply')!;

    preset.click();
    fixture.detectChanges();
    apply.click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_recent']);
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('1 payment');
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 1–1 of 1 payment',
    );
    expect(element.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Last 30 days',
    );

    element.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_recent', 'pay_old']);
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('2 payments');
    expect(element.querySelector('.filter-button__value')).toBeNull();
  });

  it('filters by multiple statuses and keeps their selection order in the filter button', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(statusFilter, 'Succeeded').click();
    fixture.detectChanges();
    findCheckbox(statusFilter, 'Failed').click();
    fixture.detectChanges();
    findButton(statusFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_10']);
    expect(statusFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Succeeded, Failed',
    );
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('2 payments');
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 1–2 of 2 payments',
    );
    expect(element.textContent).toContain(
      'Status filter applied: Succeeded, Failed. 2 payments found.',
    );

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);
    expect(statusFilter.querySelector('.filter-button__value')).toBeNull();
    expect(element.textContent).toContain('Status filter cleared. 4 payments found.');
  });

  it('filters by payment methods across groups while keeping wallets exclusive from cards', () => {
    const paymentMethodPayments: readonly Payment[] = [
      {
        ...payment,
        id: 'pay_card_visa',
        paymentMethod: { kind: 'card', brand: 'visa', lastFour: '4242' },
        createdAt: '2026-07-13T16:00:00Z',
      },
      {
        ...payment,
        id: 'pay_wallet_google',
        paymentMethod: {
          kind: 'card',
          brand: 'visa',
          wallet: 'google-pay',
          lastFour: '5454',
        },
        createdAt: '2026-07-13T15:00:00Z',
      },
      {
        ...payment,
        id: 'pay_bank_ach',
        paymentMethod: { kind: 'standalone', method: 'ach', lastFour: '6789' },
        createdAt: '2026-07-13T14:00:00Z',
      },
      {
        ...payment,
        id: 'pay_service_paypal',
        paymentMethod: { kind: 'standalone', method: 'paypal' },
        createdAt: '2026-07-13T13:00:00Z',
      },
      {
        ...payment,
        id: 'pay_bank_pix',
        paymentMethod: { kind: 'standalone', method: 'pix' },
        createdAt: '2026-07-13T12:00:00Z',
      },
    ];
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', paymentMethodPayments);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const paymentMethodFilter = element.querySelector<HTMLElement>('app-payment-method-filter')!;

    paymentMethodFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(paymentMethodFilter, 'Visa').click();
    findCheckbox(paymentMethodFilter, 'Google Pay').click();
    findCheckbox(paymentMethodFilter, 'ACH Direct Debit').click();
    findCheckbox(paymentMethodFilter, 'PayPal').click();
    fixture.detectChanges();
    findButton(paymentMethodFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual([
      'pay_card_visa',
      'pay_wallet_google',
      'pay_bank_ach',
      'pay_service_paypal',
    ]);
    expect(paymentMethodFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Visa +3',
    );
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('4 payments');
    expect(element.textContent).toContain(
      'Payment method filter applied: Visa, Google Pay, ACH Direct Debit, PayPal. 4 payments found.',
    );

    paymentMethodFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual([
      'pay_card_visa',
      'pay_wallet_google',
      'pay_bank_ach',
      'pay_service_paypal',
      'pay_bank_pix',
    ]);
    expect(element.textContent).toContain('Payment method filter cleared. 5 payments found.');
  });

  it('filters inclusive USD bounds after converting every displayed currency with the ECB mock', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      { ...payment, id: 'pay_usd_below', amount: 99.99, currency: 'USD' },
      { ...payment, id: 'pay_usd_minimum', amount: 100, currency: 'USD' },
      { ...payment, id: 'pay_eur_converted', amount: 100, currency: 'EUR' },
      { ...payment, id: 'pay_brl_converted', amount: 584.31, currency: 'BRL' },
      { ...payment, id: 'pay_jpy_converted', amount: 18_501, currency: 'JPY' },
      { ...payment, id: 'pay_usd_above', amount: 115.01, currency: 'USD' },
      { ...payment, id: 'pay_unknown_currency', amount: 110, currency: 'XYZ' },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const amountFilter = element.querySelector<HTMLElement>('app-amount-range-filter')!;

    amountFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    const amountInputs = amountFilter.querySelectorAll<HTMLInputElement>('input[type="number"]');
    setNumberInput(amountInputs[0], '100');
    setNumberInput(amountInputs[1], '115');
    fixture.detectChanges();
    findButton(amountFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual([
      'pay_usd_minimum',
      'pay_eur_converted',
      'pay_brl_converted',
      'pay_jpy_converted',
    ]);
    expect(amountFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      '$100.00 to $115.00',
    );
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('4 payments');
    expect(element.textContent).toContain(
      'Amount range filter applied: $100.00 to $115.00. 4 payments found.',
    );

    amountFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toHaveLength(7);
    expect(renderedPaymentIds(element)).toContain('pay_unknown_currency');
    expect(element.textContent).toContain('Amount range filter cleared. 7 payments found.');
  });

  it('combines amount, payment method, status, and date filters with AND semantics', async () => {
    const now = Date.now();
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        id: 'pay_recent_failed_visa',
        amount: 20,
        status: 'failed',
        createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_recent_failed_paypal',
        amount: 40,
        status: 'failed',
        paymentMethod: { kind: 'standalone', method: 'paypal' },
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_recent_succeeded_paypal',
        status: 'succeeded',
        paymentMethod: { kind: 'standalone', method: 'paypal' },
        createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_recent_failed_google_pay_visa',
        status: 'failed',
        paymentMethod: {
          kind: 'card',
          brand: 'visa',
          wallet: 'google-pay',
          lastFour: '5454',
        },
        createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_old_failed_visa',
        status: 'failed',
        createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const paymentMethodFilter = element.querySelector<HTMLElement>('app-payment-method-filter')!;
    const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;
    const dateFilter = element.querySelector<HTMLElement>('app-date-range-filter')!;
    const amountFilter = element.querySelector<HTMLElement>('app-amount-range-filter')!;

    paymentMethodFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(paymentMethodFilter, 'Visa').click();
    findCheckbox(paymentMethodFilter, 'PayPal').click();
    findButton(paymentMethodFilter, 'Apply').click();
    fixture.detectChanges();

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(statusFilter, 'Failed').click();
    findButton(statusFilter, 'Apply').click();
    fixture.detectChanges();

    dateFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findButton(dateFilter, '30d').click();
    fixture.detectChanges();
    findButton(dateFilter, 'Apply').click();
    fixture.detectChanges();

    amountFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    const amountInputs = amountFilter.querySelectorAll<HTMLInputElement>('input[type="number"]');
    setNumberInput(amountInputs[0], '10');
    setNumberInput(amountInputs[1], '30');
    fixture.detectChanges();
    findButton(amountFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_recent_failed_visa']);
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('1 payment');
  });

  it('combines the status and date filters before sorting and pagination', async () => {
    const now = Date.now();
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        id: 'pay_recent_succeeded',
        status: 'succeeded',
        createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_recent_failed',
        status: 'failed',
        createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        ...payment,
        id: 'pay_old_failed',
        status: 'failed',
        createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;
    const dateFilter = element.querySelector<HTMLElement>('app-date-range-filter')!;

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(statusFilter, 'Failed').click();
    fixture.detectChanges();
    findButton(statusFilter, 'Apply').click();
    fixture.detectChanges();

    dateFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findButton(dateFilter, '30d').click();
    fixture.detectChanges();
    findButton(dateFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_recent_failed']);
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('1 payment');
  });

  it('restores every filter with sorting from the initial URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?date-range=2026-07-13..2026-07-13&status=failed,succeeded&payment-method=method:paypal,wallet:apple-pay&amount-range=100.00..300.00&sort=amount.desc',
    );

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dateFilter = element.querySelector<HTMLElement>('app-date-range-filter')!;
    const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;
    const paymentMethodFilter = element.querySelector<HTMLElement>('app-payment-method-filter')!;
    const amountFilter = element.querySelector<HTMLElement>('app-amount-range-filter')!;

    expect(dateFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Jul 13, 2026',
    );
    expect(statusFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'Failed, Succeeded',
    );
    expect(paymentMethodFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      'PayPal, Apple Pay',
    );
    expect(amountFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
      '$100.00 to $300.00',
    );
    expect(renderedPaymentIds(element)).toEqual(['pay_10', 'pay_40']);
    expect(getSortButton(element, 'Amount').closest('th')?.getAttribute('aria-sort')).toBe(
      'descending',
    );
  });

  it('writes and clears each filter query while preserving sort and unrelated URL state', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?sort=amount.desc&view=compact#payments-table');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dateFilter = element.querySelector<HTMLElement>('app-date-range-filter')!;
    const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;
    const paymentMethodFilter = element.querySelector<HTMLElement>('app-payment-method-filter')!;
    const amountFilter = element.querySelector<HTMLElement>('app-amount-range-filter')!;

    dateFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findButton(dateFilter, '30d').click();
    fixture.detectChanges();
    findButton(dateFilter, 'Apply').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      { sort: 'amount.desc', view: 'compact', 'date-range': 'last-30-days' },
      'payments-table',
    );

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(statusFilter, 'Succeeded').click();
    findCheckbox(statusFilter, 'Failed').click();
    fixture.detectChanges();
    findButton(statusFilter, 'Apply').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      {
        sort: 'amount.desc',
        view: 'compact',
        'date-range': 'last-30-days',
        status: 'succeeded,failed',
      },
      'payments-table',
    );

    paymentMethodFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    findCheckbox(paymentMethodFilter, 'Visa').click();
    findCheckbox(paymentMethodFilter, 'PayPal').click();
    fixture.detectChanges();
    findButton(paymentMethodFilter, 'Apply').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      {
        sort: 'amount.desc',
        view: 'compact',
        'date-range': 'last-30-days',
        status: 'succeeded,failed',
        'payment-method': 'card:visa,method:paypal',
      },
      'payments-table',
    );

    amountFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
    fixture.detectChanges();
    const amountInputs = amountFilter.querySelectorAll<HTMLInputElement>('input[type="number"]');
    setNumberInput(amountInputs[0], '100');
    setNumberInput(amountInputs[1], '400');
    fixture.detectChanges();
    findButton(amountFilter, 'Apply').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      {
        sort: 'amount.desc',
        view: 'compact',
        'date-range': 'last-30-days',
        status: 'succeeded,failed',
        'payment-method': 'card:visa,method:paypal',
        'amount-range': '100.00..400.00',
      },
      'payments-table',
    );

    dateFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      {
        sort: 'amount.desc',
        view: 'compact',
        status: 'succeeded,failed',
        'payment-method': 'card:visa,method:paypal',
        'amount-range': '100.00..400.00',
      },
      'payments-table',
    );

    statusFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      {
        sort: 'amount.desc',
        view: 'compact',
        'payment-method': 'card:visa,method:paypal',
        'amount-range': '100.00..400.00',
      },
      'payments-table',
    );

    paymentMethodFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(
      router,
      { sort: 'amount.desc', view: 'compact', 'amount-range': '100.00..400.00' },
      'payments-table',
    );

    amountFilter.querySelector<HTMLButtonElement>('.filter-button__clear')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expectRouterState(router, { sort: 'amount.desc', view: 'compact' }, 'payments-table');
  });

  it('restores filters and sorting from a later URL navigation and returns to page one', async () => {
    const payments = createPayments(51).map((candidate, index): Payment => {
      if (index === 0) {
        return {
          ...candidate,
          id: 'pay_failed_paypal_small',
          amount: 10,
          status: 'failed',
          paymentMethod: { kind: 'standalone', method: 'paypal' },
        };
      }

      if (index === 1) {
        return {
          ...candidate,
          id: 'pay_failed_paypal_large',
          amount: 20,
          status: 'failed',
          paymentMethod: { kind: 'standalone', method: 'paypal' },
        };
      }

      return candidate;
    });
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', payments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nextButton = element.querySelectorAll<HTMLButtonElement>('.pagination button')[1];

    nextButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 2 of 3');

    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?date-range=2026-07-13..2026-07-13&status=failed&payment-method=method:paypal&amount-range=10.00..20.00&sort=amount.desc&text-search=pay_failed_paypal_',
    );
    fixture.detectChanges();

    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 1 of 1');
    expect(renderedPaymentIds(element)).toEqual([
      'pay_failed_paypal_large',
      'pay_failed_paypal_small',
    ]);
    expect(
      element.querySelector('app-date-range-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('Jul 13, 2026');
    expect(
      element.querySelector('app-status-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('Failed');
    expect(
      element.querySelector('app-payment-method-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('PayPal');
    expect(
      element.querySelector('app-amount-range-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('$10.00 to $20.00');
    expect(element.querySelector<HTMLInputElement>('#payments-text-search')?.value).toBe(
      'pay_failed_paypal_',
    );
    expect(getSortButton(element, 'Amount').closest('th')?.getAttribute('aria-sort')).toBe(
      'descending',
    );
  });

  it('canonicalizes invalid and duplicate filter values without losing unrelated URL state', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?date-range=2026-07-14..2026-07-13&status=failed,unknown,failed,succeeded&payment-method=method:paypal,unknown,method:paypal,card:visa&amount-range=100..400&sort=status.asc,unknown.desc,status.desc&view=compact#payments-table',
    );

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expectRouterState(
      router,
      {
        'date-range': '2026-07-13..2026-07-14',
        status: 'failed,succeeded',
        'payment-method': 'method:paypal,card:visa',
        'amount-range': '100.00..400.00',
        sort: 'status.asc',
        view: 'compact',
      },
      'payments-table',
    );

    const element = fixture.nativeElement as HTMLElement;

    expect(
      element.querySelector('app-status-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('Failed, Succeeded');
    expect(
      element.querySelector('app-payment-method-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('PayPal, Visa');
    expect(
      element.querySelector('app-amount-range-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('$100.00 to $400.00');
    expect(renderedPaymentIds(element)).toEqual(['pay_40']);
  });

  it('moves between pages and disables navigation at the boundaries', async () => {
    const payments = createPayments(51);
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', payments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.pagination button');
    const previousButton = buttons[0];
    const nextButton = buttons[1];

    nextButton.click();
    fixture.detectChanges();

    expect(element.querySelector('tbody tr')?.textContent).toContain(payments[25].id);
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 26–50 of 51 payments',
    );
    expect(previousButton.disabled).toBe(false);

    nextButton.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody tr')?.textContent).toContain(payments[50].id);
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 3 of 3');
    expect(nextButton.disabled).toBe(true);

    previousButton.click();
    fixture.detectChanges();

    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 2 of 3');
  });

  it('keeps the current page within bounds when the payment list shrinks', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(51));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nextButton = element.querySelectorAll<HTMLButtonElement>('.pagination button')[1];

    nextButton.click();
    fixture.detectChanges();
    nextButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 3 of 3');

    fixture.componentRef.setInput('payments', createPayments(10));
    fixture.detectChanges();

    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 1 of 1');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
  });

  it('restores and persists the page size and returns to the first page when it changes', async () => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, '50');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(126));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const pageSizeSelect = element.querySelector<HTMLSelectElement>('#payments-page-size')!;

    expect(pageSizeSelect.value).toBe('50');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(50);

    await fixture.whenStable();
    fixture.detectChanges();

    const nextButton = element.querySelectorAll<HTMLButtonElement>('.pagination button')[1];

    nextButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 2 of 3');

    pageSizeSelect.value = '100';
    pageSizeSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY)).toBe('100');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(100);
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 1 of 2');
  });

  it('reacts when the persisted page size changes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(126));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: PAGE_SIZE_STORAGE_KEY,
        newValue: '50',
        storageArea: window.localStorage,
      }),
    );
    fixture.detectChanges();

    expect(element.querySelector<HTMLSelectElement>('#payments-page-size')?.value).toBe('50');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(50);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: PAGE_SIZE_STORAGE_KEY,
        newValue: null,
        storageArea: window.localStorage,
      }),
    );
    fixture.detectChanges();

    expect(element.querySelector<HTMLSelectElement>('#payments-page-size')?.value).toBe('25');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
  });

  it('uses 25 rows when the stored page size is invalid', async () => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, '75');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(51));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLSelectElement>('#payments-page-size')?.value).toBe('25');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
  });

  it('renders the required payment columns with semantic table markup', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const headers = Array.from(element.querySelectorAll('.sort-button__label')).map((header) =>
      header.textContent?.trim(),
    );

    expect(element.querySelector('table')).toBeTruthy();
    expect(element.querySelector('caption')).toBeTruthy();
    expect(headers).toEqual([
      'Payment ID',
      'Customer',
      'Amount',
      'Status',
      'Payment method',
      'Created',
    ]);
    const columnHeaders = element.querySelectorAll<HTMLTableCellElement>('th[scope="col"]');
    const headerRowChildren = Array.from(element.querySelector('thead > tr')?.children ?? []);
    const sortButtons = element.querySelectorAll<HTMLButtonElement>(
      'th > button.sort-button[type="button"]',
    );

    expect(columnHeaders).toHaveLength(6);
    expect(headerRowChildren.map((child) => child.tagName)).toEqual(Array(6).fill('TH'));
    expect(sortButtons).toHaveLength(6);

    for (const header of columnHeaders) {
      const sortButton = header.firstElementChild;

      expect(sortButton?.tagName).toBe('BUTTON');
      expect(sortButton?.parentElement).toBe(header);
      expect(sortButton?.querySelector('button')).toBeNull();
      expect(sortButton?.querySelector('.sort-button__label')).toBeTruthy();
      expect(sortButton?.querySelector('.sort-indicator svg')).toBeTruthy();
    }

    expect(element.querySelectorAll('th[aria-sort]')).toHaveLength(1);
    expect(getSortButton(element, 'Created').closest('th')?.getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(element.querySelector('.sort-priority')).toBeNull();
    expect(getSortButton(element, 'Created').querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 8.5 7 4.75l3.75 3.75',
    );
    expect(getSortButton(element, 'Amount').getAttribute('aria-describedby')).toBe(
      'payments-sort-description-amount',
    );
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('builds a multi-column queue, cycles direction, removes criteria, and updates the URL', async () => {
    const payments: readonly Payment[] = [
      {
        ...payment,
        id: 'pay_3',
        customer: 'zoe@example.com',
        status: 'succeeded',
        createdAt: '2026-07-13T15:00:00Z',
      },
      {
        ...payment,
        id: 'pay_1',
        customer: 'amy@example.com',
        status: 'failed',
        createdAt: '2026-07-13T13:00:00Z',
      },
      {
        ...payment,
        id: 'pay_2',
        customer: 'morgan@example.com',
        status: 'failed',
        createdAt: '2026-07-13T14:00:00Z',
      },
    ];
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', payments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const createdButton = getSortButton(element, 'Created');
    const customerButton = getSortButton(element, 'Customer');
    const statusButton = getSortButton(element, 'Status');

    expect(renderedPaymentIds(element)).toEqual(['pay_3', 'pay_2', 'pay_1']);
    expect(router.url).toBe('/');

    createdButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderedPaymentIds(element)).toEqual(['pay_3', 'pay_1', 'pay_2']);
    expect(router.url).toBe('/?sort=none');
    expect(element.querySelectorAll('th[aria-sort]')).toHaveLength(0);

    customerButton.click();
    statusButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderedPaymentIds(element)).toEqual(['pay_1', 'pay_2', 'pay_3']);
    expect(element.querySelector('.sort-priority')).toBeNull();
    expect(customerButton.querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 5.5 7 9.25l3.75-3.75',
    );
    expect(statusButton.querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 5.5 7 9.25l3.75-3.75',
    );
    expect(customerButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(statusButton.closest('th')?.hasAttribute('aria-sort')).toBe(false);
    expect(router.url).toBe('/?sort=customer.asc,status.asc');

    customerButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderedPaymentIds(element)).toEqual(['pay_3', 'pay_2', 'pay_1']);
    expect(customerButton.querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 8.5 7 4.75l3.75 3.75',
    );
    expect(router.url).toBe('/?sort=customer.desc,status.asc');

    customerButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderedPaymentIds(element)).toEqual(['pay_1', 'pay_2', 'pay_3']);
    expect(statusButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Sort order: Status ascending.',
    );
    expect(router.url).toBe('/?sort=status.asc');
  });

  it.each(explicitSortCases)(
    'uses $label as the effective primary sort on its first click',
    async ({ label, urlKey, expectedIds }) => {
      const fixture = TestBed.createComponent(PaymentsTable);
      fixture.componentRef.setInput('payments', explicitSortPayments);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const createdButton = getSortButton(element, 'Created');
      const sortButton = getSortButton(element, label);
      const sortDescription = sortButton.parentElement?.querySelector('.visually-hidden');

      expect(router.url).toBe('/');
      expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);
      expect(sortDescription?.textContent).toContain('priority 1');

      sortButton.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(expectedIds);
      expect(router.url).toBe('/?sort=' + urlKey + '.asc');
      expect(createdButton.closest('th')?.hasAttribute('aria-sort')).toBe(false);
      expect(createdButton.classList).not.toContain('sort-button--active');
      expect(sortButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
      expect(sortDescription?.textContent).toContain('Primary sort, ascending.');
    },
  );

  it('removes a redundant default while preserving unrelated URL state', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?sort=created.desc&view=compact#payments-table');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();
    await fixture.whenStable();

    const url = router.parseUrl(router.url);

    expect(url.queryParams).toEqual({ view: 'compact' });
    expect(url.fragment).toBe('payments-table');
  });

  it('sorts the complete collection before pagination and returns to the first page', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(51));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const nextButton = element.querySelectorAll<HTMLButtonElement>('.pagination button')[1];
    const paymentIdButton = getSortButton(element, 'Payment ID');

    nextButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 2 of 3');

    paymentIdButton.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__page')?.textContent?.trim()).toBe('Page 1 of 3');
    expect(renderedPaymentIds(element)[0]).toBe('pay_test_0001');

    paymentIdButton.click();
    fixture.detectChanges();
    expect(renderedPaymentIds(element)[0]).toBe('pay_test_0051');
  });

  it('restores a multi-column queue from the URL and reacts to later URL changes', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?sort=status.asc,amount.desc');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      { ...payment, id: 'pay_succeeded', amount: 10, status: 'succeeded' },
      { ...payment, id: 'pay_failed_small', amount: 5, status: 'failed' },
      { ...payment, id: 'pay_failed_large', amount: 20, status: 'failed' },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const statusButton = getSortButton(element, 'Status');
    const amountButton = getSortButton(element, 'Amount');

    expect(renderedPaymentIds(element)).toEqual([
      'pay_failed_large',
      'pay_failed_small',
      'pay_succeeded',
    ]);
    expect(getSortButton(element, 'Created').closest('th')?.hasAttribute('aria-sort')).toBe(false);
    expect(statusButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(element.querySelector('#payments-sort-description-status')?.textContent).toContain(
      'Primary sort, ascending.',
    );
    expect(element.querySelector('#payments-sort-description-amount')?.textContent).toContain(
      'Sort priority 2, descending.',
    );

    await router.navigateByUrl('/?sort=customer.desc');
    fixture.detectChanges();

    expect(getSortButton(element, 'Customer').closest('th')?.getAttribute('aria-sort')).toBe(
      'descending',
    );
    expect(statusButton.classList).not.toContain('sort-button--active');
    expect(amountButton.classList).not.toContain('sort-button--active');
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Sort order restored from the URL.',
    );
  });

  it('renders payment details and accessible copy and relative-time controls', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const copyButton = element.querySelector<HTMLButtonElement>('.copy-action');
    const time = element.querySelector('time');
    const relativeTimeTooltip = element.querySelector('.relative-tooltip');
    const paymentIcon = element.querySelector<HTMLElement>('.payment-icon__trigger');
    const paymentIconImage = element.querySelector<HTMLImageElement>('.payment-icon__trigger img');
    const paymentIconTooltip = element.querySelector(
      '#' + paymentIcon?.getAttribute('aria-labelledby'),
    );

    expect(element.textContent).toContain('olivia.martin@example.com');
    expect(element.textContent).toContain('$249.00');
    expect(element.textContent).toContain('Succeeded');
    expect(element.textContent).toContain('•••• 4242');
    expect(element.querySelector('.payment-id')?.textContent).toContain('…');
    expect(copyButton?.getAttribute('aria-label')).toBe('Copy payment ID ' + payment.id);
    expect(time?.getAttribute('datetime')).toBe(payment.createdAt);
    expect(relativeTimeTooltip?.textContent?.trim()).toBeTruthy();
    expect(paymentIconTooltip?.textContent?.trim()).toBe('Visa');
    expect(paymentIconImage?.getAttribute('src')).toContain(
      '/icons/payment-methods/card-brands/visa.webp',
    );
  });

  it('renders a wallet beside its funding card brand', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        paymentMethod: {
          kind: 'card',
          brand: 'mastercard',
          wallet: 'apple-pay',
          lastFour: '4444',
        },
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const labels = Array.from(element.querySelectorAll<HTMLElement>('.payment-icon__trigger')).map(
      (icon) =>
        element.querySelector('#' + icon.getAttribute('aria-labelledby'))?.textContent?.trim(),
    );

    expect(labels).toEqual(['Apple Pay', 'Mastercard']);
    expect(element.querySelector('.last-four')?.textContent).toContain('4444');
  });

  it('renders initials on purple when an icon is unavailable', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        paymentMethod: {
          kind: 'card',
          brand: 'elo',
          lastFour: '5062',
        },
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const fallback = element.querySelector<HTMLElement>('.payment-icon__trigger--fallback');
    const fallbackTooltip = element.querySelector('#' + fallback?.getAttribute('aria-labelledby'));

    expect(fallback?.textContent?.trim()).toBe('EL');
    expect(fallbackTooltip?.textContent?.trim()).toBe('Elo');
    expect(fallback?.querySelector('img')).toBeNull();
  });

  it('shows a fixed-width no-card label for standalone payment methods', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        paymentMethod: {
          kind: 'standalone',
          method: 'pix',
          lastFour: '1234',
        },
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const noCard = element.querySelector('.no-card');

    expect(noCard?.textContent?.trim()).toBe('No card');
    expect(noCard?.classList).toContain('payment-method__reference');
    expect(element.querySelector('.last-four')).toBeNull();
  });

  it('derives relative time from the payment timestamp', () => {
    const currentTime = Date.parse('2026-07-13T14:51:00-03:00');
    expect(formatRelativeTime(payment.createdAt, currentTime)).toBe('3 minutes ago');
    expect(formatRelativeTime(payment.createdAt, Date.parse('2026-07-13T14:49:30-03:00'))).toBe(
      '2 minutes ago',
    );
  });

  it('formats the created date in the provided time zone', () => {
    const createdAt = '2026-07-13T01:30:00Z';

    expect(formatCreatedDate(createdAt, 'UTC')).toBe('Jul 13, 2026');
    expect(formatCreatedDate(createdAt, 'America/Los_Angeles')).toBe('Jul 12, 2026');
  });

  it('copies the full payment ID and exposes confirmation feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();

    const copyButton = fixture.nativeElement.querySelector('.copy-action') as HTMLButtonElement;
    copyButton.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(payment.id);
    expect(fixture.nativeElement.textContent).toContain('Copied');
    expect(fixture.nativeElement.textContent).toContain('copied to clipboard');

    fixture.destroy();
  });
});

describe('PaymentsTable during the initial router navigation', () => {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [PaymentsTable],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
  });

  it('does not overwrite sort or filters before the initial navigation completes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        id: 'pay_first',
        status: 'failed',
        paymentMethod: { kind: 'standalone', method: 'paypal' },
        createdAt: '2026-07-13T12:00:00Z',
      },
      {
        ...payment,
        id: 'pay_second',
        status: 'failed',
        paymentMethod: { kind: 'standalone', method: 'paypal' },
        createdAt: '2026-07-13T14:00:00Z',
      },
      { ...payment, id: 'pay_excluded', createdAt: '2026-07-13T16:00:00Z' },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?sort=none&date-range=2026-07-13..2026-07-13&status=failed&payment-method=method:paypal&amount-range=200.00..300.00&text-search=pay_first',
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expectRouterState(router, {
      sort: 'none',
      'date-range': '2026-07-13..2026-07-13',
      status: 'failed',
      'payment-method': 'method:paypal',
      'amount-range': '200.00..300.00',
      'text-search': 'pay_first',
    });
    expect(renderedPaymentIds(element)).toEqual(['pay_first']);
    expect(element.querySelectorAll('th[aria-sort]')).toHaveLength(0);
    expect(element.querySelectorAll('.sort-button--active')).toHaveLength(0);
    expect(
      element.querySelector('app-date-range-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('Jul 13, 2026');
    expect(
      element.querySelector('app-status-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('Failed');
    expect(
      element.querySelector('app-payment-method-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('PayPal');
    expect(
      element.querySelector('app-amount-range-filter .filter-button__value')?.textContent?.trim(),
    ).toBe('$200.00 to $300.00');
    expect(element.querySelector<HTMLInputElement>('#payments-text-search')?.value).toBe(
      'pay_first',
    );
  });
});
