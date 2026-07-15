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
import { FilterButton } from '../filter-button/filter-button';
import { addDateKeyDays, dateKeyInTimeZone, parseDateKey } from './date-key';
import { formatDateRangeLabel } from './date-range-projection';
import {
  createPresetDateRange,
  normalizeCustomDateRange,
  resolveDateRangeForToday,
  type DateRangeSelection,
} from './date-range-selection';

type DateFilterOperator = 'in-the-last' | 'equals' | 'between';

const DATE_FILTER_OPERATORS: readonly {
  readonly value: DateFilterOperator;
  readonly label: string;
}[] = [
  { value: 'in-the-last', label: 'is in the last' },
  { value: 'equals', label: 'is equal to' },
  { value: 'between', label: 'is between' },
];

const MAX_RELATIVE_DAY_COUNT = 100_000;

@Component({
  selector: 'app-date-range-filter',
  imports: [FilterButton],
  templateUrl: './date-range-filter.html',
  styleUrl: './date-range-filter.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class DateRangeFilter {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<DateRangeSelection | null>(null);
  readonly referenceTime = input<number | null>(null);
  readonly timeZone = input('UTC');
  readonly popoverId = input('payments-date-range-filter');

  readonly valueChange = output<DateRangeSelection | null>();

  protected readonly operators = DATE_FILTER_OPERATORS;
  protected readonly open = signal(false);
  protected readonly draftOperator = signal<DateFilterOperator>('in-the-last');
  protected readonly draftRelativeDays = signal('');
  protected readonly draftStart = signal('');
  protected readonly draftEnd = signal('');

  private readonly filterButton = viewChild.required(FilterButton);
  private readonly operatorControl = viewChild<ElementRef<HTMLSelectElement>>('operatorControl');
  private focusFrame: number | undefined;

  protected readonly today = computed(() =>
    dateKeyInTimeZone(this.referenceTime() ?? Date.now(), this.timeZone()),
  );
  protected readonly valueLabel = computed(() => {
    const value = this.value();
    return value ? formatDateRangeLabel(value) : null;
  });
  protected readonly canApply = computed(() => {
    switch (this.draftOperator()) {
      case 'in-the-last':
        return parseRelativeDayCount(this.draftRelativeDays()) !== null;
      case 'equals':
        return this.isSelectableDate(this.draftStart());
      case 'between':
        return this.isSelectableDate(this.draftStart()) && this.isSelectableDate(this.draftEnd());
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelFocusFrame());
  }

  protected toggleFilter(): void {
    if (this.open()) {
      this.closeFilter(true);
      return;
    }

    const today = this.today();
    const appliedValue = this.value();
    const currentValue = appliedValue ? resolveDateRangeForToday(appliedValue, today) : null;

    this.initializeDraft(currentValue);
    this.open.set(true);
    this.scheduleOperatorFocus();
  }

  protected changeOperator(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (isDateFilterOperator(value)) {
      this.draftOperator.set(value);
    }
  }

  protected changeRelativeDays(event: Event): void {
    this.draftRelativeDays.set((event.target as HTMLInputElement).value);
  }

  protected changeStart(event: Event): void {
    this.draftStart.set((event.target as HTMLInputElement).value);
  }

  protected changeEnd(event: Event): void {
    this.draftEnd.set((event.target as HTMLInputElement).value);
  }

  protected applyFilter(event?: Event): void {
    event?.preventDefault();
    const selection = this.createDraftSelection();

    if (selection === null) {
      return;
    }

    this.valueChange.emit(selection);
    this.closeFilter(true);
  }

  protected clearFilter(): void {
    this.valueChange.emit(null);

    if (this.open()) {
      this.closeFilter(true);
      return;
    }

    // Clearing unmounts the clear button itself, so focus would fall to the
    // body. Hand it to the trigger, which survives.
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

  protected closeFilter(restoreFocus: boolean): void {
    this.cancelFocusFrame();
    this.open.set(false);

    if (restoreFocus) {
      this.scheduleTriggerFocus();
    }
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

  private scheduleOperatorFocus(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.focusFrame = browserWindow.requestAnimationFrame(() => {
      this.focusFrame = undefined;
      this.operatorControl()?.nativeElement.focus();
    });
  }

  private initializeDraft(value: DateRangeSelection | null): void {
    if (value === null) {
      this.draftOperator.set('in-the-last');
      this.draftRelativeDays.set('');
      this.draftStart.set('');
      this.draftEnd.set('');
      return;
    }

    switch (value.preset) {
      case 'today':
        this.setRelativeDraft(1);
        return;
      case 'last-7-days':
        this.setRelativeDraft(7);
        return;
      case 'last-30-days':
        this.setRelativeDraft(30);
        return;
      case 'custom':
        this.draftOperator.set(value.start === value.end ? 'equals' : 'between');
        this.draftRelativeDays.set('');
        this.draftStart.set(value.start);
        this.draftEnd.set(value.end);
    }
  }

  private setRelativeDraft(dayCount: number): void {
    this.draftOperator.set('in-the-last');
    this.draftRelativeDays.set(String(dayCount));
    this.draftStart.set('');
    this.draftEnd.set('');
  }

  private createDraftSelection(): DateRangeSelection | null {
    switch (this.draftOperator()) {
      case 'in-the-last': {
        const dayCount = parseRelativeDayCount(this.draftRelativeDays());

        if (dayCount === null) {
          return null;
        }

        const today = this.today();

        switch (dayCount) {
          case 1:
            return createPresetDateRange('today', today);
          case 7:
            return createPresetDateRange('last-7-days', today);
          case 30:
            return createPresetDateRange('last-30-days', today);
          default:
            return normalizeCustomDateRange(addDateKeyDays(today, -(dayCount - 1)), today);
        }
      }
      case 'equals':
        return this.isSelectableDate(this.draftStart())
          ? normalizeCustomDateRange(this.draftStart(), this.draftStart())
          : null;
      case 'between':
        return this.isSelectableDate(this.draftStart()) && this.isSelectableDate(this.draftEnd())
          ? normalizeCustomDateRange(this.draftStart(), this.draftEnd())
          : null;
    }
  }

  private isSelectableDate(value: string): boolean {
    try {
      parseDateKey(value);
      return value <= this.today();
    } catch {
      return false;
    }
  }

  private cancelFocusFrame(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.focusFrame !== undefined) {
      browserWindow.cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
  }
}

function isDateFilterOperator(value: string): value is DateFilterOperator {
  return DATE_FILTER_OPERATORS.some((operator) => operator.value === value);
}

function parseRelativeDayCount(value: string): number | null {
  const normalizedValue = value.trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    return null;
  }

  const dayCount = Number(normalizedValue);

  return Number.isSafeInteger(dayCount) && dayCount <= MAX_RELATIVE_DAY_COUNT ? dayCount : null;
}
