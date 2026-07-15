export interface PaymentCopyState {
  readonly paymentId: string;
  readonly status: 'copied' | 'failed';
}
