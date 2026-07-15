export const PAYMENT_METHOD_FILTER_GROUPS = [
  {
    key: 'card',
    label: 'Card',
    options: [
      { value: 'card:visa', label: 'Visa' },
      { value: 'card:mastercard', label: 'Mastercard' },
      { value: 'card:amex', label: 'American Express' },
      { value: 'card:discover', label: 'Discover' },
      { value: 'card:diners-club', label: 'Diners Club' },
      { value: 'card:jcb', label: 'JCB' },
      { value: 'card:unionpay', label: 'UnionPay' },
      { value: 'card:elo', label: 'Elo' },
    ],
  },
  {
    key: 'wallet',
    label: 'Wallet',
    options: [
      { value: 'wallet:apple-pay', label: 'Apple Pay' },
      { value: 'wallet:google-pay', label: 'Google Pay' },
      { value: 'wallet:link', label: 'Link' },
    ],
  },
  {
    key: 'bank',
    label: 'ACH and bank payments',
    options: [
      { value: 'method:ach', label: 'ACH Direct Debit' },
      { value: 'method:sepa', label: 'SEPA Direct Debit' },
      { value: 'method:ideal', label: 'iDEAL' },
      { value: 'method:pix', label: 'Pix' },
      { value: 'method:boleto', label: 'Boleto' },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    options: [
      { value: 'method:paypal', label: 'PayPal' },
      { value: 'method:cash-app-pay', label: 'Cash App Pay' },
      { value: 'method:klarna', label: 'Klarna' },
      { value: 'method:afterpay', label: 'Afterpay' },
    ],
  },
] as const;

export type PaymentMethodFilterValue =
  (typeof PAYMENT_METHOD_FILTER_GROUPS)[number]['options'][number]['value'];

const paymentMethodFilterLabels = new Map<string, string>();

for (const group of PAYMENT_METHOD_FILTER_GROUPS) {
  for (const option of group.options) {
    paymentMethodFilterLabels.set(option.value, option.label);
  }
}

export function isPaymentMethodFilterValue(value: string): value is PaymentMethodFilterValue {
  return paymentMethodFilterLabels.has(value);
}

export function paymentMethodFilterLabel(value: PaymentMethodFilterValue): string {
  return paymentMethodFilterLabels.get(value) ?? value;
}
