import type { DateRangeSelection } from './filters/date-range-filter/date-range';
import type { PaymentMethodFilterValue } from './filters/payment-method-filter/payment-method-filter-options.mock';
import type { PaymentStatus } from './payment';
import {
  DATE_RANGE_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  parseDateRangeQuery,
  parsePaymentMethodQuery,
  parseStatusQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
} from './payment-filter-query';

describe('payment filter query codec', () => {
  it('exports the stable filter query parameter names', () => {
    expect(DATE_RANGE_QUERY_PARAM).toBe('date-range');
    expect(STATUS_QUERY_PARAM).toBe('status');
    expect(PAYMENT_METHOD_QUERY_PARAM).toBe('payment-method');
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
      expect(parseStatusQuery(' failed,unknown,succeeded,failed,,pending ')).toEqual([
        'failed',
        'succeeded',
        'pending',
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
});
