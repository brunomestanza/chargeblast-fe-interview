import { InjectionToken } from '@angular/core';

export const MIN_PAYMENT_QUERY_DELAY_MS = 500;
export const MAX_PAYMENT_QUERY_DELAY_MS = 1_500;

export type PaymentQueryDelay = () => number;

export function createPaymentQueryDelay(random: () => number = Math.random): number {
  const delayRange = MAX_PAYMENT_QUERY_DELAY_MS - MIN_PAYMENT_QUERY_DELAY_MS + 1;
  return MIN_PAYMENT_QUERY_DELAY_MS + Math.floor(random() * delayRange);
}

export const PAYMENT_QUERY_DELAY = new InjectionToken<PaymentQueryDelay>('PAYMENT_QUERY_DELAY', {
  factory: () => () => createPaymentQueryDelay(),
});
