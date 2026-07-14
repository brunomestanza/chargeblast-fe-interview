import {
  createPresetDateRange,
  normalizeCustomDateRange,
  type DateRangeSelection,
} from './filters/date-range-filter/date-range';
import {
  isPaymentMethodFilterValue,
  type PaymentMethodFilterValue,
} from './filters/payment-method-filter/payment-method-filter-options.mock';
import { PAYMENT_STATUS_OPTIONS, type PaymentStatus } from './payment';

export const DATE_RANGE_QUERY_PARAM = 'date-range';
export const STATUS_QUERY_PARAM = 'status';
export const PAYMENT_METHOD_QUERY_PARAM = 'payment-method';

const CUSTOM_DATE_RANGE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const PAYMENT_STATUSES = new Set<string>(PAYMENT_STATUS_OPTIONS.map(({ value }) => value));

export function parseDateRangeQuery(
  value: string | null,
  today: string,
): DateRangeSelection | null {
  const token = value?.trim();

  if (!token) {
    return null;
  }

  try {
    switch (token) {
      case 'today':
      case 'last-7-days':
      case 'last-30-days':
        return createPresetDateRange(token, today);
      default: {
        const match = CUSTOM_DATE_RANGE_PATTERN.exec(token);

        if (!match) {
          return null;
        }

        return normalizeCustomDateRange(match[1], match[2]);
      }
    }
  } catch {
    return null;
  }
}

export function serializeDateRangeQuery(selection: DateRangeSelection | null): string | null {
  if (selection === null) {
    return null;
  }

  switch (selection.preset) {
    case 'today':
    case 'last-7-days':
    case 'last-30-days':
      return selection.preset;
    case 'custom':
      try {
        const normalizedSelection = normalizeCustomDateRange(selection.start, selection.end);
        return `${normalizedSelection.start}..${normalizedSelection.end}`;
      } catch {
        return null;
      }
  }
}

export function parseStatusQuery(value: string | null): readonly PaymentStatus[] {
  return parseCsvQuery(value, isPaymentStatus);
}

export function serializeStatusQuery(statuses: readonly PaymentStatus[]): string | null {
  return serializeCsvQuery(statuses, isPaymentStatus);
}

export function parsePaymentMethodQuery(value: string | null): readonly PaymentMethodFilterValue[] {
  return parseCsvQuery(value, isPaymentMethodFilterValue);
}

export function serializePaymentMethodQuery(
  methods: readonly PaymentMethodFilterValue[],
): string | null {
  return serializeCsvQuery(methods, isPaymentMethodFilterValue);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUSES.has(value);
}

function parseCsvQuery<T extends string>(
  value: string | null,
  isValue: (candidate: string) => candidate is T,
): readonly T[] {
  if (value === null || value.trim().length === 0) {
    return [];
  }

  const parsedValues: T[] = [];
  const seenValues = new Set<T>();

  for (const token of value.split(',')) {
    const candidate = token.trim();

    if (!isValue(candidate) || seenValues.has(candidate)) {
      continue;
    }

    seenValues.add(candidate);
    parsedValues.push(candidate);
  }

  return parsedValues;
}

function serializeCsvQuery<T extends string>(
  values: readonly string[],
  isValue: (candidate: string) => candidate is T,
): string | null {
  const serializedValues: T[] = [];
  const seenValues = new Set<T>();

  for (const candidate of values) {
    if (!isValue(candidate) || seenValues.has(candidate)) {
      continue;
    }

    seenValues.add(candidate);
    serializedValues.push(candidate);
  }

  return serializedValues.length > 0 ? serializedValues.join(',') : null;
}
