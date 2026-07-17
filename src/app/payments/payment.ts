export type PaymentStatus =
  'succeeded' | 'failed' | 'refunded' | 'disputed' | 'uncaptured' | 'canceled' | 'blocked';

export const PAYMENT_STATUS_LABELS = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  refunded: 'Refunded',
  disputed: 'Disputed',
  uncaptured: 'Uncaptured',
  canceled: 'Canceled',
  blocked: 'Blocked',
} as const satisfies Readonly<Record<PaymentStatus, string>>;

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'succeeded', label: PAYMENT_STATUS_LABELS.succeeded },
  { value: 'failed', label: PAYMENT_STATUS_LABELS.failed },
  { value: 'refunded', label: PAYMENT_STATUS_LABELS.refunded },
  { value: 'disputed', label: PAYMENT_STATUS_LABELS.disputed },
  { value: 'uncaptured', label: PAYMENT_STATUS_LABELS.uncaptured },
  { value: 'canceled', label: PAYMENT_STATUS_LABELS.canceled },
  { value: 'blocked', label: PAYMENT_STATUS_LABELS.blocked },
] as const satisfies readonly {
  readonly value: PaymentStatus;
  readonly label: string;
}[];

/** Statuses surfaced as quick-filter cards, matching the mock's status overview. */
export const PAYMENT_STATUS_CARD_ORDER = [
  'succeeded',
  'refunded',
  'disputed',
  'failed',
  'uncaptured',
] as const satisfies readonly PaymentStatus[];

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
  /** Present on every seeded row; optional so lightweight test fixtures stay terse. */
  readonly description?: string;
  readonly refundedAt?: string | null;
  readonly declineReason?: string | null;
}
