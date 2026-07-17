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
  CURRENCY_FILTER_OPTIONS,
  currencyFilterLabel,
  type CurrencyFilterValue,
} from './currency-filter-options';

@Component({
  selector: 'app-currency-filter',
  imports: [FilterButton],
  templateUrl: './currency-filter.html',
  styleUrl: './currency-filter.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class CurrencyFilter {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<readonly CurrencyFilterValue[]>([]);
  readonly popoverId = input('payments-currency-filter');

  readonly valueChange = output<readonly CurrencyFilterValue[]>();

  protected readonly options = CURRENCY_FILTER_OPTIONS;
  protected readonly open = signal(false);
  protected readonly draftValue = signal<readonly CurrencyFilterValue[]>([]);
  protected readonly valueLabel = computed(() => {
    const labels = this.value().map((currency) => currencyFilterLabel(currency));
    return labels.length > 0 ? labels.join(', ') : null;
  });

  private readonly filterButton = viewChild.required(FilterButton);
  private readonly currencyCheckboxes =
    viewChildren<ElementRef<HTMLInputElement>>('currencyCheckbox');
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

  protected isSelected(currency: CurrencyFilterValue): boolean {
    return this.draftValue().includes(currency);
  }

  protected updateCurrency(currency: CurrencyFilterValue, selected: boolean): void {
    this.draftValue.update((currencies) => {
      if (selected) {
        return currencies.includes(currency) ? currencies : [...currencies, currency];
      }

      return currencies.filter((candidate) => candidate !== currency);
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
      this.currencyCheckboxes()[0]?.nativeElement.focus();
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
