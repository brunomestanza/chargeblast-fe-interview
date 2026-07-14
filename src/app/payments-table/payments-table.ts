import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, type ParamMap } from '@angular/router';
import { filter, take } from 'rxjs';
import { DateRangeFilter } from './filters/date-range-filter/date-range-filter';
import {
  DateRangeSelection,
  dateKeyInTimeZone,
  formatDateRangeLabel,
  isTimestampInDateRange,
  resolveDateRangeForToday,
} from './filters/date-range-filter/date-range';
import { PaymentMethodFilter } from './filters/payment-method-filter/payment-method-filter';
import { matchesPaymentMethodFilter } from './filters/payment-method-filter/payment-method-filter-match';
import {
  paymentMethodFilterLabel,
  type PaymentMethodFilterValue,
} from './filters/payment-method-filter/payment-method-filter-options.mock';
import { StatusFilter } from './filters/status-filter/status-filter';
import {
  DATE_RANGE_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  parseDateRangeQuery,
  parsePaymentMethodQuery,
  parseStatusQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
} from './payment-filter-query';
import { PAYMENT_STATUS_LABELS, Payment, PaymentStatus } from './payment';
import { PaymentCopyState, PaymentRow } from './payment-row';
import {
  DEFAULT_PAYMENT_SORT,
  PAYMENT_SORT_COLUMN_LABELS,
  PaymentSortColumn,
  PaymentSortCriterion,
  cyclePaymentSort,
  parsePaymentSort,
  serializePaymentSort,
  sortPayments,
} from './payment-sort';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const PAGE_SIZE_STORAGE_KEY = 'chargeblast.payments.page-size';
const SORT_QUERY_PARAM = 'sort';

interface PaymentTableColumn {
  readonly key: PaymentSortColumn;
  readonly label: string;
  readonly align: 'left' | 'right';
}

interface PaymentSortColumnState {
  readonly direction: PaymentSortCriterion['direction'];
  readonly priority: number;
}

const PAYMENT_TABLE_COLUMNS: readonly PaymentTableColumn[] = [
  { key: 'paymentId', label: PAYMENT_SORT_COLUMN_LABELS.paymentId, align: 'left' },
  { key: 'customer', label: PAYMENT_SORT_COLUMN_LABELS.customer, align: 'left' },
  { key: 'amount', label: PAYMENT_SORT_COLUMN_LABELS.amount, align: 'right' },
  { key: 'status', label: PAYMENT_SORT_COLUMN_LABELS.status, align: 'left' },
  { key: 'paymentMethod', label: PAYMENT_SORT_COLUMN_LABELS.paymentMethod, align: 'right' },
  { key: 'created', label: PAYMENT_SORT_COLUMN_LABELS.created, align: 'right' },
];

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function isPageSize(value: number): value is PageSize {
  return value === 25 || value === 50 || value === 100;
}

function parseStoredPageSize(value: string | null): PageSize {
  if (value === null) {
    return DEFAULT_PAGE_SIZE;
  }

  const pageSize = Number(value);
  return isPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
}

