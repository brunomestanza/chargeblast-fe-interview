export type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded';
export type PaymentMethodKind = 'card' | 'ach' | 'wallet';
export type PaymentMethodBrand = 'visa' | 'mastercard' | 'amex' | 'ach' | 'apple-pay';

export interface PaymentMethod {
  readonly kind: PaymentMethodKind;
  readonly brand: string;
  readonly brandKey: PaymentMethodBrand;
  readonly mark: string;
  readonly lastFour: string;
}

export interface Payment {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly paymentMethod: PaymentMethod;
  readonly createdAt: string;
}
