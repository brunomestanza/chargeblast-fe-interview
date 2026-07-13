export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';

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
