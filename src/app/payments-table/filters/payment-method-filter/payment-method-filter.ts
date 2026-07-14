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
import { FilterButton } from '../filter-button/filter-button';
import {
  PAYMENT_METHOD_FILTER_GROUPS,
  paymentMethodFilterLabel,
  type PaymentMethodFilterValue,
} from './payment-method-filter-options.mock';

@Component({
  selector: 'app-payment-method-filter',
  imports: [FilterButton],
  templateUrl: './payment-method-filter.html',
  styleUrl: './payment-method-filter.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class PaymentMethodFilter {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<readonly PaymentMethodFilterValue[]>([]);
  readonly popoverId = input('payments-payment-method-filter');

  readonly valueChange = output<readonly PaymentMethodFilterValue[]>();

  protected readonly groups = PAYMENT_METHOD_FILTER_GROUPS;
  protected readonly open = signal(false);
  protected readonly draftValue = signal<readonly PaymentMethodFilterValue[]>([]);
  private readonly selectedLabels = computed(() => this.value().map(paymentMethodFilterLabel));
  protected readonly valueLabel = computed(() => {
    const labels = this.selectedLabels();

    if (labels.length === 0) {
      return null;
    }

    return labels.length <= 2 ? labels.join(', ') : `${labels[0]} +${labels.length - 1}`;
  });
  protected readonly accessibleValueLabel = computed(() => {
    const labels = this.selectedLabels();
    return labels.length > 0 ? labels.join(', ') : null;
  });

  private readonly filterButton = viewChild.required(FilterButton);
  private readonly methodCheckboxes = viewChildren<ElementRef<HTMLInputElement>>('methodCheckbox');
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

  protected isSelected(value: PaymentMethodFilterValue): boolean {
    return this.draftValue().includes(value);
  }

  protected updatePaymentMethod(value: PaymentMethodFilterValue, selected: boolean): void {
    this.draftValue.update((values) => {
      if (selected) {
        return values.includes(value) ? values : [...values, value];
      }

      return values.filter((candidate) => candidate !== value);
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
      const checkboxes = this.methodCheckboxes();
      const firstSelected = checkboxes.find((checkbox) => checkbox.nativeElement.checked);
      (firstSelected ?? checkboxes[0])?.nativeElement.focus();
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
