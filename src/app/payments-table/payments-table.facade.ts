import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  type AmountRange,
  formatAmountRangeLabel,
  matchesAmountRange,
} from './filters/amount-range-filter/amount-range';
import {
  type DateRangeSelection,
  dateKeyInTimeZone,
  formatDateRangeLabel,
  isTimestampInDateRange,
  resolveDateRangeForToday,
} from './filters/date-range-filter/date-range';
import { matchesPaymentMethodFilter } from './filters/payment-method-filter/payment-method-filter-match';
import {
  paymentMethodFilterLabel,
  type PaymentMethodFilterValue,
} from './filters/payment-method-filter/payment-method-filter-options.mock';
import { PaymentClipboardAdapter } from './payment-clipboard.adapter';
import type { PaymentCopyState } from './payment-copy-state';
import { PaymentCsvDownloadAdapter } from './payment-csv-download.adapter';
import {
  parseTextSearchQuery,
  serializeAmountRangeQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
  serializeTextSearchQuery,
} from './payment-filter-query';
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from './payment';
import { PAYMENT_QUERY_DELAY } from './payment-query-delay';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  PaymentTablePreferencesAdapter,
  type PageSize,
} from './payment-table-preferences.adapter';
import { createPaymentTextSearch, matchesPaymentTextSearch } from './payment-text-search';
import { PaymentViewUrlAdapter, type PaymentViewUrlChange } from './payment-view-url.adapter';
import {
  INITIAL_PAYMENT_VIEW_STATE,
  paymentViewStateSignature,
  type PaymentViewState,
} from './payment-view-state';
import {
  DEFAULT_PAYMENT_SORT,
  PAYMENT_SORT_COLUMN_LABELS,
  cyclePaymentSort,
  serializePaymentSort,
  sortPayments,
  type PaymentSortColumn,
  type PaymentSortCriterion,
} from './payment-sort';

export const TEXT_SEARCH_DEBOUNCE_MS = 300;

const EXPORT_TOAST_DURATION_MS = 5_000;
const COPY_FEEDBACK_DURATION_MS = 1_800;

interface PaymentSortColumnState {
  readonly direction: PaymentSortCriterion['direction'];
  readonly priority: number;
}

export interface PaymentExportToast {
  readonly id: number;
  readonly message: string;
}

export interface PaymentsTableViewEffects {
  readonly resetScrollPosition: () => void;
  readonly updateSkeletonLayout: () => void;
}

const NOOP_VIEW_EFFECTS: PaymentsTableViewEffects = {
  resetScrollPosition: () => undefined,
  updateSkeletonLayout: () => undefined,
};

@Service({ autoProvided: false })
export class PaymentsTableFacade {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryDelay = inject(PAYMENT_QUERY_DELAY);
  private readonly preferences = inject(PaymentTablePreferencesAdapter);
  private readonly url = inject(PaymentViewUrlAdapter);
  private readonly clipboard = inject(PaymentClipboardAdapter);
  private readonly csvDownload = inject(PaymentCsvDownloadAdapter);

  private readonly paymentsState = signal<readonly Payment[]>([]);
  readonly payments = this.paymentsState.asReadonly();

  private readonly copyStateValue = signal<PaymentCopyState | null>(null);
  readonly copyState = this.copyStateValue.asReadonly();
  private readonly loadingState = signal(false);
  readonly isLoading = this.loadingState.asReadonly();
  private readonly currentTimeState = signal<number | null>(null);
  readonly currentTime = this.currentTimeState.asReadonly();
  private readonly timeZoneState = signal('UTC');
  readonly timeZone = this.timeZoneState.asReadonly();

  private readonly requestedSortCriteria =
    signal<readonly PaymentSortCriterion[]>(DEFAULT_PAYMENT_SORT);
  readonly sortCriteria = this.requestedSortCriteria.asReadonly();
  private readonly requestedDateRange = signal<DateRangeSelection | null>(null);
  readonly dateRange = this.requestedDateRange.asReadonly();
  private readonly requestedStatuses = signal<readonly PaymentStatus[]>([]);
  readonly selectedStatuses = this.requestedStatuses.asReadonly();
  private readonly requestedPaymentMethods = signal<readonly PaymentMethodFilterValue[]>([]);
  readonly selectedPaymentMethods = this.requestedPaymentMethods.asReadonly();
  private readonly requestedAmountRange = signal<AmountRange | null>(null);
  readonly amountRange = this.requestedAmountRange.asReadonly();
  private readonly textSearchInputState = signal('');
  readonly textSearchInput = this.textSearchInputState.asReadonly();
  private readonly requestedTextSearch = signal<string | null>(null);
  readonly textSearch = this.requestedTextSearch.asReadonly();

