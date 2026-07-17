import {
  DEFAULT_PAYMENT_SORT,
  PAYMENT_SORT_COLUMNS,
  isDefaultPaymentSort,
  type PaymentSortColumn,
  type PaymentSortCriterion,
} from './payment-sort.contract';

const PAYMENT_SORT_URL_KEYS: Readonly<Record<PaymentSortColumn, string>> = {
  amount: 'amount',
  paymentMethod: 'payment-method',
  description: 'description',
  customer: 'customer',
  created: 'created',
  refundedDate: 'refunded-date',
  declineReason: 'decline-reason',
};

const PAYMENT_SORT_COLUMNS_BY_URL_KEY = new Map<string, PaymentSortColumn>(
  PAYMENT_SORT_COLUMNS.map((column) => [PAYMENT_SORT_URL_KEYS[column], column]),
);

// The marker represents an explicitly empty queue; an absent parameter uses the default.
const PAYMENT_SORT_EMPTY_BASE_URL_TOKEN = 'none';

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
