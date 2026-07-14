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

  it('does not overwrite an explicit empty sort queue before navigation completes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      { ...payment, id: 'pay_first', createdAt: '2026-07-13T12:00:00Z' },
      { ...payment, id: 'pay_second', createdAt: '2026-07-13T14:00:00Z' },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?sort=none');
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(router.url).toContain('sort=none');
    expect(renderedPaymentIds(element)).toEqual(['pay_first', 'pay_second']);
    expect(element.querySelectorAll('th[aria-sort]')).toHaveLength(0);
    expect(element.querySelectorAll('.sort-button--active')).toHaveLength(0);
  });
});
