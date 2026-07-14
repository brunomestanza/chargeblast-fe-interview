import type { Payment } from '../../payment';
import {
  createAmountRange,
  formatAmountRangeLabel,
  formatUsdCents,
  formatUsdCentsForQuery,
  isValidAmountRange,
  matchesAmountRange,
  parseUsdAmount,
  usdAmountToCents,
} from './amount-range';

function payment(amount: number, currency: string): Payment {
  return {
    id: `pay_${currency}_${amount}`,
    customer: 'customer@example.com',
    amount,
    currency,
    status: 'succeeded',
    paymentMethod: { kind: 'card', brand: 'visa', lastFour: '4242' },
    createdAt: '2026-07-14T12:00:00.000Z',
  };
}

describe('amount range', () => {
  it('converts valid USD input values into integer cents', () => {
    expect(usdAmountToCents(0)).toBe(0);
    expect(usdAmountToCents(-0)).toBe(0);
    expect(usdAmountToCents(10)).toBe(1_000);
    expect(usdAmountToCents(10.25)).toBe(1_025);
    expect(parseUsdAmount('10.25')).toBe(1_025);
    expect(parseUsdAmount('0')).toBe(0);
    expect(parseUsdAmount('90071992547409.91')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects missing, negative, non-finite, over-precise, and unsafe USD values', () => {
    expect(usdAmountToCents(null)).toBeNull();
    expect(usdAmountToCents(-0.01)).toBeNull();
    expect(usdAmountToCents(Number.NaN)).toBeNull();
    expect(usdAmountToCents(Number.POSITIVE_INFINITY)).toBeNull();
    expect(usdAmountToCents(1.001)).toBeNull();
    expect(usdAmountToCents(Number.MAX_SAFE_INTEGER)).toBeNull();
    expect(parseUsdAmount('')).toBeNull();
    expect(parseUsdAmount('-1')).toBeNull();
    expect(parseUsdAmount('1.001')).toBeNull();
    expect(parseUsdAmount('1e2')).toBeNull();
    expect(parseUsdAmount('90071992547409.92')).toBeNull();
  });

  it('creates only complete, ordered ranges with a maximum of at least one dollar', () => {
    expect(createAmountRange(0, 1)).toEqual({
      minimumUsdCents: 0,
      maximumUsdCents: 100,
    });
    expect(createAmountRange(10, 10)).toEqual({
      minimumUsdCents: 1_000,
      maximumUsdCents: 1_000,
    });
    expect(createAmountRange(null, 10)).toBeNull();
    expect(createAmountRange(0, null)).toBeNull();
    expect(createAmountRange(0, 0.99)).toBeNull();
    expect(createAmountRange(10, 9.99)).toBeNull();
    expect(createAmountRange(-1, 10)).toBeNull();
  });

  it('validates the integer-cent representation', () => {
    expect(isValidAmountRange({ minimumUsdCents: 0, maximumUsdCents: 100 })).toBe(true);
    expect(isValidAmountRange({ minimumUsdCents: 1_000, maximumUsdCents: 1_000 })).toBe(true);
    expect(isValidAmountRange({ minimumUsdCents: -1, maximumUsdCents: 100 })).toBe(false);
    expect(isValidAmountRange({ minimumUsdCents: 100, maximumUsdCents: 99 })).toBe(false);
    expect(isValidAmountRange({ minimumUsdCents: 0.5, maximumUsdCents: 100 })).toBe(false);
  });

  it('formats USD amounts and the active label with exactly two decimals', () => {
    expect(formatUsdCents(1_025)).toBe('$10.25');
    expect(formatUsdCents(Number.MAX_SAFE_INTEGER)).toBe('$90,071,992,547,409.91');
    expect(formatUsdCentsForQuery(1_025)).toBe('10.25');
    expect(formatUsdCentsForQuery(Number.MAX_SAFE_INTEGER)).toBe('90071992547409.91');
    expect(formatAmountRangeLabel({ minimumUsdCents: 1_000, maximumUsdCents: 10_000 })).toBe(
      '$10.00 to $100.00',
    );
  });

  it('matches inclusive USD bounds after converting other currencies with the ECB mock', () => {
    const exactConvertedRange = { minimumUsdCents: 114, maximumUsdCents: 114 };

    expect(matchesAmountRange(payment(1.1405, 'USD'), exactConvertedRange)).toBe(true);
    expect(matchesAmountRange(payment(1, 'EUR'), exactConvertedRange)).toBe(true);
    expect(matchesAmountRange(payment(5.8431, 'BRL'), exactConvertedRange)).toBe(true);
    expect(matchesAmountRange(payment(185.01, 'JPY'), exactConvertedRange)).toBe(true);
    expect(matchesAmountRange(payment(1.13, 'USD'), exactConvertedRange)).toBe(false);
    expect(matchesAmountRange(payment(1.15, 'USD'), exactConvertedRange)).toBe(false);
  });

  it('does not match a payment whose currency has no mocked rate', () => {
    expect(
      matchesAmountRange(payment(10, 'XYZ'), {
        minimumUsdCents: 0,
        maximumUsdCents: 10_000,
      }),
    ).toBe(false);
  });
});
