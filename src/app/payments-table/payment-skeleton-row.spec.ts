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

    expect(renderedColumns(fixture.nativeElement as HTMLElement)).toEqual([...PAYMENT_COLUMN_KEYS]);
  });

  it('keeps its placeholders aligned with a reordered table', () => {
    const fixture = TestBed.createComponent(PaymentSkeletonRow);
    fixture.componentRef.setInput('columnOrder', [
      'created',
      'amount',
      'status',
      'customer',
      'paymentMethod',
      'paymentId',
    ]);
    fixture.detectChanges();

    const row = fixture.nativeElement as HTMLElement;
    const cells = row.querySelectorAll<HTMLTableCellElement>('td');

    expect(renderedColumns(row)).toEqual([
      'created',
      'amount',
      'status',
      'customer',
      'paymentMethod',
      'paymentId',
    ]);
    expect(cells[0]?.querySelector('.skeleton-created')).toBeTruthy();
    expect(cells[5]?.querySelector('.skeleton-payment-id')).toBeTruthy();
  });
});

function renderedColumns(row: HTMLElement): readonly string[] {
  return Array.from(row.querySelectorAll<HTMLTableCellElement>('td')).map(
    (cell) => cell.dataset['column'] ?? '',
  );
}
