import exchangeRateFixture from '../../../public/data/exchange-rates.json';
import {
  ECB_EXCHANGE_RATE_SNAPSHOT,
  EXCHANGE_RATE_CURRENCIES,
  EXCHANGE_RATE_SOURCE_URL,
  convertPaymentAmountToUsdCents,
  parseExchangeRateSnapshot,
} from './exchange-rate';

describe('ECB exchange rates', () => {
  it('parses and freezes the checked-in official snapshot', () => {
    expect(ECB_EXCHANGE_RATE_SNAPSHOT).toEqual(exchangeRateFixture);
    expect(ECB_EXCHANGE_RATE_SNAPSHOT.source.url).toBe(EXCHANGE_RATE_SOURCE_URL);
    expect(ECB_EXCHANGE_RATE_SNAPSHOT.effectiveDate).toBe('2026-07-14');
    expect(ECB_EXCHANGE_RATE_SNAPSHOT.base).toBe('EUR');
    expect(ECB_EXCHANGE_RATE_SNAPSHOT.quote).toBe('units-per-EUR');
    expect(Object.keys(ECB_EXCHANGE_RATE_SNAPSHOT.rates)).toEqual(EXCHANGE_RATE_CURRENCIES);
    expect(Object.isFrozen(ECB_EXCHANGE_RATE_SNAPSHOT)).toBe(true);
    expect(Object.isFrozen(ECB_EXCHANGE_RATE_SNAPSHOT.source)).toBe(true);
    expect(Object.isFrozen(ECB_EXCHANGE_RATE_SNAPSHOT.rates)).toBe(true);
  });

  it.each([
    ['EUR', 100],
    ['JPY', 18_501],
    ['GBP', 85.215],
    ['SEK', 1_103.6],
    ['CHF', 92.57],
    ['AUD', 164.28],
    ['BRL', 584.31],
    ['CAD', 160.95],
    ['CNY', 773.27],
  ] as const)('converts 100 EUR worth of %s into USD cents', (currency, amount) => {
    expect(convertPaymentAmountToUsdCents(amount, currency)).toBe(11_405);
  });

  it('keeps USD amounts unchanged apart from converting major units to cents', () => {
    expect(convertPaymentAmountToUsdCents(249, 'USD')).toBe(24_900);
    expect(convertPaymentAmountToUsdCents(64.99, 'USD')).toBe(6_499);
  });

  it('rounds once, to the nearest USD cent, after applying both exchange rates', () => {
    expect(convertPaymentAmountToUsdCents(1, 'CAD')).toBe(71);
    expect(convertPaymentAmountToUsdCents(1, 'JPY')).toBe(1);
    expect(convertPaymentAmountToUsdCents(0.5, 'JPY')).toBe(0);
  });

  it('accepts zero and normalizes negative zero', () => {
    expect(convertPaymentAmountToUsdCents(0, 'EUR')).toBe(0);
    expect(convertPaymentAmountToUsdCents(-0, 'USD')).toBe(0);
    expect(Object.is(convertPaymentAmountToUsdCents(-0, 'USD'), -0)).toBe(false);
  });

  it.each(['', 'usd', 'XYZ', 'BRL '] as const)(
    'returns null for the unsupported currency %j',
    (currency) => {
      expect(convertPaymentAmountToUsdCents(100, currency)).toBeNull();
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_VALUE])(
    'returns null for the invalid amount %s',
    (amount) => {
      expect(convertPaymentAmountToUsdCents(amount, 'USD')).toBeNull();
    },
  );

  it('rejects invalid snapshot containers and metadata', () => {
    expect(() => parseExchangeRateSnapshot(null)).toThrow('must be an object');
    expect(() => parseExchangeRateSnapshot([])).toThrow('must be an object');
    expect(() =>
      parseExchangeRateSnapshot({ ...exchangeRateFixture, source: { name: 'Other', url: 'x' } }),
    ).toThrow('official ECB source');
    expect(() =>
      parseExchangeRateSnapshot({ ...exchangeRateFixture, effectiveDate: '2026-02-30' }),
    ).toThrow('valid effective date');
    expect(() => parseExchangeRateSnapshot({ ...exchangeRateFixture, base: 'USD' })).toThrow(
      'EUR units-per-EUR',
    );
    expect(() =>
      parseExchangeRateSnapshot({ ...exchangeRateFixture, quote: 'EUR-per-unit' }),
    ).toThrow('EUR units-per-EUR');
  });

  it('rejects missing, additional, non-positive, and non-finite rates', () => {
    const { CNY: _omitted, ...missingCurrency } = exchangeRateFixture.rates;

    expect(() => parseExchangeRateSnapshot({ ...exchangeRateFixture, rates: null })).toThrow(
      'must contain rates',
    );
    expect(() =>
      parseExchangeRateSnapshot({ ...exchangeRateFixture, rates: missingCurrency }),
    ).toThrow('exactly the supported currencies');
    expect(() =>
      parseExchangeRateSnapshot({
        ...exchangeRateFixture,
        rates: { ...exchangeRateFixture.rates, NZD: 1.9 },
      }),
    ).toThrow('exactly the supported currencies');
    expect(() =>
      parseExchangeRateSnapshot({
        ...exchangeRateFixture,
        rates: { ...exchangeRateFixture.rates, BRL: 0 },
      }),
    ).toThrow('invalid BRL rate');
    expect(() =>
      parseExchangeRateSnapshot({
        ...exchangeRateFixture,
        rates: { ...exchangeRateFixture.rates, CAD: Number.POSITIVE_INFINITY },
      }),
    ).toThrow('invalid CAD rate');
    expect(() =>
      parseExchangeRateSnapshot({
        ...exchangeRateFixture,
        rates: { ...exchangeRateFixture.rates, EUR: 2 },
      }),
    ).toThrow('EUR base rate must equal one');
  });
});
