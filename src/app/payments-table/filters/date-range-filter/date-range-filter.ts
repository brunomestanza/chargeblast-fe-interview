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
import { DateRangeCalendar } from './date-range-calendar';
import {
  DATE_RANGE_PRESETS,
  DateRangePreset,
  DateRangeSelection,
  createPresetDateRange,
  dateKeyInTimeZone,
  formatDateRangeLabel,
  formatDateRangeSummary,
  normalizeCustomDateRange,
  resolveDateRangeForToday,
} from './date-range';

@Component({
  selector: 'app-date-range-filter',
  imports: [DateRangeCalendar, FilterButton],
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

  protected readonly presets = DATE_RANGE_PRESETS;
  protected readonly open = signal(false);
  protected readonly draftPreset = signal<DateRangePreset | null>(null);
  protected readonly draftStart = signal<string | null>(null);
  protected readonly draftEnd = signal<string | null>(null);
  protected readonly calendarActiveDate = signal('1970-01-01');
  protected readonly selectionAnnouncement = signal('');

  private readonly filterButton = viewChild.required(FilterButton);
  private focusFrame: number | undefined;

  protected readonly today = computed(() =>
    dateKeyInTimeZone(this.referenceTime() ?? Date.now(), this.timeZone()),
  );
  protected readonly valueLabel = computed(() => {
    const value = this.value();
    return value ? formatDateRangeLabel(value) : null;
  });
  protected readonly canApply = computed(
    () => this.draftStart() !== null && this.draftEnd() !== null,
  );
  protected readonly draftSummary = computed(() => {
    const start = this.draftStart();
    const end = this.draftEnd();

    if (start === null) {
      return 'Select a start and end date.';
    }

    if (end === null) {
      return `${formatDateRangeSummary(start, start)} selected as the start date.`;
    }

    return formatDateRangeSummary(start, end);
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
    const initialFocus = currentValue?.end ?? today;

    this.draftPreset.set(currentValue?.preset ?? null);
    this.draftStart.set(currentValue?.start ?? null);
    this.draftEnd.set(currentValue?.end ?? null);
    this.calendarActiveDate.set(initialFocus);
    this.selectionAnnouncement.set('');
    this.open.set(true);
  }

  protected selectPreset(preset: DateRangePreset): void {
    if (preset === 'custom') {
      if (this.draftPreset() !== 'custom') {
        this.draftStart.set(null);
        this.draftEnd.set(null);
      }

      this.draftPreset.set('custom');
      this.selectionAnnouncement.set('Custom date range selected. Choose a start date.');
      return;
    }

    const selection = createPresetDateRange(preset, this.today());

    this.draftPreset.set(selection.preset);
    this.draftStart.set(selection.start);
    this.draftEnd.set(selection.end);
    this.calendarActiveDate.set(selection.end);
    this.selectionAnnouncement.set(`${formatDateRangeLabel(selection)} selected.`);
  }

  protected selectDate(date: string): void {
    if (date > this.today()) {
      return;
    }

    const start = this.draftStart();
    const end = this.draftEnd();

    this.draftPreset.set('custom');
    this.calendarActiveDate.set(date);

    if (start === null || end !== null) {
      this.draftStart.set(date);
      this.draftEnd.set(null);
      this.selectionAnnouncement.set(
        `${formatDateRangeSummary(date, date)} selected as the start date. Choose an end date.`,
      );
      return;
    }

    const selection = normalizeCustomDateRange(start, date);

    this.draftStart.set(selection.start);
    this.draftEnd.set(selection.end);
    this.selectionAnnouncement.set(
      `${formatDateRangeSummary(selection.start, selection.end)} selected.`,
    );
  }

  protected applyFilter(): void {
    const start = this.draftStart();
    const end = this.draftEnd();
    const preset = this.draftPreset();

    if (start === null || end === null) {
      return;
    }

    const selection =
      preset === 'today' || preset === 'last-7-days' || preset === 'last-30-days'
        ? { preset, start, end }
        : normalizeCustomDateRange(start, end);

    this.valueChange.emit(selection);
    this.closeFilter(true);
  }

  protected clearFilter(): void {
    this.valueChange.emit(null);

    if (this.open()) {
      this.closeFilter(true);
    }
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
    this.selectionAnnouncement.set('');

    if (restoreFocus) {
      const browserWindow = this.document.defaultView;

      if (!browserWindow) {
        return;
      }

      this.focusFrame = browserWindow.requestAnimationFrame(() => {
        this.focusFrame = undefined;
        this.filterButton().focus();
      });
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
