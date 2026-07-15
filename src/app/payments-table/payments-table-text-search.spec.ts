import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Payment } from './payment';
import { PaymentsTable, TEXT_SEARCH_DEBOUNCE_MS } from './payments-table';
import {
  expectRouterState,
  explicitSortPayments,
  findButton,
  getSortButton,
  payment,
  paymentQueryDelay,
  renderedPaymentIds,
  setTextSearchInput,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

describe('PaymentsTable text search', () => {
  setupPaymentsTableTesting();

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
      'Search starts shortly after you stop typing.',
    );
    expect(element.querySelector('.text-search-filter__clear')).toBeNull();
    expect(cleanFiltersButton.type).toBe('button');
    expect(cleanFiltersButton.disabled).toBe(true);
  });

  it('starts the text-search request after the debounce and commits it after the response delay', async () => {
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
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;

      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();
      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);
      expect(element.querySelector('.payments-skeleton')).toBeNull();
      expect(router.url).toBe('/');

      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(router.url).toBe('/');

      vi.advanceTimersByTime(999);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40']);
      expect(router.url).toBe('/?text-search=ben');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('cancels an in-flight search when the visible search intent changes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_500).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const router = TestBed.inject(Router);
      const searchInput = element.querySelector<HTMLInputElement>('#payments-text-search')!;

      setTextSearchInput(searchInput, 'amy');
      fixture.detectChanges();
      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(100);
      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();

      expect(element.querySelector('.payments-skeleton')).toBeNull();
      expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
      fixture.detectChanges();

      expect(router.url).toBe('/');
      expect(renderedPaymentIds(element)).toEqual(['pay_30', 'pay_20', 'pay_40', 'pay_10']);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);

      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40']);
      expect(router.url).toBe('/?text-search=ben');

      // Outlive the cancelled 'amy' response window: it must never land.
      vi.advanceTimersByTime(1_500);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40']);
      expect(router.url).toBe('/?text-search=ben');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });

  it('restarts the text-search delay after each input and writes it last in the URL', async () => {
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

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_20', 'pay_10', 'pay_30', 'pay_40']);
      expect(router.url).toBe('/?sort=amount.desc&view=compact#payments-table');

      setTextSearchInput(searchInput, 'ben');
      fixture.detectChanges();
      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
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
      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
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

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);
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
      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS - 1);

      await router.navigateByUrl('/?view=compact&text-search=amy');
      fixture.detectChanges();

      expect(searchInput.value).toBe('amy');
      expect(renderedPaymentIds(element)).toEqual(['pay_20']);

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
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

  it('clears all filter controls, preserves unrelated URL state, and cancels pending search', async () => {
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

      vi.advanceTimersByTime(TEXT_SEARCH_DEBOUNCE_MS);
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

  it('delays Clean all filters and supersedes an older pending request', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?status=failed');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', explicitSortPayments);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    paymentQueryDelay.mockReturnValueOnce(1_400).mockReturnValueOnce(500);
    vi.useFakeTimers();

    try {
      const element = fixture.nativeElement as HTMLElement;
      const cleanFiltersButton = findButton(element, 'Clean all filters');

      getSortButton(element, 'Amount').click();
      fixture.detectChanges();
      vi.advanceTimersByTime(200);
      cleanFiltersButton.click();
      fixture.detectChanges();

      expect(cleanFiltersButton.disabled).toBe(true);
      expect(element.querySelectorAll('.filter-button__value')).toHaveLength(0);
      expect(element.querySelectorAll('.payment-skeleton-row').length).toBeGreaterThan(0);
      expect(router.url).toBe('/?status=failed');

      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_30', 'pay_10', 'pay_20']);
      expect(router.url).toBe('/?sort=amount.asc');

      vi.advanceTimersByTime(700);
      fixture.detectChanges();

      expect(renderedPaymentIds(element)).toEqual(['pay_40', 'pay_30', 'pay_10', 'pay_20']);
      expect(router.url).toBe('/?sort=amount.asc');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
    }
  });
});
