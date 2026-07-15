import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  addDateKeyDays,
  addDateKeyMonths,
  endOfDateKeyWeek,
  startOfDateKeyMonth,
  startOfDateKeyWeek,
} from './date-key';
import { buildCalendarMonth, formatMonthLabel } from './date-range-projection';

const WEEKDAYS: readonly { readonly short: string; readonly full: string }[] = [
  { short: 'Mo', full: 'Monday' },
  { short: 'Tu', full: 'Tuesday' },
  { short: 'We', full: 'Wednesday' },
  { short: 'Th', full: 'Thursday' },
  { short: 'Fr', full: 'Friday' },
  { short: 'Sa', full: 'Saturday' },
  { short: 'Su', full: 'Sunday' },
];

@Component({
  selector: 'app-date-range-calendar',
  templateUrl: './date-range-calendar.html',
  styleUrl: './date-range-calendar.css',
})
export class DateRangeCalendar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = input.required<string>();
  readonly activeDate = input.required<string>();
  readonly selectionStart = input<string | null>(null);
  readonly selectionEnd = input<string | null>(null);
  readonly labelId = input.required<string>();

  readonly dateSelected = output<string>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly displayedMonth = signal('1970-01-01');
  protected readonly focusedDate = signal('1970-01-01');
  protected readonly monthLabel = computed(() => formatMonthLabel(this.displayedMonth()));
  protected readonly calendarWeeks = computed(() =>
    buildCalendarMonth(
      this.displayedMonth(),
      this.today(),
      this.selectionStart(),
      this.selectionEnd(),
    ),
  );
  protected readonly canShowNextMonth = computed(
    () => startOfDateKeyMonth(this.displayedMonth()) < startOfDateKeyMonth(this.today()),
  );

  private focusFrame: number | undefined;
  private readonly syncActiveDate = effect(() => {
    const activeDate = this.activeDate();

    untracked(() => {
      this.displayedMonth.set(startOfDateKeyMonth(activeDate));
      this.focusedDate.set(activeDate);
      this.focusDate(activeDate);
    });
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelFocusFrame());
  }

  protected selectDate(date: string): void {
    if (date <= this.today()) {
      this.dateSelected.emit(date);
    }
  }

  protected showPreviousMonth(): void {
    this.changeDisplayedMonth(-1);
  }

  protected showNextMonth(): void {
    if (this.canShowNextMonth()) {
      this.changeDisplayedMonth(1);
    }
  }

  protected onDateKeydown(event: KeyboardEvent, date: string): void {
    let nextDate: string | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        nextDate = addDateKeyDays(date, -1);
        break;
      case 'ArrowRight':
        nextDate = addDateKeyDays(date, 1);
        break;
      case 'ArrowUp':
        nextDate = addDateKeyDays(date, -7);
        break;
      case 'ArrowDown':
        nextDate = addDateKeyDays(date, 7);
        break;
      case 'Home':
        nextDate = startOfDateKeyWeek(date);
        break;
      case 'End':
        nextDate = endOfDateKeyWeek(date);
        break;
      case 'PageUp':
        nextDate = addDateKeyMonths(date, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        nextDate = addDateKeyMonths(date, event.shiftKey ? 12 : 1);
        break;
    }

    if (nextDate === null) {
      return;
    }

    event.preventDefault();
    this.moveFocus(nextDate > this.today() ? this.today() : nextDate);
  }

  private changeDisplayedMonth(amount: number): void {
    const nextMonth = startOfDateKeyMonth(addDateKeyMonths(this.displayedMonth(), amount));
    const focusDate = nextMonth > startOfDateKeyMonth(this.today()) ? this.today() : nextMonth;

    this.displayedMonth.set(startOfDateKeyMonth(focusDate));
    this.focusedDate.set(focusDate);
    this.focusDate(focusDate);
  }

  private moveFocus(date: string): void {
    this.focusedDate.set(date);
    this.displayedMonth.set(startOfDateKeyMonth(date));
    this.focusDate(date);
  }

  private focusDate(date: string): void {
    this.cancelFocusFrame();
    const browserWindow = this.host.nativeElement.ownerDocument.defaultView;

    if (!browserWindow) {
      return;
    }

    this.focusFrame = browserWindow.requestAnimationFrame(() => {
      this.focusFrame = undefined;
      this.host.nativeElement
        .querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)
        ?.focus();
    });
  }

  private cancelFocusFrame(): void {
    const browserWindow = this.host.nativeElement.ownerDocument.defaultView;

    if (browserWindow && this.focusFrame !== undefined) {
      browserWindow.cancelAnimationFrame(this.focusFrame);
      this.focusFrame = undefined;
    }
  }
}
