import { PAYMENT_SORT_COLUMNS, PaymentSortColumn } from './payment-sort';

export const COLUMN_ORDER_STORAGE_KEY = 'chargeblast.payments.column-order';
export const COLUMN_WIDTHS_STORAGE_KEY = 'chargeblast.payments.column-widths';

export const MIN_COLUMN_WIDTH = 96;
export const MAX_COLUMN_WIDTH = 720;

export const PAYMENT_COLUMN_KEYS: readonly PaymentSortColumn[] = PAYMENT_SORT_COLUMNS;

export type PaymentColumnWidths = Readonly<Partial<Record<PaymentSortColumn, number>>>;

export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return MIN_COLUMN_WIDTH;
  }

  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

export function normalizeColumnOrder(
  order: readonly string[] | null,
  canonicalOrder: readonly PaymentSortColumn[] = PAYMENT_COLUMN_KEYS,
): PaymentSortColumn[] {
  const canonical = new Set<string>(canonicalOrder);
  const seen = new Set<PaymentSortColumn>();
  const normalized: PaymentSortColumn[] = [];

  if (order) {
    for (const key of order) {
      if (canonical.has(key) && !seen.has(key as PaymentSortColumn)) {
        seen.add(key as PaymentSortColumn);
        normalized.push(key as PaymentSortColumn);
      }
    }
  }

  for (const key of canonicalOrder) {
    if (!seen.has(key)) {
      normalized.push(key);
    }
  }

  return normalized;
}

export function parseStoredColumnOrder(
  value: string | null,
  canonicalOrder: readonly PaymentSortColumn[] = PAYMENT_COLUMN_KEYS,
): PaymentSortColumn[] {
  if (value === null) {
    return [...canonicalOrder];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [...canonicalOrder];
    }

    const keys = parsed.filter((key): key is string => typeof key === 'string');
    return normalizeColumnOrder(keys, canonicalOrder);
  } catch {
    return [...canonicalOrder];
  }
}

export function parseStoredColumnWidths(
  value: string | null,
  canonicalOrder: readonly PaymentSortColumn[] = PAYMENT_COLUMN_KEYS,
): PaymentColumnWidths {
  if (value === null) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const valid = new Set<string>(canonicalOrder);
    const widths: Partial<Record<PaymentSortColumn, number>> = {};

    for (const [key, raw] of Object.entries(parsed)) {
      if (valid.has(key) && typeof raw === 'number' && Number.isFinite(raw)) {
        widths[key as PaymentSortColumn] = clampColumnWidth(raw);
      }
    }

    return widths;
  } catch {
    return {};
  }
}

export function serializeColumnOrder(order: readonly PaymentSortColumn[]): string {
  return JSON.stringify(order);
}

export function serializeColumnWidths(widths: PaymentColumnWidths): string {
  return JSON.stringify(widths);
}

export function moveColumn(
  order: readonly PaymentSortColumn[],
  fromIndex: number,
  toIndex: number,
): PaymentSortColumn[] {
  const result = [...order];

  if (fromIndex < 0 || fromIndex >= result.length) {
    return result;
  }

  const clampedTo = Math.min(result.length - 1, Math.max(0, toIndex));
  const [moved] = result.splice(fromIndex, 1);
  result.splice(clampedTo, 0, moved);
  return result;
}

export function readStoredColumnOrder(
  browserWindow: Window | null = typeof window === 'undefined' ? null : window,
): PaymentSortColumn[] {
  if (!browserWindow) {
    return [...PAYMENT_COLUMN_KEYS];
  }

  try {
    return parseStoredColumnOrder(browserWindow.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY));
  } catch {
    return [...PAYMENT_COLUMN_KEYS];
  }
}

export function readStoredColumnWidths(
  browserWindow: Window | null = typeof window === 'undefined' ? null : window,
): PaymentColumnWidths {
  if (!browserWindow) {
    return {};
  }

  try {
    return parseStoredColumnWidths(browserWindow.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY));
  } catch {
    return {};
  }
}
