import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Payment } from './payment';
import { formatCreatedDate, formatRelativeTime } from './payment-row';
import { PaymentsTable } from './payments-table';

const payment: Payment = {
  id: 'pay_3RxQZ9Jx7yL2kA4fB8mD',
  customer: 'olivia.martin@example.com',
  amount: 249,
  currency: 'USD',
  status: 'succeeded',
  paymentMethod: {
    kind: 'card',
    brand: 'Visa',
    brandKey: 'visa',
    mark: 'VISA',
    lastFour: '4242',
  },
  createdAt: '2026-07-13T14:48:00-03:00',
};

describe('PaymentsTable', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentsTable],
    }).compileComponents();
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
    const tooltip = element.querySelector('[role="tooltip"]');

    expect(element.textContent).toContain('olivia.martin@example.com');
    expect(element.textContent).toContain('$249.00');
    expect(element.textContent).toContain('Succeeded');
    expect(element.textContent).toContain('•••• 4242');
    expect(element.querySelector('.payment-id')?.textContent).toContain('…');
    expect(copyButton?.getAttribute('aria-label')).toBe('Copy payment ID ' + payment.id);
    expect(time?.getAttribute('datetime')).toBe(payment.createdAt);
    expect(tooltip?.textContent?.trim()).toBeTruthy();
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
