import { TestBed } from '@angular/core/testing';
import { formatCreatedDate, formatRelativeTime } from './payment-display-format';
import type { Payment } from './payment';
import { PaymentsTable } from './payments-table';
import { payment, setupPaymentsTableTesting } from './testing/payments-table.testing';

describe('PaymentsTable rows', () => {
  setupPaymentsTableTesting();

  it('renders payment details and accessible relative-time controls', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const row = element.querySelector<HTMLTableRowElement>('tbody tr[data-payment-id]');
    const time = element.querySelector('time');
    const relativeTimeTooltip = element.querySelector('.relative-tooltip');
    const paymentIcon = element.querySelector<HTMLElement>('.payment-icon__trigger');
    const paymentIconImage = element.querySelector<HTMLImageElement>('.payment-icon__trigger img');

    expect(element.textContent).toContain('olivia.martin@example.com');
    expect(element.textContent).toContain('$249.00');
    expect(element.textContent).toContain('Succeeded');
    expect(element.textContent).toContain('•••• 4242');
    expect(element.textContent).toContain('Subscription update');
    expect(row?.getAttribute('data-payment-id')).toBe(payment.id);
    expect(
      element
        .querySelector<HTMLInputElement>('tbody .select-cell input')
        ?.getAttribute('aria-label'),
    ).toBe('Select payment ' + payment.id);
    expect(time?.getAttribute('datetime')).toBe(payment.createdAt);
    expect(relativeTimeTooltip?.textContent?.trim()).toBeTruthy();
    expect(time?.textContent).toContain(relativeTimeTooltip?.textContent?.trim());
    expect(paymentIcon?.getAttribute('aria-label')).toBe('Visa');
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
      (icon) => icon.getAttribute('aria-label'),
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

    expect(fallback?.textContent?.trim()).toBe('EL');
    expect(fallback?.getAttribute('aria-label')).toBe('Elo');
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

  it('selects a row through its checkbox', () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector(
      'tbody .select-cell input',
    ) as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
    checkbox.click();
    fixture.detectChanges();

    expect(checkbox.checked).toBe(true);

    fixture.destroy();
  });
});