function readStoredPageSize(
  browserWindow: Window | null = typeof window === 'undefined' ? null : window,
): PageSize {
  if (!browserWindow) {
    return DEFAULT_PAGE_SIZE;
  }

  try {
    return parseStoredPageSize(browserWindow.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

@Component({
  selector: 'app-payments-table',
  imports: [DateRangeFilter, StatusFilter, PaymentMethodFilter, PaymentRow],
  templateUrl: './payments-table.html',
  styleUrls: ['./payments-table.css', './payments-table-sort.css'],
})
export class PaymentsTable {
  private readonly document = inject(DOCUMENT);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly payments = input.required<readonly Payment[]>();

  protected readonly copyState = signal<PaymentCopyState | null>(null);
  protected readonly currentTime = signal<number | null>(null);
  protected readonly timeZone = signal('UTC');
  protected readonly sortColumns = PAYMENT_TABLE_COLUMNS;
  protected readonly sortCriteria = signal<readonly PaymentSortCriterion[]>(DEFAULT_PAYMENT_SORT);
  protected readonly sortAnnouncement = signal('');
  protected readonly filterAnnouncement = signal('');
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly pageSize = signal<PageSize>(DEFAULT_PAGE_SIZE);
  protected readonly currentPage = signal(1);
  protected readonly dateRange = signal<DateRangeSelection | null>(null);
  protected readonly selectedStatuses = signal<readonly PaymentStatus[]>([]);
  protected readonly selectedPaymentMethods = signal<readonly PaymentMethodFilterValue[]>([]);
  protected readonly effectiveDateRange = computed(() => {
    const selection = this.dateRange();
    const currentTime = this.currentTime();

    if (selection === null || currentTime === null) {
      return selection;
    }

    const today = dateKeyInTimeZone(currentTime, this.timeZone());
    return resolveDateRangeForToday(selection, today);
  });
  protected readonly filteredPayments = computed(() => {
    const dateRange = this.effectiveDateRange();
    const selectedStatuses = this.selectedStatuses();
    const selectedPaymentMethods = this.selectedPaymentMethods();

    if (
      dateRange === null &&
      selectedStatuses.length === 0 &&
      selectedPaymentMethods.length === 0
    ) {
      return this.payments();
    }

    const timeZone = this.timeZone();
    return this.payments().filter(
      (payment) =>
        (dateRange === null || isTimestampInDateRange(payment.createdAt, dateRange, timeZone)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(payment.status)) &&
        matchesPaymentMethodFilter(payment.paymentMethod, selectedPaymentMethods),
    );
  });
  protected readonly paymentCountLabel = computed(() => {
    const count = this.filteredPayments().length;
    return count === 1 ? '1 payment' : count + ' payments';
  });
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredPayments().length / this.pageSize())),
  );
  protected readonly sortedPayments = computed(() =>
    sortPayments(this.filteredPayments(), this.sortCriteria()),
  );
  protected readonly paginatedPayments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.sortedPayments().slice(startIndex, startIndex + this.pageSize());
  });
  protected readonly paginationRangeLabel = computed(() => {
    const paymentCount = this.filteredPayments().length;

    if (paymentCount === 0) {
      return 'Viewing 0 of 0 payments';
    }

    const firstPayment = (this.currentPage() - 1) * this.pageSize() + 1;
    const lastPayment = Math.min(firstPayment + this.pageSize() - 1, paymentCount);
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    return `Viewing ${firstPayment}–${lastPayment} of ${paymentCount} ${paymentLabel}`;
  });
  protected readonly copyAnnouncement = computed(() => {
    const state = this.copyState();

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
        this.sortCriteria().map((criterion, index) => [
          criterion.column,
          { direction: criterion.direction, priority: index + 1 },
        ]),
      ),
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly keepCurrentPageInBounds = effect(() => {
    const pageCount = this.pageCount();

    untracked(() => {
      if (this.currentPage() > pageCount) {
        this.currentPage.set(pageCount);
      }
    });
  });
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private clockTimer: number | undefined;
  private readonly handlePageSizeStorageChange = (event: StorageEvent): void => {
    const browserWindow = this.document.defaultView;

    if (!browserWindow || (event.key !== PAGE_SIZE_STORAGE_KEY && event.key !== null)) {
      return;
    }

    try {
      if (event.storageArea !== null && event.storageArea !== browserWindow.localStorage) {
        return;
      }
    } catch {
      return;
    }

    this.applyPageSize(parseStoredPageSize(event.newValue));
  };
  private urlSyncReady = false;

  constructor() {
    this.pageSize.set(readStoredPageSize());
    this.applyViewStateFromUrl(this.activatedRoute.snapshot.queryParamMap, false);
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams) => this.applyViewStateFromUrl(queryParams));
    this.startUrlSync();
    afterNextRender(() => this.startBrowserState());
    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
      this.stopClock();
      this.document.defaultView?.removeEventListener('storage', this.handlePageSizeStorageChange);
    });
  }

  protected async copyPaymentId(paymentId: string): Promise<void> {
    this.clearFeedbackTimer();
    const clipboard = this.document.defaultView?.navigator.clipboard;

    if (!clipboard) {
      this.showCopyFeedback(paymentId, 'failed');
      return;
    }

    try {
      await clipboard.writeText(paymentId);
      this.showCopyFeedback(paymentId, 'copied');
    } catch {
      this.showCopyFeedback(paymentId, 'failed');
    }
  }

  protected changeSort(column: PaymentSortColumn): void {
    const currentCriteria = this.sortCriteria();
    const nextCriteria = cyclePaymentSort(currentCriteria, column);

    this.sortCriteria.set(nextCriteria);
    this.currentPage.set(1);
    this.sortAnnouncement.set(this.describeSortAction(column, currentCriteria, nextCriteria));
    this.writeViewStateToUrl(false);
  }

  protected sortDirection(column: PaymentSortColumn): PaymentSortCriterion['direction'] | null {
    return this.sortStateByColumn().get(column)?.direction ?? null;
  }

  protected sortAriaValue(column: PaymentSortColumn): 'ascending' | 'descending' | null {
    const state = this.sortStateByColumn().get(column);

    if (!state || state.priority !== 1) {
      return null;
    }

    return state.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortDescriptionId(column: PaymentSortColumn): string {
    return 'payments-sort-description-' + column;
  }

  protected sortDescription(column: PaymentSortColumn): string {
    const state = this.sortStateByColumn().get(column);

    if (!state) {
      const nextCriteria = cyclePaymentSort(this.sortCriteria(), column);
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

  protected changePageSize(event: Event): void {
    const selectedPageSize = Number((event.target as HTMLSelectElement).value);

    if (!isPageSize(selectedPageSize)) {
      return;
    }

    this.applyPageSize(selectedPageSize);
    this.storePageSize(selectedPageSize);
  }

  protected showPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected showNextPage(): void {
    this.currentPage.update((page) => Math.min(this.pageCount(), page + 1));
  }

  protected changeDateRange(selection: DateRangeSelection | null): void {
    this.dateRange.set(selection);
    this.currentPage.set(1);
    this.writeViewStateToUrl(false);

    if (selection === null) {
      const paymentCount = this.filteredPayments().length;
      const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';
      this.filterAnnouncement.set(
        `Date range filter cleared. ${paymentCount} ${paymentLabel} found.`,
      );
      return;
    }

    const paymentCount = this.filteredPayments().length;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';
    this.filterAnnouncement.set(
      `Date range filter applied: ${formatDateRangeLabel(selection)}. ${paymentCount} ${paymentLabel} found.`,
    );
  }

  protected changeStatuses(statuses: readonly PaymentStatus[]): void {
    this.selectedStatuses.set([...statuses]);
    this.currentPage.set(1);
    this.writeViewStateToUrl(false);

    if (statuses.length === 0) {
      const paymentCount = this.filteredPayments().length;
      const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';
      this.filterAnnouncement.set(`Status filter cleared. ${paymentCount} ${paymentLabel} found.`);
      return;
    }

    const statusLabel = statuses.map((status) => PAYMENT_STATUS_LABELS[status]).join(', ');
    const paymentCount = this.filteredPayments().length;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';
    this.filterAnnouncement.set(
      `Status filter applied: ${statusLabel}. ${paymentCount} ${paymentLabel} found.`,
    );
  }

  protected changePaymentMethods(paymentMethods: readonly PaymentMethodFilterValue[]): void {
    this.selectedPaymentMethods.set([...paymentMethods]);
    this.currentPage.set(1);
    this.writeViewStateToUrl(false);

    const paymentCount = this.filteredPayments().length;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    if (paymentMethods.length === 0) {
      this.filterAnnouncement.set(
        `Payment method filter cleared. ${paymentCount} ${paymentLabel} found.`,
      );
      return;
    }

    const methodLabel = paymentMethods.map(paymentMethodFilterLabel).join(', ');
    this.filterAnnouncement.set(
      `Payment method filter applied: ${methodLabel}. ${paymentCount} ${paymentLabel} found.`,
    );
  }

  private startBrowserState(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.restorePageSize(browserWindow);
    browserWindow.addEventListener('storage', this.handlePageSizeStorageChange);
    this.timeZone.set(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    this.currentTime.set(Date.now());
    this.clockTimer = browserWindow.setInterval(() => this.currentTime.set(Date.now()), 60_000);
  }

  private startUrlSync(): void {
    if (this.router.navigated) {
      this.enableUrlSync();
      return;
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.enableUrlSync());
  }

  private enableUrlSync(): void {
    this.urlSyncReady = true;
    this.applyViewStateFromUrl(this.activatedRoute.snapshot.queryParamMap, false);
  }

  private applyViewStateFromUrl(queryParams: ParamMap, announceRestore = this.urlSyncReady): void {
    const nextCriteria = parsePaymentSort(queryParams.get(SORT_QUERY_PARAM));
    const nextDateRange = parseDateRangeQuery(
      queryParams.get(DATE_RANGE_QUERY_PARAM),
      dateKeyInTimeZone(this.currentTime() ?? Date.now(), this.timeZone()),
    );
    const nextStatuses = parseStatusQuery(queryParams.get(STATUS_QUERY_PARAM));
    const nextPaymentMethods = parsePaymentMethodQuery(queryParams.get(PAYMENT_METHOD_QUERY_PARAM));
    const sortChanged =
      serializePaymentSort(this.sortCriteria()) !== serializePaymentSort(nextCriteria);
    const filtersChanged =
      serializeDateRangeQuery(this.dateRange()) !== serializeDateRangeQuery(nextDateRange) ||
      serializeStatusQuery(this.selectedStatuses()) !== serializeStatusQuery(nextStatuses) ||
      serializePaymentMethodQuery(this.selectedPaymentMethods()) !==
        serializePaymentMethodQuery(nextPaymentMethods);

    if (sortChanged) {
      this.sortCriteria.set(nextCriteria);

      if (announceRestore) {
        this.sortAnnouncement.set(
          'Sort order restored from the URL. ' + this.describeSortOrder(nextCriteria),
        );
      }
    }

    if (filtersChanged) {
      this.dateRange.set(nextDateRange);
      this.selectedStatuses.set(nextStatuses);
      this.selectedPaymentMethods.set(nextPaymentMethods);

      if (announceRestore) {
        this.filterAnnouncement.set(
          this.describeRestoredFilters(nextDateRange, nextStatuses, nextPaymentMethods),
        );
      }
    }

    if (sortChanged || filtersChanged) {
      this.currentPage.set(1);
    }

    if (this.urlSyncReady && !this.hasCanonicalViewQuery(queryParams)) {
      this.writeViewStateToUrl(true);
    }
  }

  private hasCanonicalViewQuery(queryParams: ParamMap): boolean {
    return (
      this.isCanonicalQueryParam(
        queryParams,
        SORT_QUERY_PARAM,
        serializePaymentSort(this.sortCriteria()),
      ) &&
      this.isCanonicalQueryParam(
        queryParams,
        DATE_RANGE_QUERY_PARAM,
        serializeDateRangeQuery(this.dateRange()),
      ) &&
      this.isCanonicalQueryParam(
        queryParams,
        STATUS_QUERY_PARAM,
        serializeStatusQuery(this.selectedStatuses()),
      ) &&
      this.isCanonicalQueryParam(
        queryParams,
        PAYMENT_METHOD_QUERY_PARAM,
        serializePaymentMethodQuery(this.selectedPaymentMethods()),
      )
    );
  }

  private isCanonicalQueryParam(queryParams: ParamMap, key: string, value: string | null): boolean {
    const values = queryParams.getAll(key);
    return value === null ? values.length === 0 : values.length === 1 && values[0] === value;
  }

  private writeViewStateToUrl(replaceUrl: boolean): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        [SORT_QUERY_PARAM]: serializePaymentSort(this.sortCriteria()),
        [DATE_RANGE_QUERY_PARAM]: serializeDateRangeQuery(this.dateRange()),
        [STATUS_QUERY_PARAM]: serializeStatusQuery(this.selectedStatuses()),
        [PAYMENT_METHOD_QUERY_PARAM]: serializePaymentMethodQuery(this.selectedPaymentMethods()),
      },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl,
    });
  }

  private describeRestoredFilters(
    dateRange: DateRangeSelection | null,
    statuses: readonly PaymentStatus[],
    paymentMethods: readonly PaymentMethodFilterValue[],
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

  private restorePageSize(browserWindow: Window): void {
    this.applyPageSize(readStoredPageSize(browserWindow));
  }

  private applyPageSize(pageSize: PageSize): void {
    this.currentPage.set(1);
    this.pageSize.set(pageSize);
  }

  private storePageSize(pageSize: PageSize): void {
    try {
      this.document.defaultView?.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // Keep pagination usable when localStorage is unavailable.
    }
  }

  private stopClock(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.clockTimer !== undefined) {
      browserWindow.clearInterval(this.clockTimer);
      this.clockTimer = undefined;
    }
  }

  private showCopyFeedback(paymentId: string, status: PaymentCopyState['status']): void {
    this.copyState.set({ paymentId, status });
    this.feedbackTimer = setTimeout(() => {
      if (this.copyState()?.paymentId === paymentId) {
        this.copyState.set(null);
      }
    }, 1800);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== undefined) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = undefined;
    }
  }
}
