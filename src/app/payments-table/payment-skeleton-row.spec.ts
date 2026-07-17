import { TestBed } from '@angular/core/testing';
import { PAYMENT_COLUMN_KEYS } from './payment-columns';
import { PaymentSkeletonRow } from './payment-skeleton-row';

describe('PaymentSkeletonRow', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaymentSkeletonRow] }).compileComponents();
  });

  it('renders the canonical payment column order by default', () => {
    const fixture = TestBed.createComponent(PaymentSkeletonRow);
    fixture.detectChanges();

    expect(renderedColumns(fixture.nativeElement as HTMLElement)).toEqual([
      'select',
      ...PAYMENT_COLUMN_KEYS,
      'menu',
    ]);
  });

  it('keeps its placeholders aligned with a reordered table', () => {
    const fixture = TestBed.createComponent(PaymentSkeletonRow);
    fixture.componentRef.setInput('columnOrder', [
      'created',
      'amount',
      'description',
      'customer',
      'paymentMethod',
      'refundedDate',
      'declineReason',
    ]);
    fixture.detectChanges();

    const row = fixture.nativeElement as HTMLElement;
    const cells = row.querySelectorAll<HTMLTableCellElement>('td');

    expect(renderedColumns(row)).toEqual([
      'select',
      'created',
      'amount',
      'description',
      'customer',
      'paymentMethod',
      'refundedDate',
      'declineReason',
      'menu',
    ]);
    expect(cells[1]?.querySelector('.skeleton-created')).toBeTruthy();
    expect(cells[2]?.querySelector('.skeleton-amount')).toBeTruthy();
  });
});

function renderedColumns(row: HTMLElement): readonly string[] {
  return Array.from(row.querySelectorAll<HTMLTableCellElement>('td')).map(
    (cell) => cell.dataset['column'] ?? '',
  );
}
