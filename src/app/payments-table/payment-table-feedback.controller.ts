import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { PaymentClipboardAdapter } from './payment-clipboard.adapter';
import type { PaymentCopyState } from './payment-copy-state';

const EXPORT_TOAST_DURATION_MS = 5_000;
const COPY_FEEDBACK_DURATION_MS = 1_800;

export interface PaymentExportToast {
  readonly id: number;
  readonly message: string;
}

@Service({ autoProvided: false })
export class PaymentTableFeedbackController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly clipboard = inject(PaymentClipboardAdapter);

  private readonly copyStateValue = signal<PaymentCopyState | null>(null);
  readonly copyState = this.copyStateValue.asReadonly();

  private readonly exportToastState = signal<readonly PaymentExportToast[]>([]);
  readonly exportToasts = this.exportToastState.asReadonly();

  private readonly sortAnnouncementState = signal('');
  readonly sortAnnouncement = this.sortAnnouncementState.asReadonly();

  private readonly filterAnnouncementState = signal('');
  readonly filterAnnouncement = this.filterAnnouncementState.asReadonly();

  readonly copyAnnouncement = computed(() => {
    const state = this.copyStateValue();

    if (!state) {
      return '';
    }

    return state.status === 'copied'
      ? 'Payment ID ' + state.paymentId + ' copied to clipboard.'
      : 'Payment ID ' + state.paymentId + ' could not be copied. Try again.';
  });

  private copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastId = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearCopyFeedbackTimer();
      this.clearExportToastTimer();
    });
  }

  async copyPaymentId(paymentId: string): Promise<void> {
    this.clearCopyFeedbackTimer();
    const copyResult = this.clipboard.writeText(paymentId);

    if (typeof copyResult === 'boolean') {
      this.showCopyFeedback(paymentId, copyResult ? 'copied' : 'failed');
      return;
    }

    const copied = await copyResult;
    this.showCopyFeedback(paymentId, copied ? 'copied' : 'failed');
  }

  announceSort(message: string): void {
    this.sortAnnouncementState.set(message);
  }

  announceFilter(message: string): void {
    this.filterAnnouncementState.set(message);
  }

  clearResultAnnouncements(): void {
    this.sortAnnouncementState.set('');
    this.filterAnnouncementState.set('');
  }

  showExportSuccess(paymentCount: number): void {
    this.clearExportToastTimer();
    const toastId = ++this.exportToastId;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    this.exportToastState.set([
      {
        id: toastId,
        message: `CSV export completed successfully. ${paymentCount} ${paymentLabel} exported.`,
      },
    ]);
    this.exportToastTimer = setTimeout(() => {
      if (this.exportToastState()[0]?.id === toastId) {
        this.exportToastState.set([]);
      }

      this.exportToastTimer = undefined;
    }, EXPORT_TOAST_DURATION_MS);
  }

  private showCopyFeedback(paymentId: string, status: PaymentCopyState['status']): void {
    this.copyStateValue.set({ paymentId, status });
    this.copyFeedbackTimer = setTimeout(() => {
      if (this.copyStateValue()?.paymentId === paymentId) {
        this.copyStateValue.set(null);
      }
    }, COPY_FEEDBACK_DURATION_MS);
  }

  private clearCopyFeedbackTimer(): void {
    if (this.copyFeedbackTimer !== undefined) {
      clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = undefined;
    }
  }

  private clearExportToastTimer(): void {
    if (this.exportToastTimer !== undefined) {
      clearTimeout(this.exportToastTimer);
      this.exportToastTimer = undefined;
    }
  }
}
