import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Payment } from './payment';
import { PaymentsTable } from './payments-table';
import {
  createPayments,
  expectRouterState,
  explicitSortPayments,
  findButton,
  findCheckbox,
  getSortButton,
  payment,
  paymentQueryDelay,
  renderedPaymentIds,
  setNumberInput,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

describe('PaymentsTable URL synchronization', () => {
  setupPaymentsTableTesting();

  it('restores every filter with sorting from the initial URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?date-range=2026-07-13..2026-07-13&status=failed,succeeded&payment-method=method:paypal,wallet:apple-pay&amount-range=100.00..300.00&sort=amount.desc',
    );

    paymentQueryDelay.mockReturnValue(1_500);
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
    expect(paymentQueryDelay).not.toHaveBeenCalled();
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
    setNumberInput(dateFilter.querySelector<HTMLInputElement>('input[type="number"]')!, '30');
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
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 26–50 of 51 results',
    );

    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/?date-range=2026-07-13..2026-07-13&status=failed&payment-method=method:paypal&amount-range=10.00..20.00&sort=amount.desc&text-search=pay_failed_paypal_',
    );
    fixture.detectChanges();

    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 1–2 of 2 results',
    );
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
      '/?date-range=2026-07-14..2026-07-13&status=failed,unknown,failed,succeeded&payment-method=method:paypal,unknown,method:paypal,card:visa&amount-range=100..400&sort=amount.asc,unknown.desc,amount.desc&view=compact#payments-table',
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
        sort: 'amount.asc',
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
});

describe('PaymentsTable during the initial router navigation', () => {
  setupPaymentsTableTesting({ navigate: false });

  it('does not overwrite sort or filters before the initial navigation completes', async () => {
    paymentQueryDelay.mockReturnValue(1_500);
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
    expect(paymentQueryDelay).not.toHaveBeenCalled();
  });
});
