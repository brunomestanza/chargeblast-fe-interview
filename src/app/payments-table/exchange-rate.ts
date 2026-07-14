import exchangeRateFixture from '../../../public/data/exchange-rates.json';

export const EXCHANGE_RATE_SOURCE_URL =
  'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';

export const EXCHANGE_RATE_CURRENCIES = [
  'EUR',
  'USD',
  'JPY',
  'GBP',
  'SEK',
  'CHF',
  'AUD',
  'BRL',
  'CAD',
  'CNY',
] as const;

export type ExchangeRateCurrency = (typeof EXCHANGE_RATE_CURRENCIES)[number];

export interface ExchangeRateSnapshot {
  readonly source: {
    readonly name: 'European Central Bank';
    readonly url: typeof EXCHANGE_RATE_SOURCE_URL;
  };
  readonly effectiveDate: string;
  readonly base: 'EUR';
  readonly quote: 'units-per-EUR';
  readonly rates: Readonly<Record<ExchangeRateCurrency, number>>;
}

const EXCHANGE_RATE_CURRENCY_SET = new Set<string>(EXCHANGE_RATE_CURRENCIES);
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isExchangeRateCurrency(value: string): value is ExchangeRateCurrency {
  return EXCHANGE_RATE_CURRENCY_SET.has(value);
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function readRate(rates: Record<string, unknown>, currency: ExchangeRateCurrency): number {
  const rate = rates[currency];

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`The exchange-rate fixture has an invalid ${currency} rate.`);
  }

  return rate;
}

export function parseExchangeRateSnapshot(value: unknown): ExchangeRateSnapshot {
  if (!isRecord(value)) {
    throw new Error('The exchange-rate fixture must be an object.');
  }

  const source = value['source'];
  const rates = value['rates'];

  if (
    !isRecord(source) ||
    source['name'] !== 'European Central Bank' ||
    source['url'] !== EXCHANGE_RATE_SOURCE_URL
  ) {
    throw new Error('The exchange-rate fixture must identify the official ECB source.');
  }

  if (!isValidIsoDate(value['effectiveDate'])) {
    throw new Error('The exchange-rate fixture must have a valid effective date.');
  }

  if (value['base'] !== 'EUR' || value['quote'] !== 'units-per-EUR') {
    throw new Error('The exchange-rate fixture must use EUR units-per-EUR quotes.');
  }

  if (!isRecord(rates)) {
    throw new Error('The exchange-rate fixture must contain rates.');
  }

  const rateKeys = Object.keys(rates);

  if (
    rateKeys.length !== EXCHANGE_RATE_CURRENCIES.length ||
    rateKeys.some((currency) => !isExchangeRateCurrency(currency))
  ) {
    throw new Error('The exchange-rate fixture must contain exactly the supported currencies.');
  }

  const parsedRates = Object.freeze({
    EUR: readRate(rates, 'EUR'),
    USD: readRate(rates, 'USD'),
    JPY: readRate(rates, 'JPY'),
    GBP: readRate(rates, 'GBP'),
    SEK: readRate(rates, 'SEK'),
    CHF: readRate(rates, 'CHF'),
    AUD: readRate(rates, 'AUD'),
    BRL: readRate(rates, 'BRL'),
    CAD: readRate(rates, 'CAD'),
    CNY: readRate(rates, 'CNY'),
  });

  if (parsedRates.EUR !== 1) {
    throw new Error('The EUR base rate must equal one.');
  }

  return Object.freeze({
    source: Object.freeze({
      name: 'European Central Bank',
      url: EXCHANGE_RATE_SOURCE_URL,
    }),
    effectiveDate: value['effectiveDate'],
    base: 'EUR',
    quote: 'units-per-EUR',
    rates: parsedRates,
  });
}

export const ECB_EXCHANGE_RATE_SNAPSHOT = parseExchangeRateSnapshot(exchangeRateFixture);

export function convertPaymentAmountToUsdCents(amount: number, currency: string): number | null {
  if (!Number.isFinite(amount) || amount < 0 || !isExchangeRateCurrency(currency)) {
    return null;
  }

  const rates = ECB_EXCHANGE_RATE_SNAPSHOT.rates;
  const amountInUsd = (amount / rates[currency]) * rates.USD;

  if (!Number.isFinite(amountInUsd) || amountInUsd < 0) {
    return null;
  }

  const amountInUsdCents = Math.round(amountInUsd * 100);

  if (!Number.isSafeInteger(amountInUsdCents)) {
    return null;
  }

  return amountInUsdCents === 0 ? 0 : amountInUsdCents;
}
