export const CURRENCY_FILTER_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'AUD', label: 'AUD' },
  { value: 'BRL', label: 'BRL' },
  { value: 'CAD', label: 'CAD' },
  { value: 'CHF', label: 'CHF' },
  { value: 'CNY', label: 'CNY' },
  { value: 'JPY', label: 'JPY' },
  { value: 'SEK', label: 'SEK' },
] as const satisfies readonly { readonly value: string; readonly label: string }[];

export type CurrencyFilterValue = (typeof CURRENCY_FILTER_OPTIONS)[number]['value'];

const currencyFilterValues = new Set<string>(CURRENCY_FILTER_OPTIONS.map((option) => option.value));

export function isCurrencyFilterValue(value: string): value is CurrencyFilterValue {
  return currencyFilterValues.has(value);
}

export function currencyFilterLabel(value: CurrencyFilterValue): string {
  return value;
}