  private readonly appliedViewState = signal<PaymentViewState>(INITIAL_PAYMENT_VIEW_STATE);

  private readonly pageSizeState = signal<PageSize>(DEFAULT_PAGE_SIZE);
  readonly pageSize = this.pageSizeState.asReadonly();
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  private readonly currentPageState = signal(1);
  readonly currentPage = this.currentPageState.asReadonly();

  private readonly sortAnnouncementState = signal('');
  readonly sortAnnouncement = this.sortAnnouncementState.asReadonly();
  private readonly filterAnnouncementState = signal('');
  readonly filterAnnouncement = this.filterAnnouncementState.asReadonly();
  private readonly exportToastState = signal<readonly PaymentExportToast[]>([]);
  readonly exportToasts = this.exportToastState.asReadonly();

  readonly hasActiveFilters = computed(
    () =>
      this.requestedDateRange() !== null ||
      this.requestedStatuses().length > 0 ||
      this.requestedPaymentMethods().length > 0 ||
      this.requestedAmountRange() !== null ||
      this.requestedTextSearch() !== null ||
      parseTextSearchQuery(this.textSearchInputState()) !== null,
  );

  readonly effectiveDateRange = computed(() => {
    const selection = this.appliedViewState().dateRange;
    const currentTime = this.currentTimeState();

    if (selection === null || currentTime === null) {
      return selection;
    }

    const today = dateKeyInTimeZone(currentTime, this.timeZoneState());
    return resolveDateRangeForToday(selection, today);
  });

  readonly filteredPayments = computed(() => {
    const appliedViewState = this.appliedViewState();
    const dateRange = this.effectiveDateRange();
    const selectedStatuses = appliedViewState.selectedStatuses;
    const selectedPaymentMethods = appliedViewState.selectedPaymentMethods;
    const amountRange = appliedViewState.amountRange;
    const textSearch = createPaymentTextSearch(appliedViewState.textSearch);

    if (
      dateRange === null &&
      selectedStatuses.length === 0 &&
      selectedPaymentMethods.length === 0 &&
      amountRange === null &&
      textSearch === null
    ) {
      return this.paymentsState();
    }

    const timeZone = this.timeZoneState();
    return this.paymentsState().filter(
      (payment) =>
        (dateRange === null || isTimestampInDateRange(payment.createdAt, dateRange, timeZone)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(payment.status)) &&
        matchesPaymentMethodFilter(payment.paymentMethod, selectedPaymentMethods) &&
        (amountRange === null || matchesAmountRange(payment, amountRange)) &&
        matchesPaymentTextSearch(payment, textSearch),
    );
  });

