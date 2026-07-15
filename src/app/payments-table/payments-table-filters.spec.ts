import { TestBed } from '@angular/core/testing';
import { Payment } from './payment';
import { PaymentsTable } from './payments-table';
import {
  explicitSortPayments,
  findButton,
  findCheckbox,
  payment,
  renderedPaymentIds,
  setNumberInput,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

describe('PaymentsTable filters', () => {
  setupPaymentsTableTesting();

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

    setNumberInput(element.querySelector<HTMLInputElement>('input[type="number"]')!, '30');
    fixture.detectChanges();
    findButton(element, 'Apply').click();
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
    setNumberInput(dateFilter.querySelector<HTMLInputElement>('input[type="number"]')!, '30');
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
    setNumberInput(dateFilter.querySelector<HTMLInputElement>('input[type="number"]')!, '30');
    fixture.detectChanges();
    findButton(dateFilter, 'Apply').click();
    fixture.detectChanges();

    expect(renderedPaymentIds(element)).toEqual(['pay_recent_failed']);
    expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe('1 payment');
  });
});
