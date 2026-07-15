import { Component, computed, input, output } from '@angular/core';
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from '../payments/payment';
import { PAYMENT_COLUMN_KEYS } from './payment-columns';
import type { PaymentCopyState } from './payment-copy-state';
import {
  formatCreatedDate,
  formatCreatedTime,
  formatCurrencyAmount,
  formatRelativeTime,
} from './payment-display-format';
import { getPaymentMethodPresentation } from './payment-method-presentation';
import { PaymentMethodIcon } from '../payments/payment-method-icon';
import type { PaymentTableColumnKey } from './payment-table-column';

export type { PaymentCopyState } from './payment-copy-state';
export { formatCreatedDate, formatCreatedTime, formatRelativeTime } from './payment-display-format';

@Component({
  selector: 'tr[appPaymentRow]',
  imports: [PaymentMethodIcon],
  templateUrl: './payment-row.html',
  styleUrl: './payment-row.css',
  host: {
    '(click)': 'openDetails($event)',
  },
})
export class PaymentRow {
  readonly payment = input.required<Payment>();
  readonly copyState = input<PaymentCopyState | null>(null);
  readonly currentTime = input<number | null>(null);
  readonly timeZone = input('UTC');
  readonly columnOrder = input<readonly PaymentTableColumnKey[]>(PAYMENT_COLUMN_KEYS);
  readonly copyRequested = output<string>();
  readonly detailsRequested = output<string>();

  protected readonly copied = computed(() => {
    const copyState = this.copyState();
    return copyState?.paymentId === this.payment().id && copyState.status === 'copied';
  });
  protected readonly copyFailed = computed(() => {
    const copyState = this.copyState();
    return copyState?.paymentId === this.payment().id && copyState.status === 'failed';
  });
  protected readonly amountLabel = computed(() => {
    const payment = this.payment();
    return formatCurrencyAmount(payment.amount, payment.currency);
  });
  protected readonly createdDate = computed(() =>
    formatCreatedDate(this.payment().createdAt, this.timeZone()),
  );
  protected readonly createdTime = computed(() =>
    formatCreatedTime(this.payment().createdAt, this.timeZone()),
  );
  protected readonly relativeCreatedAt = computed(() => {
    const currentTime = this.currentTime();
    return currentTime === null
      ? 'Relative time will update after the page loads.'
      : formatRelativeTime(this.payment().createdAt, currentTime);
  });
  private readonly paymentMethodPresentation = computed(() =>
    getPaymentMethodPresentation(this.payment().paymentMethod),
  );
  protected readonly paymentMethodIcons = computed(() => this.paymentMethodPresentation().icons);
  protected readonly paymentMethodLastFour = computed(
    () => this.paymentMethodPresentation().lastFour,
  );
  protected readonly paymentDetailsPath = computed(
    () => '/payments/' + encodeURIComponent(this.payment().id),
  );
  protected statusLabel(status: PaymentStatus): string {
    return PAYMENT_STATUS_LABELS[status];
  }

  protected truncatedPaymentId(paymentId: string): string {
    if (paymentId.length <= 20) {
      return paymentId;
    }

    return paymentId.slice(0, 14) + '…' + paymentId.slice(-4);
  }

  protected requestCopy(): void {
    this.copyRequested.emit(this.payment().id);
  }

  protected requestDetails(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    this.detailsRequested.emit(this.payment().id);
  }

  protected openDetails(event: MouseEvent): void {
    const target = event.target;
    const row = event.currentTarget;

    if (!(target instanceof Element) || !(row instanceof Element)) {
      return;
    }

    const interactiveTarget = target.closest(
      'a, button, input, select, textarea, [contenteditable="true"], [tabindex]',
    );

    if (interactiveTarget && row.contains(interactiveTarget)) {
      return;
    }

    this.detailsRequested.emit(this.payment().id);
  }
}