  readonly paymentCountLabel = computed(() => {
    const count = this.filteredPayments().length;
    return count === 1 ? '1 payment' : count + ' payments';
  });

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredPayments().length / this.pageSizeState())),
  );

  readonly sortedPayments = computed(() =>
    sortPayments(this.filteredPayments(), this.appliedViewState().sortCriteria),
  );

  readonly paginatedPayments = computed(() => {
    const startIndex = (this.currentPageState() - 1) * this.pageSizeState();
    return this.sortedPayments().slice(startIndex, startIndex + this.pageSizeState());
  });

  readonly paginationRangeLabel = computed(() => {
    const paymentCount = this.filteredPayments().length;

    if (paymentCount === 0) {
      return 'Viewing 0 of 0 payments';
    }

    const firstPayment = (this.currentPageState() - 1) * this.pageSizeState() + 1;
    const lastPayment = Math.min(firstPayment + this.pageSizeState() - 1, paymentCount);
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    return `Viewing ${firstPayment}–${lastPayment} of ${paymentCount} ${paymentLabel}`;
  });

  readonly copyAnnouncement = computed(() => {
    const state = this.copyStateValue();

    if (!state) {
      return '';
    }

    return state.status === 'copied'
      ? 'Payment ID ' + state.paymentId + ' copied to clipboard.'
      : 'Payment ID ' + state.paymentId + ' could not be copied. Try again.';
  });

  private readonly sortStateByColumn = computed(
    () =>
      new Map<PaymentSortColumn, PaymentSortColumnState>(
        this.requestedSortCriteria().map((criterion, index) => [
          criterion.column,
          { direction: criterion.direction, priority: index + 1 },
        ]),
      ),
  );

  private readonly keepCurrentPageInBounds = effect(() => {
    const pageCount = this.pageCount();

    untracked(() => {
      if (this.currentPageState() > pageCount) {
        this.currentPageState.set(pageCount);
      }
    });
  });

  private viewEffects: PaymentsTableViewEffects = NOOP_VIEW_EFFECTS;
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastId = 0;
  private textSearchTimer: ReturnType<typeof setTimeout> | undefined;
  private queryTimer: ReturnType<typeof setTimeout> | undefined;
  private queryRequestId = 0;
  private clockTimer: number | undefined;
  private browserStateStarted = false;
  private stopObservingPageSize: (() => void) | undefined;

  constructor() {
    this.pageSizeState.set(this.preferences.readPageSize());
    this.url.connect({
      today: () => dateKeyInTimeZone(this.currentTimeState() ?? Date.now(), this.timeZoneState()),
      applyViewState: (change) => this.applyViewStateFromUrl(change),
    });

    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
      this.clearExportToastTimer();
      this.clearTextSearchTimer();
      this.cancelPendingQuery();
      this.stopClock();
      this.stopObservingPageSize?.();
      this.stopObservingPageSize = undefined;
      this.viewEffects = NOOP_VIEW_EFFECTS;
    });
  }

  setPayments(payments: readonly Payment[]): void {
    this.paymentsState.set(payments);
  }

  setViewEffects(viewEffects: PaymentsTableViewEffects): void {
    this.viewEffects = viewEffects;
  }

  startBrowserState(): void {
    if (this.browserStateStarted) {
      return;
    }

    this.browserStateStarted = true;
    this.applyPageSize(this.preferences.readPageSize());
    this.stopObservingPageSize = this.preferences.observePageSize((pageSize) =>
      this.applyPageSize(pageSize),
    );

    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.timeZoneState.set(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    this.currentTimeState.set(Date.now());
    this.clockTimer = browserWindow.setInterval(
      () => this.currentTimeState.set(Date.now()),
      60_000,
    );
  }

  async copyPaymentId(paymentId: string): Promise<void> {
    this.clearFeedbackTimer();
    const copyResult = this.clipboard.writeText(paymentId);

    if (typeof copyResult === 'boolean') {
      this.showCopyFeedback(paymentId, copyResult ? 'copied' : 'failed');
      return;
    }

    const copied = await copyResult;
    this.showCopyFeedback(paymentId, copied ? 'copied' : 'failed');
  }

  exportCurrentView(): void {
    if (this.loadingState()) {
      return;
    }

    const payments = this.sortedPayments();
    const timestamp = new Date(this.currentTimeState() ?? Date.now());

    if (this.csvDownload.download(payments, timestamp)) {
      this.showExportSuccess(payments.length);
    }
  }

  changeSort(column: PaymentSortColumn): void {
    const currentCriteria = this.requestedSortCriteria();
    const nextCriteria = cyclePaymentSort(currentCriteria, column);

    this.requestedSortCriteria.set(nextCriteria);
    this.requestPayments(() => {
      this.sortAnnouncementState.set(
        this.describeSortAction(column, currentCriteria, nextCriteria),
      );
    });
  }

  sortDirection(column: PaymentSortColumn): PaymentSortCriterion['direction'] | null {
    return this.sortStateByColumn().get(column)?.direction ?? null;
  }

  sortAriaValue(column: PaymentSortColumn): 'ascending' | 'descending' | null {
    const state = this.sortStateByColumn().get(column);

    if (!state || state.priority !== 1) {
      return null;
    }

    return state.direction === 'asc' ? 'ascending' : 'descending';
  }

  sortDescriptionId(column: PaymentSortColumn): string {
    return 'payments-sort-description-' + column;
  }

  sortDescription(column: PaymentSortColumn): string {
    const state = this.sortStateByColumn().get(column);

    if (!state) {
      const nextCriteria = cyclePaymentSort(this.requestedSortCriteria(), column);
      const nextPriority = nextCriteria.findIndex((criterion) => criterion.column === column) + 1;

      return 'Not sorted. Activating adds this column ascending as priority ' + nextPriority + '.';
    }

    const priorityLabel = state.priority === 1 ? 'Primary sort' : 'Sort priority ' + state.priority;
    const directionLabel = state.direction === 'asc' ? 'ascending' : 'descending';
    const nextAction =
      state.direction === 'asc'
        ? 'Activating changes it to descending.'
        : 'Activating removes this column from the sort order.';

    return `${priorityLabel}, ${directionLabel}. ${nextAction}`;
  }

  changePageSize(pageSize: PageSize): void {
    this.applyPageSize(pageSize);
    this.preferences.writePageSize(pageSize);
  }

  showPreviousPage(): void {
    this.currentPageState.update((page) => Math.max(1, page - 1));
  }

  showNextPage(): void {
    this.currentPageState.update((page) => Math.min(this.pageCount(), page + 1));
  }

  changeDateRange(selection: DateRangeSelection | null): void {
    this.requestedDateRange.set(selection);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      this.filterAnnouncementState.set(
        selection === null
          ? `Date range filter cleared. ${paymentCount} found.`
          : `Date range filter applied: ${formatDateRangeLabel(selection)}. ${paymentCount} found.`,
      );
    });
  }

  changeStatuses(statuses: readonly PaymentStatus[]): void {
    this.requestedStatuses.set([...statuses]);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      if (statuses.length === 0) {
        this.filterAnnouncementState.set(`Status filter cleared. ${paymentCount} found.`);
        return;
      }

      const statusLabel = statuses.map((status) => PAYMENT_STATUS_LABELS[status]).join(', ');
      this.filterAnnouncementState.set(
        `Status filter applied: ${statusLabel}. ${paymentCount} found.`,
      );
    });
  }

  changePaymentMethods(paymentMethods: readonly PaymentMethodFilterValue[]): void {
    this.requestedPaymentMethods.set([...paymentMethods]);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      if (paymentMethods.length === 0) {
        this.filterAnnouncementState.set(`Payment method filter cleared. ${paymentCount} found.`);
        return;
      }

      const methodLabel = paymentMethods.map(paymentMethodFilterLabel).join(', ');
      this.filterAnnouncementState.set(
        `Payment method filter applied: ${methodLabel}. ${paymentCount} found.`,
      );
    });
  }

  changeAmountRange(range: AmountRange | null): void {
    this.requestedAmountRange.set(range);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      this.filterAnnouncementState.set(
        range === null
          ? `Amount range filter cleared. ${paymentCount} found.`
          : `Amount range filter applied: ${formatAmountRangeLabel(range)}. ${paymentCount} found.`,
      );
    });
  }

  changeTextSearch(value: string): void {
    this.textSearchInputState.set(value);
    this.clearTextSearchTimer();

    if (
      this.loadingState() &&
      serializeTextSearchQuery(parseTextSearchQuery(value)) !==
        serializeTextSearchQuery(this.requestedTextSearch())
    ) {
      this.cancelPendingQuery();
    }

    this.textSearchTimer = setTimeout(() => {
      this.textSearchTimer = undefined;
      this.applyTextSearch(value);
    }, TEXT_SEARCH_DEBOUNCE_MS);
  }

  clearAllFilters(): void {
    this.clearTextSearchTimer();
    this.requestedDateRange.set(null);
    this.requestedStatuses.set([]);
    this.requestedPaymentMethods.set([]);
    this.requestedAmountRange.set(null);
    this.textSearchInputState.set('');
    this.requestedTextSearch.set(null);
    this.requestPayments(() => {
      this.filterAnnouncementState.set(
        `All payment filters cleared. ${this.paymentCountSummary()} found.`,
      );
    });
  }

  private applyViewStateFromUrl({ viewState, announceRestore }: PaymentViewUrlChange): void {
    const nextCriteria = viewState.sortCriteria;
    const nextDateRange = viewState.dateRange;
    const nextStatuses = viewState.selectedStatuses;
    const nextPaymentMethods = viewState.selectedPaymentMethods;
    const nextAmountRange = viewState.amountRange;
    const nextTextSearch = viewState.textSearch;
    const sortChanged =
      serializePaymentSort(this.requestedSortCriteria()) !== serializePaymentSort(nextCriteria);
    const structuredFiltersChanged =
      serializeDateRangeQuery(this.requestedDateRange()) !==
        serializeDateRangeQuery(nextDateRange) ||
      serializeStatusQuery(this.requestedStatuses()) !== serializeStatusQuery(nextStatuses) ||
      serializePaymentMethodQuery(this.requestedPaymentMethods()) !==
        serializePaymentMethodQuery(nextPaymentMethods) ||
      serializeAmountRangeQuery(this.requestedAmountRange()) !==
        serializeAmountRangeQuery(nextAmountRange);
    const textSearchChanged =
      serializeTextSearchQuery(this.requestedTextSearch()) !==
      serializeTextSearchQuery(nextTextSearch);
    const filtersChanged = structuredFiltersChanged || textSearchChanged;

    if (sortChanged) {
      this.requestedSortCriteria.set(nextCriteria);
    }

    if (structuredFiltersChanged) {
      this.requestedDateRange.set(nextDateRange);
      this.requestedStatuses.set(nextStatuses);
      this.requestedPaymentMethods.set(nextPaymentMethods);
      this.requestedAmountRange.set(nextAmountRange);
    }

    this.clearTextSearchTimer();
    this.requestedTextSearch.set(nextTextSearch);
    this.textSearchInputState.set(nextTextSearch ?? '');

    const shouldResumeUnappliedView = !this.loadingState() && this.hasUnappliedRequestedViewState();

    if (!(sortChanged || filtersChanged || shouldResumeUnappliedView)) {
      return;
    }

    const announceRestoredView = (): void => {
      if (sortChanged) {
        this.sortAnnouncementState.set(
          'Sort order restored from the URL. ' + this.describeSortOrder(nextCriteria),
        );
      }

      if (filtersChanged) {
        this.filterAnnouncementState.set(
          this.describeRestoredFilters(
            nextDateRange,
            nextStatuses,
            nextPaymentMethods,
            nextAmountRange,
            nextTextSearch,
          ),
        );
      } else if (!sortChanged) {
        this.filterAnnouncementState.set(
          `Payment results restored from the URL. ${this.paymentCountSummary()} found.`,
        );
      }
    };

    if (announceRestore) {
      this.requestPayments(announceRestoredView, false);
      return;
    }

    this.cancelPendingQuery();
    this.currentPageState.set(1);
    this.appliedViewState.set(this.captureRequestedViewState());
    this.resetTableScrollPosition();
  }

  private describeRestoredFilters(
    dateRange: DateRangeSelection | null,
    statuses: readonly PaymentStatus[],
    paymentMethods: readonly PaymentMethodFilterValue[],
    amountRange: AmountRange | null,
    textSearch: string | null,
  ): string {
    const filters: string[] = [];

    if (dateRange !== null) {
      filters.push('Date range ' + formatDateRangeLabel(dateRange));
    }

    if (statuses.length > 0) {
      filters.push('Status ' + statuses.map((status) => PAYMENT_STATUS_LABELS[status]).join(', '));
    }

    if (paymentMethods.length > 0) {
      filters.push('Payment method ' + paymentMethods.map(paymentMethodFilterLabel).join(', '));
    }

    if (amountRange !== null) {
      filters.push('Amount range ' + formatAmountRangeLabel(amountRange));
    }

    if (textSearch !== null) {
      filters.push('Text search ' + textSearch);
    }

    const paymentCount = this.filteredPayments().length;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    return filters.length === 0
      ? `Filters cleared from the URL. ${paymentCount} ${paymentLabel} found.`
      : `Filters restored from the URL: ${filters.join('; ')}. ${paymentCount} ${paymentLabel} found.`;
  }

  private describeSortAction(
    column: PaymentSortColumn,
    currentCriteria: readonly PaymentSortCriterion[],
    nextCriteria: readonly PaymentSortCriterion[],
  ): string {
    const currentCriterion = currentCriteria.find((criterion) => criterion.column === column);
    const label = PAYMENT_SORT_COLUMN_LABELS[column];

    if (!currentCriterion) {
      return (
        `${label} added as priority ${nextCriteria.length}, ascending. ` +
        this.describeSortOrder(nextCriteria)
      );
    }

    if (currentCriterion.direction === 'asc') {
      return `${label} changed to descending. ${this.describeSortOrder(nextCriteria)}`;
    }

    if (nextCriteria.length === 0) {
      return `${label} removed. Sorting removed. Rows are in their original order.`;
    }

    return `${label} removed. ${this.describeSortOrder(nextCriteria)}`;
  }

  private describeSortOrder(criteria: readonly PaymentSortCriterion[]): string {
    if (criteria.length === 0) {
      return 'Rows are in their original order.';
    }

    const labels = criteria.map((criterion) => {
      const direction = criterion.direction === 'asc' ? 'ascending' : 'descending';
      return PAYMENT_SORT_COLUMN_LABELS[criterion.column] + ' ' + direction;
    });

    return 'Sort order: ' + labels.join(', then ') + '.';
  }

  private applyPageSize(pageSize: PageSize): void {
    this.currentPageState.set(1);
    this.pageSizeState.set(pageSize);
  }

  private applyTextSearch(value: string): void {
    const nextTextSearch = parseTextSearchQuery(value);
    const textSearchChanged =
      serializeTextSearchQuery(this.requestedTextSearch()) !==
      serializeTextSearchQuery(nextTextSearch);

    if (!textSearchChanged && !this.hasUnappliedRequestedViewState()) {
      return;
    }

    if (textSearchChanged) {
      this.requestedTextSearch.set(nextTextSearch);
    }

    this.requestPayments(() => {
      if (textSearchChanged) {
        const action = nextTextSearch === null ? 'cleared' : `applied: ${nextTextSearch}`;
        this.filterAnnouncementState.set(
          `Text search filter ${action}. ${this.paymentCountSummary()} found.`,
        );
        return;
      }

      this.filterAnnouncementState.set(
        `Payment results updated. ${this.paymentCountSummary()} found.`,
      );
    });
  }

  private captureRequestedViewState(): PaymentViewState {
    return {
      sortCriteria: [...this.requestedSortCriteria()],
      dateRange: this.requestedDateRange(),
      selectedStatuses: [...this.requestedStatuses()],
      selectedPaymentMethods: [...this.requestedPaymentMethods()],
      amountRange: this.requestedAmountRange(),
      textSearch: this.requestedTextSearch(),
    };
  }

  private hasUnappliedRequestedViewState(): boolean {
    return (
      paymentViewStateSignature(this.captureRequestedViewState()) !==
      paymentViewStateSignature(this.appliedViewState())
    );
  }

  private requestPayments(announceResult: () => void, writeUrl = true): void {
    const requestedViewState = this.captureRequestedViewState();

    this.cancelPendingQuery();
    const requestId = ++this.queryRequestId;
    this.resetTableScrollPosition();
    this.viewEffects.updateSkeletonLayout();
    this.loadingState.set(true);
    this.sortAnnouncementState.set('');
    this.filterAnnouncementState.set('');

    const applyResponse = (): void => {
      if (requestId !== this.queryRequestId) {
        return;
      }

      this.queryTimer = undefined;
      this.currentPageState.set(1);
      this.appliedViewState.set(requestedViewState);
      this.loadingState.set(false);
      this.resetTableScrollPosition();
      announceResult();

      if (writeUrl) {
        this.url.write(requestedViewState);
      }
    };
    const delay = this.queryDelay();

    if (delay <= 0) {
      applyResponse();
      return;
    }

    this.queryTimer = setTimeout(applyResponse, delay);
  }

  private cancelPendingQuery(): void {
    this.queryRequestId += 1;

    if (this.queryTimer !== undefined) {
      clearTimeout(this.queryTimer);
      this.queryTimer = undefined;
    }

    this.loadingState.set(false);
  }

  private resetTableScrollPosition(): void {
    this.viewEffects.resetScrollPosition();
  }

  private paymentCountSummary(): string {
    const paymentCount = this.filteredPayments().length;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';
    return `${paymentCount} ${paymentLabel}`;
  }

  private clearTextSearchTimer(): void {
    if (this.textSearchTimer !== undefined) {
      clearTimeout(this.textSearchTimer);
      this.textSearchTimer = undefined;
    }
  }

  private showCopyFeedback(paymentId: string, status: PaymentCopyState['status']): void {
    this.copyStateValue.set({ paymentId, status });
    this.feedbackTimer = setTimeout(() => {
      if (this.copyStateValue()?.paymentId === paymentId) {
        this.copyStateValue.set(null);
      }
    }, COPY_FEEDBACK_DURATION_MS);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== undefined) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = undefined;
    }
  }

  private showExportSuccess(paymentCount: number): void {
    this.clearExportToastTimer();
    const toastId = ++this.exportToastId;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    this.exportToastState.set([
      {
        id: toastId,
        message: `CSV export completed successfully. ${paymentCount} ${paymentLabel} exported.`,
      },
    ]);
    this.exportToastTimer = setTimeout(() => {
      if (this.exportToastState()[0]?.id === toastId) {
        this.exportToastState.set([]);
      }

      this.exportToastTimer = undefined;
    }, EXPORT_TOAST_DURATION_MS);
  }

  private clearExportToastTimer(): void {
    if (this.exportToastTimer !== undefined) {
      clearTimeout(this.exportToastTimer);
      this.exportToastTimer = undefined;
    }
  }

  private stopClock(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.clockTimer !== undefined) {
      browserWindow.clearInterval(this.clockTimer);
      this.clockTimer = undefined;
    }
  }
}
