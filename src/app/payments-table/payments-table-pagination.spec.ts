import { TestBed } from '@angular/core/testing';
import { PaymentsTable } from './payments-table';
import { createPayments, setupPaymentsTableTesting } from './testing/payments-table.testing';

function paginationRange(element: HTMLElement): string {
  return element.querySelector('#payments-pagination-range')?.textContent?.trim() ?? '';
}

describe('PaymentsTable pagination', () => {
  setupPaymentsTableTesting();

  it('shows 25 rows per page with a results summary', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', createPayments(126));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.pagination button');

    expect(element.querySelector('#payments-page-size')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(paginationRange(element)).toBe('Viewing 1–25 of 126 results');
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
    expect(paginationRange(element)).toBe('Viewing 26–50 of 51 results');
    expect(previousButton.disabled).toBe(false);

    nextButton.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody tr')?.getAttribute('data-payment-id')).toBe(
      payments[50].id,
    );
    expect(paginationRange(element)).toBe('Viewing 51–51 of 51 results');
    expect(nextButton.disabled).toBe(true);

    previousButton.click();
    fixture.detectChanges();

    expect(paginationRange(element)).toBe('Viewing 26–50 of 51 results');
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
    expect(paginationRange(element)).toBe('Viewing 51–51 of 51 results');

    fixture.componentRef.setInput('payments', createPayments(10));
    fixture.detectChanges();

    expect(paginationRange(element)).toBe('Viewing 1–10 of 10 results');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
  });
});
