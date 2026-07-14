import { describe, expect, it } from 'vitest';
import {
  MAX_PAYMENT_QUERY_DELAY_MS,
  MIN_PAYMENT_QUERY_DELAY_MS,
  createPaymentQueryDelay,
} from './payment-query-delay';

describe('createPaymentQueryDelay', () => {
  it('returns the inclusive minimum and maximum delay', () => {
    expect(createPaymentQueryDelay(() => 0)).toBe(MIN_PAYMENT_QUERY_DELAY_MS);
    expect(createPaymentQueryDelay(() => 0.999_999)).toBe(MAX_PAYMENT_QUERY_DELAY_MS);
  });

  it('returns a delay inside the expected range', () => {
    expect(createPaymentQueryDelay(() => 0.5)).toBe(1_000);
  });
});
