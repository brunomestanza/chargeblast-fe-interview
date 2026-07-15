import type { PaymentMethod } from '../../../payments/payment';
import {
  isPaymentMethodFilterValue,
  type PaymentMethodFilterValue,
} from './payment-method-filter-options';

export function paymentMethodFilterValue(
  paymentMethod: PaymentMethod,
): PaymentMethodFilterValue | null {
  const candidate =
    paymentMethod.kind === 'card'
      ? paymentMethod.wallet
        ? `wallet:${paymentMethod.wallet}`
        : `card:${paymentMethod.brand}`
      : `method:${paymentMethod.method}`;

  return isPaymentMethodFilterValue(candidate) ? candidate : null;
}

export function matchesPaymentMethodFilter(
  paymentMethod: PaymentMethod,
  selectedValues: readonly PaymentMethodFilterValue[],
): boolean {
  if (selectedValues.length === 0) {
    return true;
  }

  const value = paymentMethodFilterValue(paymentMethod);
  return value !== null && selectedValues.includes(value);
}
