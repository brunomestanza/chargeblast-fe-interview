import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Payment } from './payment';
import { PaymentsTable, TEXT_SEARCH_DEBOUNCE_MS } from './payments-table';
import {
  createPayments,
  explicitSortPayments,
  findButton,
  findCheckbox,
  getSortButton,
  payment,
  paymentQueryDelay,
  renderedPaymentIds,
  setTextSearchInput,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

describe('PaymentsTable query lifecycle', () => {
  setupPaymentsTableTesting();

  it('loads the initial rows immediately inside the available-height table', async () => {
    paymentQueryDelay.mockReturnValue(1_500);
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(25));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const panel = element.querySelector<HTMLElement>('.payments-panel')!;
    const tableScroll = element.querySelector<HTMLElement>('.table-scroll')!;
    const columnHeader = element.querySelector<HTMLElement>('th')!;

    expect(renderedPaymentIds(element)).toHaveLength(25);
    expect(element.querySelector('.payments-skeleton')).toBeNull();
    expect(tableScroll.getAttribute('aria-busy')).toBe('false');
    expect(getComputedStyle(panel).flexGrow).toBe('1');
    expect(getComputedStyle(tableScroll).overflowY).toBe('auto');
    expect(getComputedStyle(columnHeader).position).toBe('sticky');
    expect(paymentQueryDelay).not.toHaveBeenCalled();
  });

  it('locks vertical scroll while table-shaped skeleton rows fill the response delay', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValue(1_000);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;
      const tableScroll = element.querySelector<HTMLElement>('.table-scroll')!;

      tableScroll.scrollTop = 120;
      tableScroll.scrollLeft = 64;

      statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
      fixture.detectChanges();
      findCheckbox(statusFilter, 'Failed').click();
      findButton(statusFilter, 'Apply').click();
      fixture.detectChanges();

      const skeletonRows = element.querySelectorAll<HTMLElement>('.payment-skeleton-row');

      expect(tableScroll.getAttribute('aria-busy')).toBe('true');
      expect(tableScroll.classList).toContain('table-scroll--loading');
      expect(getComputedStyle(tableScroll).overflowX).toBe('hidden');
      expect(getComputedStyle(tableScroll).overflowY).toBe('hidden');
      expect(tableScroll.scrollTop).toBe(0);
      expect(tableScroll.scrollLeft).toBe(64);
      expect(skeletonRows.length).toBeGreaterThan(0);
      expect(renderedPaymentIds(element)).toEqual([]);
      expect(router.url).toBe('/');
      expect(element.querySelector('.payments-panel__count')?.textContent?.trim()).toBe(
        '4 payments',
      );
      expect(statusFilter.querySelector('.filter-button__value')?.textContent?.trim()).toBe(
        'Failed',
      );
      expect(findButton(element, 'Export').disabled).toBe(true);

      for (const row of skeletonRows) {
        expect(row.getAttribute('aria-hidden')).toBe('true');
        expect(row.querySelectorAll('td')).toHaveLength(6);
        expect(row.querySelector('.skeleton-payment-id__value')).toBeTruthy();
        expect(row.querySelector('.skeleton-copy')).toBeTruthy();
        expect(row.querySelector('.skeleton-customer')).toBeTruthy();
        expect(row.querySelector('.skeleton-amount__value')).toBeTruthy();
        expect(row.querySelector('.skeleton-amount__currency')).toBeTruthy();
        expect(row.querySelector('.skeleton-status')).toBeTruthy();
        expect(row.querySelector('.skeleton-payment-method__icon')).toBeTruthy();
        expect(row.querySelector('.skeleton-payment-method__reference')).toBeTruthy();
        expect(row.querySelector('.skeleton-created__date')).toBeTruthy();
        expect(row.querySelector('.skeleton-created__time')).toBeTruthy();
        expect(row.querySelector('button, a, input, select, textarea, [tabindex]')).toBeNull();
      }

      vi.advanceTimersByTime(999);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(router.url).toBe('/');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(element.querySelector('.payments-skeleton')).toBeNull();
      expect(tableScroll.getAttribute('aria-busy')).toBe('false');
      expect(tableScroll.classList).not.toContain('table-scroll--loading');
      expect(getComputedStyle(tableScroll).overflowY).toBe('auto');
      expect(findButton(element, 'Export').disabled).toBe(false);
      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(router.url).toBe('/?status=failed');
      expect(element.textContent).toContain('Status filter applied: Failed. 1 payment found.');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('keeps only the latest delayed sort response', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const amountButton = getSortButton(element, 'Amount');

      amountButton.click();
      fixture.detectChanges();
      vi.advanceTimersByTime(200);
      amountButton.click();
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(amountButton.closest('th')?.getAttribute('aria-sort')).toBe('descending');
      expect(router.url).toBe('/');

      vi.advanceTimersByTime(499);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc');
      expect(paymentQueryDelay).toHaveBeenCalledTimes(2);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('commits the latest combined filter and sort snapshot without a stale rollback', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      {
        ...payment,
        id: 'pay_failed_small',
        amount: 100,
        status: 'failed',
        createdAt: '2026-07-13T16:00:00Z',
      },
      {
        ...payment,
        id: 'pay_succeeded',
        amount: 50,
        status: 'succeeded',
        createdAt: '2026-07-13T15:00:00Z',
      },
      {
        ...payment,
        id: 'pay_failed_large',
        amount: 300,
        status: 'failed',
        createdAt: '2026-07-13T14:00:00Z',
      },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const statusFilter = element.querySelector<HTMLElement>('app-status-filter')!;

      statusFilter.querySelector<HTMLButtonElement>('.filter-button__trigger')!.click();
      fixture.detectChanges();
      findCheckbox(statusFilter, 'Failed').click();
      findButton(statusFilter, 'Apply').click();
      fixture.detectChanges();
      vi.advanceTimersByTime(200);
      getSortButton(element, 'Amount').click();
      fixture.detectChanges();

      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_failed_small', 'pay_failed_large']);
      expect(router.url).toBe('/?sort=amount.asc&status=failed');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_failed_small', 'pay_failed_large']);
      expect(router.url).toBe('/?sort=amount.asc&status=failed');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('cancels an active request and delays a later URL-restored view', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);

      getSortButton(element, 'Amount').click();
      fixture.detectChanges();
      vi.advanceTimersByTime(200);

      await router.navigateByUrl('/?status=failed');
      fixture.detectChanges();

      expect(router.url).toBe('/?status=failed');
      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(getSortButton(element, 'Created').closest('th')?.getAttribute('aria-sort')).toBe(
        'descending',
      );

      vi.advanceTimersByTime(499);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(router.url).toBe('/?status=failed');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(router.url).toBe('/?status=failed');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('resumes an unapplied URL view after a search draft cancels its first request', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;

      await router.navigateByUrl('/?status=failed');
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();

      expect(element.querySelector('.payments-skeleton')).toBeNull();
      expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);

      await router.navigateByUrl('/?status=failed&view=compact');
      fixture.detectChanges();

      expect(searchInput.value).toBe('');
      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(router.url).toBe('/?status=failed&view=compact');

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_10']);
      expect(router.url).toBe('/?status=failed&view=compact');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('does not acknowledge an external URL as a pending component navigation', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(0).mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    const pendingNavigation = new Promise<boolean>(() => undefined);
    const navigate = vi.spyOn(router, 'navigate').mockReturnValue(pendingNavigation);

    try {
      const amountButton = getSortButton(element, 'Amount');

      amountButton.click();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_30', 'pay_10', 'pay_20']);
      expect(router.url).toBe('/');

      amountButton.click();
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      await router.navigateByUrl('/?sort=amount.asc');
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(amountButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');

      vi.advanceTimersByTime(500);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_30', 'pay_10', 'pay_20']);
      expect(router.url).toBe('/?sort=amount.asc');

      vi.advanceTimersByTime(900);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_30', 'pay_10', 'pay_20']);
      expect(router.url).toBe('/?sort=amount.asc');
      expect(navigate).toHaveBeenCalledTimes(1);
    } finally {
      navigate.mockRestore();
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });
});
