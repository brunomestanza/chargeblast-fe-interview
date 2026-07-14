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
} from '@angular/core';
import { FormField, form, min, required, validate } from '@angular/forms/signals';
import { FilterButton } from '../filter-button/filter-button';
import {
  type AmountRange,
  createAmountRange,
  formatAmountRangeLabel,
  usdAmountToCents,
} from './amount-range';

interface AmountRangeDraft {
  readonly minimumUsd: number | null;
  readonly maximumUsd: number | null;
}

const EMPTY_AMOUNT_RANGE_DRAFT: AmountRangeDraft = {
  minimumUsd: 0,
  maximumUsd: null,
};

@Component({
  selector: 'app-amount-range-filter',
  imports: [FilterButton, FormField],
  templateUrl: './amount-range-filter.html',
  styleUrl: './amount-range-filter.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class AmountRangeFilter {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<AmountRange | null>(null);
  readonly popoverId = input('payments-amount-range-filter');

  readonly valueChange = output<AmountRange | null>();

  protected readonly open = signal(false);
  protected readonly suppressEntranceMotion = signal(false);
  private readonly draftModel = signal<AmountRangeDraft>(EMPTY_AMOUNT_RANGE_DRAFT);
  protected readonly amountForm = form(this.draftModel, (amount) => {
    required(amount.minimumUsd, { message: 'Enter a minimum amount.' });
    min(amount.minimumUsd, 0, { message: 'Minimum cannot be below $0.00.' });
    validate(amount.minimumUsd, ({ value }) =>
      value() !== null && usdAmountToCents(value()) === null
        ? { kind: 'usd-precision', message: 'Use no more than two decimal places.' }
        : undefined,
    );

    required(amount.maximumUsd, { message: 'Enter a maximum amount.' });
    min(amount.maximumUsd, 1, { message: 'Maximum must be at least $1.00.' });
    validate(amount.maximumUsd, ({ value, valueOf }) => {
      const maximumUsdCents = usdAmountToCents(value());
      const minimumUsdCents = usdAmountToCents(valueOf(amount.minimumUsd));

      if (value() !== null && maximumUsdCents === null) {
        return { kind: 'usd-precision', message: 'Use no more than two decimal places.' };
      }

      return maximumUsdCents !== null &&
        minimumUsdCents !== null &&
        maximumUsdCents < minimumUsdCents
        ? { kind: 'amount-order', message: 'Maximum cannot be below the minimum.' }
        : undefined;
    });
  });
  protected readonly valueLabel = computed(() => {
    const range = this.value();
    return range === null ? null : formatAmountRangeLabel(range);
  });
  protected readonly showMinimumError = computed(() => {
    const field = this.amountForm.minimumUsd();
    return field.invalid() && (field.touched() || field.dirty());
  });
  protected readonly showMaximumError = computed(() => {
    const field = this.amountForm.maximumUsd();
    const orderWasInvalidatedByMinimum =
      this.amountForm.minimumUsd().dirty() &&
      field.errors().some((error) => error.kind === 'amount-order');

    return field.invalid() && (field.touched() || field.dirty() || orderWasInvalidatedByMinimum);
  });
  protected readonly minimumError = computed(() =>
    this.showMinimumError() ? this.amountForm.minimumUsd().errors()[0]?.message : null,
  );
  protected readonly maximumError = computed(() =>
    this.showMaximumError() ? this.amountForm.maximumUsd().errors()[0]?.message : null,
  );

  private readonly filterButton = viewChild.required(FilterButton);
  private readonly minimumInput = viewChild.required<ElementRef<HTMLInputElement>>('minimumInput');
  private focusFrame: number | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelFocusFrame());
  }

  protected toggleFilter(event: MouseEvent): void {
    if (this.open()) {
      this.closeFilter(true);
      return;
    }

    this.cancelFocusFrame();
    this.amountForm().reset(this.draftFromValue());
    this.suppressEntranceMotion.set(event.detail === 0);
    this.open.set(true);
    this.scheduleMinimumFocus();
  }

  protected applyFilter(event: SubmitEvent): void {
    event.preventDefault();
    const draft = this.draftModel();
    const range = createAmountRange(draft.minimumUsd, draft.maximumUsd);

    if (range === null) {
      this.amountForm().markAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    this.valueChange.emit(range);
    this.closeFilter(true);
  }

  protected clearFilter(): void {
    this.valueChange.emit(null);

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

  private draftFromValue(): AmountRangeDraft {
    const range = this.value();

    return range === null
      ? EMPTY_AMOUNT_RANGE_DRAFT
      : {
          minimumUsd: range.minimumUsdCents / 100,
          maximumUsd: range.maximumUsdCents / 100,
        };
  }

  private closeFilter(restoreFocus: boolean): void {
    this.cancelFocusFrame();
    this.open.set(false);

    if (restoreFocus) {
      this.scheduleTriggerFocus();
    }
  }

  private focusFirstInvalidField(): void {
    if (this.amountForm.minimumUsd().invalid()) {
      this.amountForm.minimumUsd().focusBoundControl();
      return;
    }

    this.amountForm.maximumUsd().focusBoundControl();
  }

  private scheduleMinimumFocus(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow || browserWindow.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }

    this.focusFrame = browserWindow.requestAnimationFrame(() => {
      this.focusFrame = undefined;
      this.minimumInput().nativeElement.focus();
      this.minimumInput().nativeElement.select();
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
