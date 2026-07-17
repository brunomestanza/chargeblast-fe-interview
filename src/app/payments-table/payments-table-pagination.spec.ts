import { TestBed } from '@angular/core/testing';
import { PaymentsTable } from './payments-table';
import {
  PAGE_SIZE_STORAGE_KEY,
  createPayments,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

describe('PaymentsTable pagination', () => {
  setupPaymentsTableTesting();

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

    expect(element.querySelector('tbody tr')?.getAttribute('data-payment-id')).toBe(
      payments[25].id,
    );
    expect(element.querySelector('#payments-pagination-range')?.textContent?.trim()).toBe(
      'Viewing 26–50 of 51 payments',
    );
    expect(previousButton.disabled).toBe(false);

    nextButton.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody tr')?.getAttribute('data-payment-id')).toBe(
      payments[50].id,
    );
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
});
