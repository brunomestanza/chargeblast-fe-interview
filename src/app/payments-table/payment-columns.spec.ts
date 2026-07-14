import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  PAYMENT_COLUMN_KEYS,
  clampColumnWidth,
  moveColumn,
  normalizeColumnOrder,
  parseStoredColumnOrder,
  parseStoredColumnWidths,
  serializeColumnOrder,
  serializeColumnWidths,
} from './payment-columns';

describe('payment-columns', () => {
  describe('clampColumnWidth', () => {
    it('keeps widths inside the allowed range', () => {
      expect(clampColumnWidth(10)).toBe(MIN_COLUMN_WIDTH);
      expect(clampColumnWidth(10_000)).toBe(MAX_COLUMN_WIDTH);
      expect(clampColumnWidth(200.4)).toBe(200);
    });

    it('falls back to the minimum width for non-finite numbers', () => {
      expect(clampColumnWidth(Number.NaN)).toBe(MIN_COLUMN_WIDTH);
      expect(clampColumnWidth(Number.POSITIVE_INFINITY)).toBe(MIN_COLUMN_WIDTH);
    });
  });

  describe('normalizeColumnOrder', () => {
    it('returns the canonical order when nothing is stored', () => {
      expect(normalizeColumnOrder(null)).toEqual([...PAYMENT_COLUMN_KEYS]);
    });

    it('drops unknown keys and appends missing columns in canonical order', () => {
      const normalized = normalizeColumnOrder(['amount', 'unknown', 'amount', 'status']);
      expect(normalized).toEqual([
        'amount',
        'status',
        'paymentId',
        'customer',
        'paymentMethod',
        'created',
      ]);
    });
  });

  describe('parseStoredColumnOrder', () => {
    it('parses a valid stored order', () => {
      const stored = serializeColumnOrder(['created', 'amount', 'status'] as never);
      expect(parseStoredColumnOrder(stored)).toEqual([
        'created',
        'amount',
        'status',
        'paymentId',
        'customer',
        'paymentMethod',
      ]);
    });

    it('falls back to the canonical order for malformed values', () => {
      expect(parseStoredColumnOrder('not-json')).toEqual([...PAYMENT_COLUMN_KEYS]);
      expect(parseStoredColumnOrder('{"a":1}')).toEqual([...PAYMENT_COLUMN_KEYS]);
      expect(parseStoredColumnOrder(null)).toEqual([...PAYMENT_COLUMN_KEYS]);
    });
  });

  describe('parseStoredColumnWidths', () => {
    it('keeps only valid, clamped numeric widths', () => {
      const stored = serializeColumnWidths({ amount: 5_000, status: 40, created: 200 });
      expect(parseStoredColumnWidths(stored)).toEqual({
        amount: MAX_COLUMN_WIDTH,
        status: MIN_COLUMN_WIDTH,
        created: 200,
      });
    });

    it('ignores unknown keys and malformed payloads', () => {
      expect(parseStoredColumnWidths('{"unknown":200}')).toEqual({});
      expect(parseStoredColumnWidths('[1,2,3]')).toEqual({});
      expect(parseStoredColumnWidths('not-json')).toEqual({});
      expect(parseStoredColumnWidths(null)).toEqual({});
    });
  });

  describe('moveColumn', () => {
    it('moves a column forward', () => {
      expect(moveColumn(['a', 'b', 'c', 'd'] as never, 0, 2)).toEqual([
        'b',
        'c',
        'a',
        'd',
      ] as never);
    });

    it('moves a column backward', () => {
      expect(moveColumn(['a', 'b', 'c', 'd'] as never, 3, 1)).toEqual([
        'a',
        'd',
        'b',
        'c',
      ] as never);
    });

    it('clamps the target index inside the array bounds', () => {
      expect(moveColumn(['a', 'b', 'c'] as never, 0, 99)).toEqual(['b', 'c', 'a'] as never);
      expect(moveColumn(['a', 'b', 'c'] as never, 2, -5)).toEqual(['c', 'a', 'b'] as never);
    });

    it('returns an equivalent array when the source index is invalid', () => {
      expect(moveColumn(['a', 'b'] as never, 5, 0)).toEqual(['a', 'b'] as never);
    });
  });
});
