export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';

export const PAYMENT_STATUS_LABELS = {
  succeeded: 'Succeeded',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
} as const satisfies Readonly<Record<PaymentStatus, string>>;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'succeeded', label: PAYMENT_STATUS_LABELS.succeeded },
  { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
  { value: 'failed', label: PAYMENT_STATUS_LABELS.failed },
  { value: 'refunded', label: PAYMENT_STATUS_LABELS.refunded },
] as const satisfies readonly {
  readonly value: PaymentStatus;
  readonly label: string;
}[];

export interface CardPaymentMethod {
  readonly kind: 'card';
  readonly brand: string;
  readonly wallet?: string;
  readonly lastFour: string;
}

export interface StandalonePaymentMethod {
  readonly kind: 'standalone';
  readonly method: string;
  readonly lastFour?: string;
}

export type PaymentMethod = CardPaymentMethod | StandalonePaymentMethod;

export interface Payment {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly paymentMethod: PaymentMethod;
  readonly createdAt: string;
}
