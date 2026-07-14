import { Component, computed, input, output } from '@angular/core';
import { PAYMENT_STATUS_LABELS, Payment, PaymentStatus } from './payment';
import { PaymentIconCategory, PaymentMethodIcon } from './payment-method-icon';

export interface PaymentCopyState {
  readonly paymentId: string;
  readonly status: 'copied' | 'failed';
}

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>();
const CREATED_DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const CREATED_TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' });

interface PaymentMethodIconView {
  readonly category: PaymentIconCategory;
  readonly key: string;
}

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = CREATED_DATE_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    });
    CREATED_DATE_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = CREATED_TIME_FORMATTERS.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    });
    CREATED_TIME_FORMATTERS.set(timeZone, formatter);
  }

  return formatter;
}

function roundRelativeValue(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatCreatedDate(createdAt: string, timeZone: string): string {
  return getDateFormatter(timeZone).format(new Date(createdAt));
}

export function formatCreatedTime(createdAt: string, timeZone: string): string {
  return getTimeFormatter(timeZone).format(new Date(createdAt));
}

export function formatRelativeTime(createdAt: string, currentTime: number): string {
  const differenceInSeconds = (Date.parse(createdAt) - currentTime) / 1000;
  const absoluteDifference = Math.abs(differenceInSeconds);

  if (absoluteDifference < 45) {
    return 'just now';
  }

  if (absoluteDifference < 60 * 60) {
    return RELATIVE_TIME_FORMATTER.format(roundRelativeValue(differenceInSeconds / 60), 'minute');
  }

  if (absoluteDifference < 60 * 60 * 24) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60)),
      'hour',
    );
  }

  if (absoluteDifference < 60 * 60 * 24 * 30) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60 * 24)),
      'day',
    );
  }

  if (absoluteDifference < 60 * 60 * 24 * 365) {
    return RELATIVE_TIME_FORMATTER.format(
      roundRelativeValue(differenceInSeconds / (60 * 60 * 24 * 30)),
      'month',
    );
  }

  return RELATIVE_TIME_FORMATTER.format(
    roundRelativeValue(differenceInSeconds / (60 * 60 * 24 * 365)),
    'year',
  );
}

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
    let formatter = CURRENCY_FORMATTERS.get(payment.currency);

    if (!formatter) {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: payment.currency,
      });
      CURRENCY_FORMATTERS.set(payment.currency, formatter);
    }

    return formatter.format(payment.amount);
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
  protected readonly paymentMethodIcons = computed<readonly PaymentMethodIconView[]>(() => {
    const paymentMethod = this.payment().paymentMethod;

    if (paymentMethod.kind === 'standalone') {
      return [{ category: 'method', key: paymentMethod.method }];
    }

    const brandIcon: PaymentMethodIconView = {
      category: 'card-brand',
      key: paymentMethod.brand,
    };

    return paymentMethod.wallet
      ? [{ category: 'wallet', key: paymentMethod.wallet }, brandIcon]
      : [brandIcon];
  });
  protected readonly paymentMethodLastFour = computed(() => {
    const paymentMethod = this.payment().paymentMethod;
    return paymentMethod.kind === 'card' ? paymentMethod.lastFour : null;
  });
  protected readonly paymentDetailsPath = computed(
    () => '/payments/' + encodeURIComponent(this.payment().id),
  );
  protected readonly tooltipId = computed(() => 'relative-time-' + this.payment().id);

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

  protected paymentIconTooltipId(index: number): string {
    return 'payment-method-' + this.payment().id + '-' + index;
  }
}
