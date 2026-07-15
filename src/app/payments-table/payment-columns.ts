import { PAYMENT_TABLE_COLUMN_KEYS, type PaymentTableColumnKey } from './payment-table-column';

export const COLUMN_ORDER_STORAGE_KEY = 'chargeblast.payments.column-order';
export const COLUMN_WIDTHS_STORAGE_KEY = 'chargeblast.payments.column-widths';

export const MIN_COLUMN_WIDTH = 96;
export const MAX_COLUMN_WIDTH = 720;

export const PAYMENT_COLUMN_KEYS: readonly PaymentTableColumnKey[] = PAYMENT_TABLE_COLUMN_KEYS;

export type PaymentColumnWidths = Readonly<Partial<Record<PaymentTableColumnKey, number>>>;

export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return MIN_COLUMN_WIDTH;
  }

  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

export function normalizeColumnOrder(
  order: readonly string[] | null,
  canonicalOrder: readonly PaymentTableColumnKey[] = PAYMENT_COLUMN_KEYS,
): PaymentTableColumnKey[] {
  const canonical = new Set<string>(canonicalOrder);
  const seen = new Set<PaymentTableColumnKey>();
  const normalized: PaymentTableColumnKey[] = [];

  if (order) {
    for (const key of order) {
      if (canonical.has(key) && !seen.has(key as PaymentTableColumnKey)) {
        seen.add(key as PaymentTableColumnKey);
        normalized.push(key as PaymentTableColumnKey);
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
  canonicalOrder: readonly PaymentTableColumnKey[] = PAYMENT_COLUMN_KEYS,
): PaymentTableColumnKey[] {
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
  canonicalOrder: readonly PaymentTableColumnKey[] = PAYMENT_COLUMN_KEYS,
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
    const widths: Partial<Record<PaymentTableColumnKey, number>> = {};

    for (const [key, raw] of Object.entries(parsed)) {
      if (valid.has(key) && typeof raw === 'number' && Number.isFinite(raw)) {
        widths[key as PaymentTableColumnKey] = clampColumnWidth(raw);
      }
    }

    return widths;
  } catch {
    return {};
  }
}

export function serializeColumnOrder(order: readonly PaymentTableColumnKey[]): string {
  return JSON.stringify(order);
}

export function serializeColumnWidths(widths: PaymentColumnWidths): string {
  return JSON.stringify(widths);
}

export function moveColumn(
  order: readonly PaymentTableColumnKey[],
  fromIndex: number,
  toIndex: number,
): PaymentTableColumnKey[] {
  const result = [...order];

  if (fromIndex < 0 || fromIndex >= result.length) {
    return result;
  }

  const clampedTo = Math.min(result.length - 1, Math.max(0, toIndex));
  const [moved] = result.splice(fromIndex, 1);
  result.splice(clampedTo, 0, moved);
  return result;
}
