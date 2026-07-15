import type { PaymentMethod } from '../payments/payment';
import type { PaymentIconCategory } from '../payments/payment-method-icon.catalog';

export interface PaymentMethodIconView {
  readonly category: PaymentIconCategory;
  readonly key: string;
}

export interface PaymentMethodPresentation {
  readonly icons: readonly PaymentMethodIconView[];
  readonly lastFour: string | null;
}

export function getPaymentMethodPresentation(
  paymentMethod: PaymentMethod,
): PaymentMethodPresentation {
  if (paymentMethod.kind === 'standalone') {
    return {
      icons: [{ category: 'method', key: paymentMethod.method }],
      lastFour: null,
    };
  }

  const brandIcon: PaymentMethodIconView = {
    category: 'card-brand',
    key: paymentMethod.brand,
  };

  return {
    icons: paymentMethod.wallet
      ? [{ category: 'wallet', key: paymentMethod.wallet }, brandIcon]
      : [brandIcon],
    lastFour: paymentMethod.lastFour,
  };
}
