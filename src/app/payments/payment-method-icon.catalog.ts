export type PaymentIconCategory = 'card-brand' | 'wallet' | 'method';

export interface PaymentIconDefinition {
  readonly label: string;
  readonly source: string;
}

const PAYMENT_ICON_CATALOG: Record<
  PaymentIconCategory,
  Readonly<Record<string, PaymentIconDefinition>>
> = {
  'card-brand': {
    visa: {
      label: 'Visa',
      source: '/icons/payment-methods/card-brands/visa.webp',
    },
    mastercard: {
      label: 'Mastercard',
      source: '/icons/payment-methods/card-brands/mastercard.webp',
    },
    amex: {
      label: 'American Express',
      source: '/icons/payment-methods/card-brands/amex.webp',
    },
    discover: {
      label: 'Discover',
      source: '/icons/payment-methods/card-brands/discover.webp',
    },
    'diners-club': {
      label: 'Diners Club',
      source: '/icons/payment-methods/card-brands/diners-club.webp',
    },
    jcb: {
      label: 'JCB',
      source: '/icons/payment-methods/card-brands/jcb.webp',
    },
    unionpay: {
      label: 'UnionPay',
      source: '/icons/payment-methods/card-brands/unionpay.webp',
    },
  },
  wallet: {
    'apple-pay': {
      label: 'Apple Pay',
      source: '/icons/payment-methods/wallets/apple-pay.webp',
    },
    'google-pay': {
      label: 'Google Pay',
      source: '/icons/payment-methods/wallets/google-pay.webp',
    },
    link: {
      label: 'Link',
      source: '/icons/payment-methods/wallets/link.webp',
    },
  },
  method: {
    ach: {
      label: 'ACH Direct Debit',
      source: '/icons/payment-methods/methods/ach.webp',
    },
    sepa: {
      label: 'SEPA Direct Debit',
      source: '/icons/payment-methods/methods/sepa.webp',
    },
    ideal: {
      label: 'iDEAL',
      source: '/icons/payment-methods/methods/ideal.webp',
    },
    klarna: {
      label: 'Klarna',
      source: '/icons/payment-methods/methods/klarna.webp',
    },
    afterpay: {
      label: 'Afterpay',
      source: '/icons/payment-methods/methods/afterpay.webp',
    },
    paypal: {
      label: 'PayPal',
      source: '/icons/payment-methods/methods/paypal.webp',
    },
    'cash-app-pay': {
      label: 'Cash App Pay',
      source: '/icons/payment-methods/methods/cash-app-pay.webp',
    },
    pix: {
      label: 'Pix',
      source: '/icons/payment-methods/methods/pix.webp',
    },
    boleto: {
      label: 'Boleto',
      source: '/icons/payment-methods/methods/boleto.webp',
    },
  },
};

export function getPaymentIconDefinition(
  category: PaymentIconCategory,
  iconKey: string,
): PaymentIconDefinition | null {
  return PAYMENT_ICON_CATALOG[category][iconKey] ?? null;
}

export function humanizePaymentIconKey(iconKey: string): string {
  const words = iconKey
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'Unknown payment method';
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

export function paymentIconFallbackText(label: string): string {
  const words = label.split(/[-_\s]+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
