import { Payment } from './payment';

export const PAYMENT_SORT_COLUMNS = [
  'paymentId',
  'customer',
  'amount',
  'status',
  'paymentMethod',
  'created',
] as const;

export type PaymentSortColumn = (typeof PAYMENT_SORT_COLUMNS)[number];
export type PaymentSortDirection = 'asc' | 'desc';

export interface PaymentSortCriterion {
  readonly column: PaymentSortColumn;
  readonly direction: PaymentSortDirection;
}

export const PAYMENT_SORT_COLUMN_LABELS: Readonly<Record<PaymentSortColumn, string>> = {
  paymentId: 'Payment ID',
  customer: 'Customer',
  amount: 'Amount',
  status: 'Status',
  paymentMethod: 'Payment method',
  created: 'Created',
};

export const DEFAULT_PAYMENT_SORT: readonly PaymentSortCriterion[] = [
  { column: 'created', direction: 'desc' },
];

const PAYMENT_SORT_URL_KEYS: Readonly<Record<PaymentSortColumn, string>> = {
  paymentId: 'payment-id',
  customer: 'customer',
  amount: 'amount',
  status: 'status',
  paymentMethod: 'payment-method',
  created: 'created',
};

const PAYMENT_SORT_COLUMNS_BY_URL_KEY = new Map<string, PaymentSortColumn>(
  PAYMENT_SORT_COLUMNS.map((column) => [PAYMENT_SORT_URL_KEYS[column], column]),
);
// The marker represents an explicitly empty queue; an absent parameter uses the default.
const PAYMENT_SORT_EMPTY_BASE_URL_TOKEN = 'none';
const TEXT_COLLATOR = new Intl.Collator('en-US', {
  numeric: true,
  sensitivity: 'base',
});

export function cyclePaymentSort(
  criteria: readonly PaymentSortCriterion[],
  column: PaymentSortColumn,
): readonly PaymentSortCriterion[] {
  // The default is only an initial fallback; the first explicit column starts its own queue.
  const activeCriteria =
    isDefaultPaymentSort(criteria) && !criteria.some((criterion) => criterion.column === column)
      ? []
      : criteria;
  const criterionIndex = activeCriteria.findIndex((criterion) => criterion.column === column);

  if (criterionIndex === -1) {
    return [...activeCriteria, { column, direction: 'asc' }];
  }

  if (activeCriteria[criterionIndex].direction === 'asc') {
    return activeCriteria.map((criterion, index) =>
      index === criterionIndex ? { ...criterion, direction: 'desc' } : criterion,
    );
  }

  return activeCriteria.filter((_, index) => index !== criterionIndex);
}

export function parsePaymentSort(value: string | null): readonly PaymentSortCriterion[] {
  if (value === null || value.length === 0) {
    return DEFAULT_PAYMENT_SORT;
  }

  const tokens = value.split(',');
  const hasExplicitEmptyBase = tokens[0] === PAYMENT_SORT_EMPTY_BASE_URL_TOKEN;
  const criteria: PaymentSortCriterion[] = [];
  const seenColumns = new Set<PaymentSortColumn>();

  for (const token of hasExplicitEmptyBase ? tokens.slice(1) : tokens) {
    const match = /^([a-z-]+)\.(asc|desc)$/.exec(token);

    if (!match) {
      continue;
    }

    const column = PAYMENT_SORT_COLUMNS_BY_URL_KEY.get(match[1]);

    if (!column || seenColumns.has(column)) {
      continue;
    }

    const direction = match[2] === 'asc' ? 'asc' : 'desc';

    seenColumns.add(column);
    criteria.push({ column, direction });
  }

  return criteria.length > 0 || hasExplicitEmptyBase ? criteria : DEFAULT_PAYMENT_SORT;
}

export function serializePaymentSort(criteria: readonly PaymentSortCriterion[]): string | null {
  if (isDefaultPaymentSort(criteria)) {
    return null;
  }

  const serializedCriteria = criteria
    .map((criterion) => PAYMENT_SORT_URL_KEYS[criterion.column] + '.' + criterion.direction)
    .join(',');

  return serializedCriteria || PAYMENT_SORT_EMPTY_BASE_URL_TOKEN;
}

function isDefaultPaymentSort(criteria: readonly PaymentSortCriterion[]): boolean {
  return (
    criteria.length === DEFAULT_PAYMENT_SORT.length &&
    criteria.every(
      (criterion, index) =>
        criterion.column === DEFAULT_PAYMENT_SORT[index].column &&
        criterion.direction === DEFAULT_PAYMENT_SORT[index].direction,
    )
  );
}

export function sortPayments(
  payments: readonly Payment[],
  criteria: readonly PaymentSortCriterion[],
): readonly Payment[] {
  if (criteria.length === 0 || payments.length < 2) {
    return payments;
  }

  return payments
    .map((payment, originalIndex) => ({ payment, originalIndex }))
    .sort((left, right) => {
      for (const criterion of criteria) {
        const comparison = comparePayments(left.payment, right.payment, criterion.column);

        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }

      return left.originalIndex - right.originalIndex;
    })
    .map(({ payment }) => payment);
}

function comparePayments(left: Payment, right: Payment, column: PaymentSortColumn): number {
  switch (column) {
    case 'paymentId':
      return TEXT_COLLATOR.compare(left.id, right.id);
    case 'customer':
      return TEXT_COLLATOR.compare(left.customer, right.customer);
    case 'amount':
      return TEXT_COLLATOR.compare(left.currency, right.currency) || left.amount - right.amount;
    case 'status':
      return TEXT_COLLATOR.compare(left.status, right.status);
    case 'paymentMethod':
      return comparePaymentMethods(left, right);
    case 'created':
      return Date.parse(left.createdAt) - Date.parse(right.createdAt);
  }
}

function comparePaymentMethods(left: Payment, right: Payment): number {
  const leftValues = paymentMethodSortValues(left);
  const rightValues = paymentMethodSortValues(right);

  for (let index = 0; index < leftValues.length; index += 1) {
    const comparison = TEXT_COLLATOR.compare(leftValues[index], rightValues[index]);

    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function paymentMethodSortValues(payment: Payment): readonly [string, string, string] {
  const paymentMethod = payment.paymentMethod;

  if (paymentMethod.kind === 'standalone') {
    return [paymentMethod.method, '', paymentMethod.lastFour ?? ''];
  }

  return [paymentMethod.wallet ?? paymentMethod.brand, paymentMethod.brand, paymentMethod.lastFour];
}
