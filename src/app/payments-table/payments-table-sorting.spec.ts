import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Payment } from './payment';
import { PaymentsTable } from './payments-table';
import {
  createPayments,
  explicitSortPayments,
  getSortButton,
  payment,
  renderedPaymentIds,
  setupPaymentsTableTesting,
} from './testing/payments-table.testing';

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

describe('PaymentsTable sorting', () => {
  setupPaymentsTableTesting();

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
      'M3.25 5.5 7 9.25l3.75-3.75',
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
      'M3.25 8.5 7 4.75l3.75 3.75',
    );
    expect(statusButton.querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 8.5 7 4.75l3.75 3.75',
    );
    expect(customerButton.closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(statusButton.closest('th')?.hasAttribute('aria-sort')).toBe(false);
    expect(router.url).toBe('/?sort=customer.asc,status.asc');

    customerButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(renderedPaymentIds(element)).toEqual(['pay_3', 'pay_2', 'pay_1']);
    expect(customerButton.querySelector('path')?.getAttribute('d')).toBe(
      'M3.25 5.5 7 9.25l3.75-3.75',
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
});
