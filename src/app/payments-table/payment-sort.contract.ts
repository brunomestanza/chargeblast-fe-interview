import {
  PAYMENT_TABLE_COLUMN_KEYS,
  PAYMENT_TABLE_COLUMN_LABELS,
  type PaymentTableColumnKey,
} from './payment-table-column';

export const PAYMENT_SORT_COLUMNS = PAYMENT_TABLE_COLUMN_KEYS;
export const PAYMENT_SORT_COLUMN_LABELS = PAYMENT_TABLE_COLUMN_LABELS;
export type PaymentSortColumn = PaymentTableColumnKey;

export type PaymentSortDirection = 'asc' | 'desc';

export interface PaymentSortCriterion {
  readonly column: PaymentSortColumn;
  readonly direction: PaymentSortDirection;
}

export const DEFAULT_PAYMENT_SORT: readonly PaymentSortCriterion[] = [
  { column: 'created', direction: 'desc' },
];

export function isDefaultPaymentSort(criteria: readonly PaymentSortCriterion[]): boolean {
  return (
    criteria.length === DEFAULT_PAYMENT_SORT.length &&
    criteria.every(
      (criterion, index) =>
        criterion.column === DEFAULT_PAYMENT_SORT[index].column &&
        criterion.direction === DEFAULT_PAYMENT_SORT[index].direction,
    )
  );
}
