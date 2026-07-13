import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Payment } from './payment';
import { PaymentCopyState, PaymentRow } from './payment-row';

@Component({
  selector: 'app-payments-table',
  imports: [PaymentRow],
  templateUrl: './payments-table.html',
  styleUrl: './payments-table.css',
})
export class PaymentsTable {
  readonly payments = input.required<readonly Payment[]>();

  protected readonly copyState = signal<PaymentCopyState | null>(null);
  protected readonly currentTime = signal<number | null>(null);
  protected readonly timeZone = signal('UTC');
  protected readonly paymentCountLabel = computed(() => {
    const count = this.payments().length;
    return count === 1 ? '1 payment' : count + ' payments';
  });
  protected readonly copyAnnouncement = computed(() => {
    const state = this.copyState();

    if (!state) {
      return '';
    }

    return state.status === 'copied'
      ? 'Payment ID ' + state.paymentId + ' copied to clipboard.'
      : 'Payment ID ' + state.paymentId + ' could not be copied. Try again.';
  });

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private clockTimer: number | undefined;

  constructor() {
    afterNextRender(() => this.startBrowserState());
    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
      this.stopClock();
    });
  }

  protected async copyPaymentId(paymentId: string): Promise<void> {
    this.clearFeedbackTimer();
    const clipboard = this.document.defaultView?.navigator.clipboard;

    if (!clipboard) {
      this.showCopyFeedback(paymentId, 'failed');
      return;
    }

    try {
      await clipboard.writeText(paymentId);
      this.showCopyFeedback(paymentId, 'copied');
    } catch {
      this.showCopyFeedback(paymentId, 'failed');
    }
  }

  private startBrowserState(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.timeZone.set(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    this.currentTime.set(Date.now());
    this.clockTimer = browserWindow.setInterval(() => this.currentTime.set(Date.now()), 60_000);
  }

  private stopClock(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.clockTimer !== undefined) {
      browserWindow.clearInterval(this.clockTimer);
      this.clockTimer = undefined;
    }
  }

  private showCopyFeedback(paymentId: string, status: PaymentCopyState['status']): void {
    this.copyState.set({ paymentId, status });
    this.feedbackTimer = setTimeout(() => {
      if (this.copyState()?.paymentId === paymentId) {
        this.copyState.set(null);
      }
    }, 1800);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== undefined) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = undefined;
    }
  }
}
