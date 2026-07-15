import type { Payment } from '../../../payments/payment';
import { convertPaymentAmountToUsdCents } from '../../exchange-rate';

export interface AmountRange {
  readonly minimumUsdCents: number;
  readonly maximumUsdCents: number;
}

const USD_WHOLE_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const USD_AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function usdAmountToCents(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const cents = Math.round(value * 100);

  if (!Number.isSafeInteger(cents) || Math.abs(cents / 100 - value) > Number.EPSILON * 100) {
    return null;
  }

  return Object.is(cents, -0) ? 0 : cents;
}

export function parseUsdAmount(value: string): number | null {
  const match = USD_AMOUNT_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const cents = Number(`${match[1]}${(match[2] ?? '').padEnd(2, '0')}`);

  return Number.isSafeInteger(cents) ? cents : null;
}

export function createAmountRange(
  minimumUsd: number | null,
  maximumUsd: number | null,
): AmountRange | null {
  const minimumUsdCents = usdAmountToCents(minimumUsd);
  const maximumUsdCents = usdAmountToCents(maximumUsd);

  if (
    minimumUsdCents === null ||
    maximumUsdCents === null ||
    maximumUsdCents < 100 ||
    maximumUsdCents < minimumUsdCents
  ) {
    return null;
  }

  return { minimumUsdCents, maximumUsdCents };
}

export function isValidAmountRange(range: AmountRange): boolean {
  return (
    Number.isSafeInteger(range.minimumUsdCents) &&
    Number.isSafeInteger(range.maximumUsdCents) &&
    range.minimumUsdCents >= 0 &&
    range.maximumUsdCents >= 100 &&
    range.maximumUsdCents >= range.minimumUsdCents
  );
}

export function formatUsdCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const fractionalCents = cents % 100;

  return `$${USD_WHOLE_NUMBER_FORMATTER.format(dollars)}.${fractionalCents.toString().padStart(2, '0')}`;
}

export function formatAmountRangeLabel(range: AmountRange): string {
  return `${formatUsdCents(range.minimumUsdCents)} to ${formatUsdCents(range.maximumUsdCents)}`;
}

export function formatUsdCentsForQuery(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const fractionalCents = cents % 100;

  return `${dollars}.${fractionalCents.toString().padStart(2, '0')}`;
}

export function matchesAmountRange(payment: Payment, range: AmountRange): boolean {
  const paymentUsdCents = convertPaymentAmountToUsdCents(payment.amount, payment.currency);

  return (
    paymentUsdCents !== null &&
    paymentUsdCents >= range.minimumUsdCents &&
    paymentUsdCents <= range.maximumUsdCents
  );
}
