import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  type PaymentStatus,
} from '../../../payments/payment';
import { FilterButton } from '../filter-button/filter-button';

@Component({
  selector: 'app-status-filter',
  imports: [FilterButton],
  templateUrl: './status-filter.html',
  styleUrl: './status-filter.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class StatusFilter {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<readonly PaymentStatus[]>([]);
  readonly popoverId = input('payments-status-filter');

  readonly valueChange = output<readonly PaymentStatus[]>();

  protected readonly options = PAYMENT_STATUS_OPTIONS;
  protected readonly open = signal(false);
  protected readonly draftValue = signal<readonly PaymentStatus[]>([]);
  protected readonly valueLabel = computed(() => {
    const labels = this.value().map((status) => PAYMENT_STATUS_LABELS[status]);
    return labels.length > 0 ? labels.join(', ') : null;
  });

  private readonly filterButton = viewChild.required(FilterButton);
  private readonly statusCheckboxes = viewChildren<ElementRef<HTMLInputElement>>('statusCheckbox');
  private focusFrame: number | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelFocusFrame());
  }

  protected toggleFilter(): void {
    if (this.open()) {
      this.closeFilter(true);
      return;
    }

    this.cancelFocusFrame();
    this.draftValue.set([...this.value()]);
    this.open.set(true);
    this.scheduleFirstCheckboxFocus();
  }

  protected isSelected(status: PaymentStatus): boolean {
    return this.draftValue().includes(status);
  }

  protected updateStatus(status: PaymentStatus, selected: boolean): void {
    this.draftValue.update((statuses) => {
      if (selected) {
        return statuses.includes(status) ? statuses : [...statuses, status];
      }

      return statuses.filter((candidate) => candidate !== status);
    });
  }

  protected applyFilter(): void {
    this.valueChange.emit([...this.draftValue()]);
    this.closeFilter(true);
  }

  protected clearFilter(): void {
    this.valueChange.emit([]);

    if (this.open()) {
      this.closeFilter(true);
      return;
    }

    this.cancelFocusFrame();
    this.scheduleTriggerFocus();
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.open() || !(event.target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target)) {
      this.closeFilter(false);
    }
  }

  protected onDocumentFocusIn(event: FocusEvent): void {
    if (!this.open() || !(event.target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target)) {
      this.closeFilter(false);
    }
  }

  protected onDocumentEscape(event: Event): void {
    if (!this.open()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.closeFilter(true);
  }

  private closeFilter(restoreFocus: boolean): void {
    this.cancelFocusFrame();
    this.open.set(false);

    if (restoreFocus) {
      this.scheduleTriggerFocus();
    }
  }

  private scheduleFirstCheckboxFocus(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.focusFrame = browserWindow.requestAnimationFrame(() => {
      this.focusFrame = undefined;
      this.statusCheckboxes()[0]?.nativeElement.focus();
    });
  }

  private scheduleTriggerFocus(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.focusFrame = browserWindow.requestAnimationFrame(() => {
      this.focusFrame = undefined;
      this.filterButton().focus();
    });
  }

  private cancelFocusFrame(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.focusFrame !== undefined) {
      browserWindow.cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
  }
}
