import type { DateRangeSelection } from './filters/date-range-filter/date-range';
import type { AmountRange } from './filters/amount-range-filter/amount-range';
import type { PaymentMethodFilterValue } from './filters/payment-method-filter/payment-method-filter-options';
import type { PaymentStatus } from './payment';
import {
  AMOUNT_RANGE_QUERY_PARAM,
  DATE_RANGE_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  TEXT_SEARCH_QUERY_PARAM,
  parseAmountRangeQuery,
  parseDateRangeQuery,
  parsePaymentMethodQuery,
  parseStatusQuery,
  parseTextSearchQuery,
  serializeAmountRangeQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
  serializeTextSearchQuery,
} from './payment-filter-query';

describe('payment filter query codec', () => {
  it('exports the stable filter query parameter names', () => {
    expect(DATE_RANGE_QUERY_PARAM).toBe('date-range');
    expect(STATUS_QUERY_PARAM).toBe('status');
    expect(PAYMENT_METHOD_QUERY_PARAM).toBe('payment-method');
    expect(AMOUNT_RANGE_QUERY_PARAM).toBe('amount-range');
    expect(TEXT_SEARCH_QUERY_PARAM).toBe('text-search');
  });

  describe('date range', () => {
    const today = '2026-07-14';

    it('treats an absent or empty value as no date range', () => {
      expect(parseDateRangeQuery(null, today)).toBeNull();
      expect(parseDateRangeQuery('', today)).toBeNull();
      expect(parseDateRangeQuery('   ', today)).toBeNull();
    });

    it('resolves each relative preset against today', () => {
      expect(parseDateRangeQuery('today', today)).toEqual({
        preset: 'today',
        start: '2026-07-14',
        end: '2026-07-14',
      });
      expect(parseDateRangeQuery('last-7-days', today)).toEqual({
        preset: 'last-7-days',
        start: '2026-07-08',
        end: '2026-07-14',
      });
      expect(parseDateRangeQuery('last-30-days', today)).toEqual({
        preset: 'last-30-days',
        start: '2026-06-15',
        end: '2026-07-14',
      });
    });

    it('parses exact custom dates and normalizes reversed bounds', () => {
      expect(parseDateRangeQuery('2026-07-01..2026-07-14', today)).toEqual({
        preset: 'custom',
        start: '2026-07-01',
        end: '2026-07-14',
      });
      expect(parseDateRangeQuery('2026-07-14..2026-07-01', today)).toEqual({
        preset: 'custom',
        start: '2026-07-01',
        end: '2026-07-14',
      });
    });

    it('rejects unsupported, malformed, and invalid date values', () => {
      expect(parseDateRangeQuery('custom', today)).toBeNull();
      expect(parseDateRangeQuery('last-90-days', today)).toBeNull();
      expect(parseDateRangeQuery('2026-07-01/2026-07-14', today)).toBeNull();
      expect(parseDateRangeQuery('2026-07-01..', today)).toBeNull();
      expect(parseDateRangeQuery('2026-07-01..2026-07-14..2026-07-20', today)).toBeNull();
      expect(parseDateRangeQuery('2026-02-30..2026-03-01', today)).toBeNull();
      expect(parseDateRangeQuery('today', 'not-a-date')).toBeNull();
    });

    it('serializes relative presets without persisting their resolved dates', () => {
      const selection: DateRangeSelection = {
        preset: 'last-7-days',
        start: '2026-07-08',
        end: '2026-07-14',
      };

      expect(serializeDateRangeQuery(selection)).toBe('last-7-days');
      expect(parseDateRangeQuery(serializeDateRangeQuery(selection), '2026-07-21')).toEqual({
        preset: 'last-7-days',
        start: '2026-07-15',
        end: '2026-07-21',
      });
    });

    it('serializes and normalizes custom ranges while rejecting invalid dates', () => {
      expect(
        serializeDateRangeQuery({
          preset: 'custom',
          start: '2026-07-14',
          end: '2026-07-01',
        }),
      ).toBe('2026-07-01..2026-07-14');
      expect(
        serializeDateRangeQuery({
          preset: 'custom',
          start: '2026-02-30',
          end: '2026-03-01',
        }),
      ).toBeNull();
      expect(serializeDateRangeQuery(null)).toBeNull();
    });
  });

  describe('status', () => {
    it('parses known CSV values, preserving first-seen order', () => {
      expect(parseStatusQuery(' failed,unknown,succeeded,failed,,disputed ')).toEqual([
        'failed',
        'succeeded',
        'disputed',
      ]);
    });

    it('uses an empty selection for absent or empty values', () => {
      expect(parseStatusQuery(null)).toEqual([]);
      expect(parseStatusQuery('')).toEqual([]);
      expect(parseStatusQuery('unknown')).toEqual([]);
    });

    it('serializes valid unique values and uses null for an empty selection', () => {
      const statuses: readonly PaymentStatus[] = ['refunded', 'failed', 'refunded'];

      expect(serializeStatusQuery(statuses)).toBe('refunded,failed');
      expect(serializeStatusQuery([])).toBeNull();
      expect(serializeStatusQuery(parseStatusQuery('unknown,invalid'))).toBeNull();
      expect(parseStatusQuery(serializeStatusQuery(statuses))).toEqual(['refunded', 'failed']);
    });
  });

  describe('payment method', () => {
    it('parses known CSV values, preserving first-seen order', () => {
      expect(
        parsePaymentMethodQuery(' wallet:apple-pay,unknown,card:visa,wallet:apple-pay,method:ach '),
      ).toEqual(['wallet:apple-pay', 'card:visa', 'method:ach']);
    });

    it('uses an empty selection for absent or empty values', () => {
      expect(parsePaymentMethodQuery(null)).toEqual([]);
      expect(parsePaymentMethodQuery('')).toEqual([]);
      expect(parsePaymentMethodQuery('unknown')).toEqual([]);
    });

    it('serializes valid unique values and uses null for an empty selection', () => {
      const methods: readonly PaymentMethodFilterValue[] = ['method:pix', 'card:elo', 'method:pix'];

      expect(serializePaymentMethodQuery(methods)).toBe('method:pix,card:elo');
      expect(serializePaymentMethodQuery([])).toBeNull();
      expect(serializePaymentMethodQuery(parsePaymentMethodQuery('unknown,invalid'))).toBeNull();
      expect(parsePaymentMethodQuery(serializePaymentMethodQuery(methods))).toEqual([
        'method:pix',
        'card:elo',
      ]);
    });
  });

  describe('amount range', () => {
    it('parses valid inclusive USD ranges into integer cents', () => {
      expect(parseAmountRangeQuery('10..100')).toEqual({
        minimumUsdCents: 1_000,
        maximumUsdCents: 10_000,
      });
      expect(parseAmountRangeQuery(' 0.25..1.00 ')).toEqual({
        minimumUsdCents: 25,
        maximumUsdCents: 100,
      });
      expect(parseAmountRangeQuery('10.00..10.00')).toEqual({
        minimumUsdCents: 1_000,
        maximumUsdCents: 1_000,
      });
    });

    it('uses no range for absent, incomplete, malformed, or invalid bounds', () => {
      expect(parseAmountRangeQuery(null)).toBeNull();
      expect(parseAmountRangeQuery('')).toBeNull();
      expect(parseAmountRangeQuery('10')).toBeNull();
      expect(parseAmountRangeQuery('10..')).toBeNull();
      expect(parseAmountRangeQuery('..100')).toBeNull();
      expect(parseAmountRangeQuery('-1..100')).toBeNull();
      expect(parseAmountRangeQuery('0..0')).toBeNull();
      expect(parseAmountRangeQuery('10..9')).toBeNull();
      expect(parseAmountRangeQuery('1.001..2')).toBeNull();
      expect(parseAmountRangeQuery('1e2..200')).toBeNull();
      expect(parseAmountRangeQuery('NaN..100')).toBeNull();
      expect(parseAmountRangeQuery('Infinity..100')).toBeNull();
      expect(parseAmountRangeQuery('1..2..3')).toBeNull();
    });

    it('serializes valid ranges canonically and rejects invalid state', () => {
      const range: AmountRange = { minimumUsdCents: 1_000, maximumUsdCents: 10_000 };

      expect(serializeAmountRangeQuery(range)).toBe('10.00..100.00');
      expect(parseAmountRangeQuery(serializeAmountRangeQuery(range))).toEqual(range);
      expect(serializeAmountRangeQuery(null)).toBeNull();
      expect(serializeAmountRangeQuery({ minimumUsdCents: 100, maximumUsdCents: 99 })).toBeNull();
      expect(serializeAmountRangeQuery({ minimumUsdCents: -1, maximumUsdCents: 100 })).toBeNull();
      expect(serializeAmountRangeQuery({ minimumUsdCents: 0.5, maximumUsdCents: 100 })).toBeNull();
    });

    it('round-trips the largest safe integer-cent range without losing precision', () => {
      const range: AmountRange = {
        minimumUsdCents: Number.MAX_SAFE_INTEGER - 1,
        maximumUsdCents: Number.MAX_SAFE_INTEGER,
      };

      expect(serializeAmountRangeQuery(range)).toBe('90071992547409.90..90071992547409.91');
      expect(parseAmountRangeQuery(serializeAmountRangeQuery(range))).toEqual(range);
      expect(parseAmountRangeQuery('0..90071992547409.92')).toBeNull();
    });
  });

  describe('text search', () => {
    it('uses no search for absent, empty, or whitespace-only values', () => {
      expect(parseTextSearchQuery(null)).toBeNull();
      expect(parseTextSearchQuery('')).toBeNull();
      expect(parseTextSearchQuery('   ')).toBeNull();
    });

    it('trims a restored search without changing its casing or contents', () => {
      expect(parseTextSearchQuery('  PAY_3RxQZ  ')).toBe('PAY_3RxQZ');
      expect(parseTextSearchQuery('  Olivia.Martin@example.com  ')).toBe(
        'Olivia.Martin@example.com',
      );
    });

    it('serializes searches canonically and uses null for an empty value', () => {
      expect(serializeTextSearchQuery(null)).toBeNull();
      expect(serializeTextSearchQuery('')).toBeNull();
      expect(serializeTextSearchQuery('   ')).toBeNull();
      expect(serializeTextSearchQuery('  4242  ')).toBe('4242');
    });

    it('round-trips a non-empty search in its canonical form', () => {
      const search = '  olivia.martin  ';

      expect(parseTextSearchQuery(serializeTextSearchQuery(search))).toBe('olivia.martin');
    });
  });
});
