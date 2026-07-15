import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '../../payments/payment';

const PAYMENT_STATUS_SUMMARY_ORDER = [
  'succeeded',
  'refunded',
  'pending',
  'failed',
] as const satisfies readonly PaymentStatus[];

const COUNT_FORMATTER = new Intl.NumberFormat('en-US');

interface PaymentStatusSummaryOption {
  readonly value: PaymentStatus | null;
  readonly label: string;
  readonly count: number;
  readonly countLabel: string;
}

@Component({
  selector: 'app-payment-status-summary',
  templateUrl: './payment-status-summary.html',
  styleUrl: './payment-status-summary.css',
})
export class PaymentStatusSummary {
  private readonly destroyRef = inject(DestroyRef);

  readonly counts = input.required<Readonly<Record<PaymentStatus, number>>>();
  readonly value = input<readonly PaymentStatus[]>([]);

  readonly valueChange = output<readonly PaymentStatus[]>();

  protected readonly canScrollBackward = signal(false);
  protected readonly canScrollForward = signal(false);

  private readonly rail = viewChild.required<ElementRef<HTMLElement>>('statusRail');
  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('statusOption');
  private resizeObserver: ResizeObserver | undefined;

  protected readonly options = computed<readonly PaymentStatusSummaryOption[]>(() => {
    const counts = this.counts();
    const allCount = PAYMENT_STATUS_SUMMARY_ORDER.reduce(
      (total, status) => total + counts[status],
      0,
    );

    return [
      createSummaryOption(null, 'All', allCount),
      ...PAYMENT_STATUS_SUMMARY_ORDER.map((status) =>
        createSummaryOption(status, PAYMENT_STATUS_LABELS[status], counts[status]),
      ),
    ];
  });

  private readonly selectedStatus = computed<PaymentStatus | null | undefined>(() => {
    const value = this.value();

    if (value.length === 0) {
      return null;
    }

    return value.length === 1 ? value[0] : undefined;
  });

  constructor() {
    afterNextRender(() => this.startScrollObservation());
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  protected isSelected(status: PaymentStatus | null): boolean {
    return this.selectedStatus() === status;
  }

  protected isFocusable(status: PaymentStatus | null, index: number): boolean {
    return this.isSelected(status) || (this.selectedStatus() === undefined && index === 0);
  }

  protected selectStatus(status: PaymentStatus | null): void {
    if (this.isSelected(status)) {
      return;
    }

    this.valueChange.emit(status === null ? [] : [status]);
  }

  protected moveFocus(event: KeyboardEvent, currentIndex: number): void {
    const lastIndex = this.options().length - 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    this.optionButtons()[nextIndex]?.nativeElement.focus();
  }

  protected updateScrollControls(): void {
    const rail = this.rail().nativeElement;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);

    this.canScrollBackward.set(rail.scrollLeft > 1);
    this.canScrollForward.set(rail.scrollLeft < maxScrollLeft - 1);
  }

  protected scrollOptions(direction: -1 | 1): void {
    const rail = this.rail().nativeElement;
    const firstOption = this.optionButtons()[0]?.nativeElement;

    if (!firstOption) {
      return;
    }

    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const reducedMotion =
      rail.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ??
      true;

    rail.scrollBy({
      left: direction * (firstOption.getBoundingClientRect().width + gap),
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }

  private startScrollObservation(): void {
    const rail = this.rail().nativeElement;
    const browserWindow = rail.ownerDocument.defaultView;

    this.updateScrollControls();

    if (!browserWindow?.ResizeObserver) {
      return;
    }

    this.resizeObserver = new browserWindow.ResizeObserver(() => this.updateScrollControls());
    this.resizeObserver.observe(rail);
  }
}

function createSummaryOption(
  value: PaymentStatus | null,
  label: string,
  count: number,
): PaymentStatusSummaryOption {
  return {
    value,
    label,
    count,
    countLabel: COUNT_FORMATTER.format(count),
  };
}
