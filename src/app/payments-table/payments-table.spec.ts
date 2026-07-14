import { TestBed } from '@angular/core/testing';
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

describe('PaymentsTable', () => {
  beforeEach(async () => {
    window.localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [PaymentsTable],
    }).compileComponents();
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
    const headers = Array.from(element.querySelectorAll('th')).map((header) =>
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
    expect(element.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
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
