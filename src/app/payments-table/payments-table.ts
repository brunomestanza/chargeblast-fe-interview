import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, type ParamMap } from '@angular/router';
import { filter, take } from 'rxjs';
import { ExportPaymentsButton } from './export-payments-button/export-payments-button';
import { ExportSuccessToast } from './export-success-toast/export-success-toast';
import { AmountRangeFilter } from './filters/amount-range-filter/amount-range-filter';
import {
  type AmountRange,
  formatAmountRangeLabel,
  matchesAmountRange,
} from './filters/amount-range-filter/amount-range';
import { CleanFiltersButton } from './filters/clean-filters-button/clean-filters-button';
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
import { TextSearchFilter } from './filters/text-search-filter/text-search-filter';
import {
  AMOUNT_RANGE_QUERY_PARAM,
  DATE_RANGE_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  TEXT_SEARCH_QUERY_PARAM,
  parseAmountRangeQuery,
  parseDateRangeQuery,
  parsePaymentMethodQuery,
  parseStatusQuery,
  parseTextSearchQuery,
  serializeAmountRangeQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
  serializeTextSearchQuery,
} from './payment-filter-query';
import { PAYMENT_STATUS_LABELS, Payment, PaymentStatus } from './payment';
import {
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_WIDTHS_STORAGE_KEY,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  PaymentColumnWidths,
  clampColumnWidth,
  moveColumn,
  parseStoredColumnOrder,
  parseStoredColumnWidths,
  readStoredColumnOrder,
  readStoredColumnWidths,
  serializeColumnOrder,
  serializeColumnWidths,
} from './payment-columns';
import {
  createPaymentsCsvFilename,
  PAYMENTS_CSV_MIME_TYPE,
  serializePaymentsCsv,
} from './payment-csv';
import { PAYMENT_QUERY_DELAY } from './payment-query-delay';
import { PaymentCopyState, PaymentRow } from './payment-row';
import { PaymentSkeletonRow } from './payment-skeleton-row';
import { createPaymentTextSearch, matchesPaymentTextSearch } from './payment-text-search';
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
export const TEXT_SEARCH_DEBOUNCE_MS = 300;
const EXPORT_TOAST_DURATION_MS = 5_000;
const MANAGED_VIEW_QUERY_PARAMS = new Set([
  SORT_QUERY_PARAM,
  DATE_RANGE_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  AMOUNT_RANGE_QUERY_PARAM,
  TEXT_SEARCH_QUERY_PARAM,
]);

interface PaymentTableColumn {
  readonly key: PaymentSortColumn;
  readonly label: string;
  readonly align: 'left' | 'right';
  readonly columnClass: string;
  readonly defaultWidth: number;
}

interface PaymentSortColumnState {
  readonly direction: PaymentSortCriterion['direction'];
  readonly priority: number;
}

interface PaymentViewState {
  readonly sortCriteria: readonly PaymentSortCriterion[];
  readonly dateRange: DateRangeSelection | null;
  readonly selectedStatuses: readonly PaymentStatus[];
  readonly selectedPaymentMethods: readonly PaymentMethodFilterValue[];
  readonly amountRange: AmountRange | null;
  readonly textSearch: string | null;
}

interface PendingViewStateWrite {
  readonly source: 'payments-table';
}

interface ExportToast {
  readonly id: number;
  readonly message: string;
}

const PAYMENT_TABLE_COLUMNS: readonly PaymentTableColumn[] = [
  {
    key: 'paymentId',
    label: PAYMENT_SORT_COLUMN_LABELS.paymentId,
    align: 'left',
    columnClass: 'payment-id-column',
    defaultWidth: 248,
  },
  {
    key: 'customer',
    label: PAYMENT_SORT_COLUMN_LABELS.customer,
    align: 'left',
    columnClass: 'customer-column',
    defaultWidth: 220,
  },
  {
    key: 'amount',
    label: PAYMENT_SORT_COLUMN_LABELS.amount,
    align: 'right',
    columnClass: 'amount-column',
    defaultWidth: 150,
  },
  {
    key: 'status',
    label: PAYMENT_SORT_COLUMN_LABELS.status,
    align: 'left',
    columnClass: 'status-column',
    defaultWidth: 130,
  },
  {
    key: 'paymentMethod',
    label: PAYMENT_SORT_COLUMN_LABELS.paymentMethod,
    align: 'right',
    columnClass: 'payment-method-column',
    defaultWidth: 190,
  },
  {
    key: 'created',
    label: PAYMENT_SORT_COLUMN_LABELS.created,
    align: 'right',
    columnClass: 'created-column',
    defaultWidth: 175,
  },
];

const PAYMENT_TABLE_COLUMN_MAP = new Map<PaymentSortColumn, PaymentTableColumn>(
  PAYMENT_TABLE_COLUMNS.map((column) => [column.key, column]),
);

const COLUMN_REORDER_HOLD_MS = 1_000;
const COLUMN_REORDER_HOLD_MOVE_TOLERANCE = 8;
const COLUMN_RESIZE_KEYBOARD_STEP = 8;
const COLUMN_RESIZE_KEYBOARD_STEP_LARGE = 24;

interface ColumnResizeState {
  readonly key: PaymentSortColumn;
  readonly pointerId: number;
  readonly startX: number;
  readonly startWidth: number;
}

interface ColumnDragState {
  readonly key: PaymentSortColumn;
  readonly pointerId: number;
  readonly startIndex: number;
  readonly startOrder: readonly PaymentSortColumn[];
  readonly startX: number;
  readonly startY: number;
  readonly headerRow: HTMLElement;
  currentIndex: number;
  dragging: boolean;
}

const INITIAL_PAYMENT_VIEW_STATE: PaymentViewState = {
  sortCriteria: DEFAULT_PAYMENT_SORT,
  dateRange: null,
  selectedStatuses: [],
  selectedPaymentMethods: [],
  amountRange: null,
  textSearch: null,
};
const PAYMENT_SKELETON_ROWS = Array.from({ length: 15 }, (_, index) => index);

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
  imports: [
    DateRangeFilter,
    StatusFilter,
    PaymentMethodFilter,
    AmountRangeFilter,
    TextSearchFilter,
    CleanFiltersButton,
    ExportPaymentsButton,
    ExportSuccessToast,
    PaymentRow,
    PaymentSkeletonRow,
  ],
  templateUrl: './payments-table.html',
  styleUrls: [
    './payments-table.css',
    './payments-table-export.css',
    './payments-table-scroll.css',
    './payments-table-sort.css',
    './payments-table-columns.css',
  ],
})
export class PaymentsTable {
  private readonly document = inject(DOCUMENT);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryDelay = inject(PAYMENT_QUERY_DELAY);

  readonly payments = input.required<readonly Payment[]>();

  protected readonly copyState = signal<PaymentCopyState | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly skeletonRows = PAYMENT_SKELETON_ROWS;
  protected readonly currentTime = signal<number | null>(null);
  protected readonly timeZone = signal('UTC');
  protected readonly minColumnWidth = MIN_COLUMN_WIDTH;
  protected readonly maxColumnWidth = MAX_COLUMN_WIDTH;
  protected readonly columnOrder = signal<readonly PaymentSortColumn[]>(readStoredColumnOrder());
  protected readonly columnWidths = signal<PaymentColumnWidths>(readStoredColumnWidths());
  protected readonly orderedColumns = computed<readonly PaymentTableColumn[]>(() =>
    this.columnOrder().map((key) => PAYMENT_TABLE_COLUMN_MAP.get(key)!),
  );
  protected readonly draggingColumn = signal<PaymentSortColumn | null>(null);
  protected readonly resizingColumn = signal<PaymentSortColumn | null>(null);
  protected readonly columnAnnouncement = signal('');
  protected readonly sortCriteria = signal<readonly PaymentSortCriterion[]>(DEFAULT_PAYMENT_SORT);
  protected readonly sortAnnouncement = signal('');
  protected readonly filterAnnouncement = signal('');
  protected readonly exportToasts = signal<readonly ExportToast[]>([]);
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly pageSize = signal<PageSize>(DEFAULT_PAGE_SIZE);
  protected readonly currentPage = signal(1);
  protected readonly dateRange = signal<DateRangeSelection | null>(null);
  protected readonly selectedStatuses = signal<readonly PaymentStatus[]>([]);
  protected readonly selectedPaymentMethods = signal<readonly PaymentMethodFilterValue[]>([]);
  protected readonly amountRange = signal<AmountRange | null>(null);
  protected readonly textSearchInput = signal('');
  protected readonly textSearch = signal<string | null>(null);
  private readonly appliedViewState = signal<PaymentViewState>(INITIAL_PAYMENT_VIEW_STATE);
  protected readonly hasActiveFilters = computed(
    () =>
      this.dateRange() !== null ||
      this.selectedStatuses().length > 0 ||
      this.selectedPaymentMethods().length > 0 ||
      this.amountRange() !== null ||
      this.textSearch() !== null ||
      parseTextSearchQuery(this.textSearchInput()) !== null,
  );
  protected readonly effectiveDateRange = computed(() => {
    const selection = this.appliedViewState().dateRange;
    const currentTime = this.currentTime();

    if (selection === null || currentTime === null) {
      return selection;
    }

    const today = dateKeyInTimeZone(currentTime, this.timeZone());
    return resolveDateRangeForToday(selection, today);
  });
  protected readonly filteredPayments = computed(() => {
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
      return this.payments();
    }

    const timeZone = this.timeZone();
    return this.payments().filter(
      (payment) =>
        (dateRange === null || isTimestampInDateRange(payment.createdAt, dateRange, timeZone)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(payment.status)) &&
        matchesPaymentMethodFilter(payment.paymentMethod, selectedPaymentMethods) &&
        (amountRange === null || matchesAmountRange(payment, amountRange)) &&
        matchesPaymentTextSearch(payment, textSearch),
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
    sortPayments(this.filteredPayments(), this.appliedViewState().sortCriteria),
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
  private readonly textSearchFilter = viewChild.required(TextSearchFilter);
  private readonly tableScroll = viewChild<ElementRef<HTMLElement>>('tableScroll');
  private readonly keepCurrentPageInBounds = effect(() => {
    const pageCount = this.pageCount();

    untracked(() => {
      if (this.currentPage() > pageCount) {
        this.currentPage.set(pageCount);
      }
    });
  });
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastTimer: ReturnType<typeof setTimeout> | undefined;
  private exportToastId = 0;
  private textSearchTimer: ReturnType<typeof setTimeout> | undefined;
  private queryTimer: ReturnType<typeof setTimeout> | undefined;
  private queryRequestId = 0;
  private clockTimer: number | undefined;
  private columnResizeState: ColumnResizeState | undefined;
  private columnDragState: ColumnDragState | undefined;
  private columnDragCaptureCell: HTMLElement | undefined;
  private columnHoldTimer: ReturnType<typeof setTimeout> | undefined;
  private suppressSortColumn: PaymentSortColumn | null = null;
  private readonly pendingViewStateWrites = new Set<PendingViewStateWrite>();
  private readonly handleColumnStorageChange = (event: StorageEvent): void => {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    if (
      event.key !== COLUMN_ORDER_STORAGE_KEY &&
      event.key !== COLUMN_WIDTHS_STORAGE_KEY &&
      event.key !== null
    ) {
      return;
    }

    try {
      if (event.storageArea !== null && event.storageArea !== browserWindow.localStorage) {
        return;
      }
    } catch {
      return;
    }

    if (event.key === COLUMN_ORDER_STORAGE_KEY || event.key === null) {
      this.columnOrder.set(parseStoredColumnOrder(event.newValue));
    }

    if (event.key === COLUMN_WIDTHS_STORAGE_KEY || event.key === null) {
      this.columnWidths.set(parseStoredColumnWidths(event.newValue));
    }
  };
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
      this.clearExportToastTimer();
      this.clearTextSearchTimer();
      this.cancelPendingQuery();
      this.clearColumnHoldTimer();
      this.stopClock();
      const browserWindow = this.document.defaultView;
      browserWindow?.removeEventListener('storage', this.handlePageSizeStorageChange);
      browserWindow?.removeEventListener('storage', this.handleColumnStorageChange);
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

  protected openPaymentDetails(paymentId: string): void {
    void this.router.navigate(['/payments', paymentId], { queryParamsHandling: 'preserve' });
  }

  protected exportCurrentView(): void {
    const browserWindow = this.document.defaultView;

    if (
      !browserWindow ||
      this.isLoading() ||
      typeof browserWindow.URL.createObjectURL !== 'function'
    ) {
      return;
    }

    const payments = this.sortedPayments();
    const csv = serializePaymentsCsv(payments);
    const blob = new browserWindow.Blob([csv], { type: PAYMENTS_CSV_MIME_TYPE });
    const downloadLink = this.document.createElement('a');
    let objectUrl: string | null = null;

    try {
      objectUrl = browserWindow.URL.createObjectURL(blob);
      downloadLink.href = objectUrl;
      downloadLink.download = createPaymentsCsvFilename(new Date(this.currentTime() ?? Date.now()));
      downloadLink.hidden = true;
      this.document.body.append(downloadLink);
      downloadLink.click();
      this.showExportSuccess(payments.length);
    } catch {
      // Do not announce success when the browser cannot initiate the download.
    } finally {
      downloadLink.remove();

      if (objectUrl !== null && typeof browserWindow.URL.revokeObjectURL === 'function') {
        browserWindow.URL.revokeObjectURL(objectUrl);
      }
    }
  }

  protected changeSort(column: PaymentSortColumn): void {
    if (this.suppressSortColumn === column) {
      this.suppressSortColumn = null;
      return;
    }

    this.suppressSortColumn = null;
    const currentCriteria = this.sortCriteria();
    const nextCriteria = cyclePaymentSort(currentCriteria, column);

    this.sortCriteria.set(nextCriteria);
    this.requestPayments(() => {
      this.sortAnnouncement.set(this.describeSortAction(column, currentCriteria, nextCriteria));
    });
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

  protected columnWidth(column: PaymentSortColumn): number {
    return this.effectiveColumnWidth(column);
  }

  protected reorderHandleLabel(column: PaymentTableColumn, index: number): string {
    return (
      `Reorder ${column.label} column, position ${index + 1} of ${this.columnOrder().length}. ` +
      'Use the arrow keys to move it, or press and hold the header to drag it.'
    );
  }

  protected resizeHandleLabel(column: PaymentTableColumn): string {
    return `Resize ${column.label} column. Use the left and right arrow keys to adjust its width.`;
  }

  protected onHeaderPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (this.columnResizeState || this.columnDragState) {
      return;
    }

    const headerRow = event.currentTarget as HTMLElement;
    const headerCell = (event.target as HTMLElement | null)?.closest('th');

    if (!headerCell || headerCell.parentElement !== headerRow) {
      return;
    }

    const index = Array.prototype.indexOf.call(headerRow.children, headerCell);
    const column = this.columnOrder()[index];

    if (column === undefined) {
      return;
    }

    this.suppressSortColumn = null;
    this.columnDragState = {
      key: column,
      pointerId: event.pointerId,
      startIndex: index,
      startOrder: this.columnOrder(),
      startX: event.clientX,
      startY: event.clientY,
      headerRow,
      currentIndex: index,
      dragging: false,
    };
    this.clearColumnHoldTimer();
    this.columnHoldTimer = setTimeout(() => this.activateColumnDrag(), COLUMN_REORDER_HOLD_MS);
  }

  protected onHeaderPointerMove(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (!state.dragging) {
      const movement = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);

      if (movement > COLUMN_REORDER_HOLD_MOVE_TOLERANCE) {
        this.clearColumnHoldTimer();
        this.columnDragState = undefined;
      }

      return;
    }

    event.preventDefault();
    this.updateLiveReorder(event.clientX);
  }

  protected onHeaderPointerUp(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (state.dragging) {
      this.finishColumnDrag(true);
      return;
    }

    this.clearColumnHoldTimer();
    this.columnDragState = undefined;
  }

  protected onHeaderPointerCancel(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (state.dragging) {
      this.finishColumnDrag(false);
      return;
    }

    this.clearColumnHoldTimer();
    this.columnDragState = undefined;
  }

  protected onReorderHandlePointerDown(
    event: PointerEvent,
    index: number,
    column: PaymentSortColumn,
  ): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.columnResizeState || this.columnDragState) {
      return;
    }

    const headerRow = (event.currentTarget as HTMLElement).closest('tr');

    if (!headerRow) {
      return;
    }

    this.suppressSortColumn = null;
    this.columnDragState = {
      key: column,
      pointerId: event.pointerId,
      startIndex: index,
      startOrder: this.columnOrder(),
      startX: event.clientX,
      startY: event.clientY,
      headerRow,
      currentIndex: index,
      dragging: false,
    };
    this.activateColumnDrag();
  }

  protected onReorderHandleKeydown(
    event: KeyboardEvent,
    index: number,
    column: PaymentSortColumn,
  ): void {
    const lastIndex = this.columnOrder().length - 1;
    let targetIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = index - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = index + 1;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();

    if (targetIndex < 0 || targetIndex > lastIndex || targetIndex === index) {
      this.announceColumn(
        `${this.columnLabel(column)} is already at position ${index + 1} of ${lastIndex + 1}.`,
      );
      return;
    }

    this.applyColumnMove(index, targetIndex);
  }

  protected onResizePointerDown(event: PointerEvent, column: PaymentSortColumn): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const headerCell = handle.closest('th');
    const startWidth = headerCell
      ? headerCell.getBoundingClientRect().width
      : this.effectiveColumnWidth(column);

    this.columnResizeState = {
      key: column,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
    };
    this.resizingColumn.set(column);

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a best-effort enhancement.
    }
  }

  protected onResizePointerMove(event: PointerEvent): void {
    const state = this.columnResizeState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.setColumnWidth(
      state.key,
      clampColumnWidth(state.startWidth + (event.clientX - state.startX)),
    );
  }

  protected onResizePointerUp(event: PointerEvent): void {
    const state = this.columnResizeState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // The capture may already have been released.
    }

    this.columnResizeState = undefined;
    this.resizingColumn.set(null);
    this.persistColumnWidths();
    this.announceColumn(
      `${this.columnLabel(state.key)} column width set to ${this.effectiveColumnWidth(state.key)} pixels.`,
    );
  }

  protected onResizeKeydown(event: KeyboardEvent, column: PaymentSortColumn): void {
    const step = event.shiftKey ? COLUMN_RESIZE_KEYBOARD_STEP_LARGE : COLUMN_RESIZE_KEYBOARD_STEP;
    const currentWidth = this.effectiveColumnWidth(column);
    let nextWidth = currentWidth;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextWidth = currentWidth - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextWidth = currentWidth + step;
        break;
      case 'Home':
        nextWidth = MIN_COLUMN_WIDTH;
        break;
      case 'End':
        nextWidth = MAX_COLUMN_WIDTH;
        break;
      default:
        return;
    }

    event.preventDefault();
    const clampedWidth = clampColumnWidth(nextWidth);

    if (clampedWidth === currentWidth) {
      return;
    }

    this.setColumnWidth(column, clampedWidth);
    this.persistColumnWidths();
    this.announceColumn(`${this.columnLabel(column)} column width set to ${clampedWidth} pixels.`);
  }

  private activateColumnDrag(): void {
    const state = this.columnDragState;
    this.clearColumnHoldTimer();

    if (!state || state.dragging) {
      return;
    }

    // Capture on the dragged header cell (this reliably establishes capture).
    // The row-level pointer listeners still receive events by bubbling even if
    // capture drops when the cell is moved during a live reorder.
    const cell = state.headerRow.children[state.startIndex] as HTMLElement | undefined;

    if (!cell) {
      this.columnDragState = undefined;
      return;
    }

    try {
      cell.setPointerCapture(state.pointerId);
    } catch {
      this.columnDragState = undefined;
      return;
    }

    if (!cell.hasPointerCapture(state.pointerId)) {
      this.columnDragState = undefined;
      return;
    }

    this.columnDragCaptureCell = cell;
    state.dragging = true;
    this.suppressSortColumn = state.key;
    this.draggingColumn.set(state.key);
    this.announceColumn(
      `Reordering ${this.columnLabel(state.key)} column. Move over another column to reposition it, then release to save.`,
    );
  }

  private updateLiveReorder(clientX: number): void {
    const state = this.columnDragState;

    if (!state) {
      return;
    }

    const cells = Array.from(state.headerRow.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.tagName === 'TH',
    );
    const current = state.currentIndex;

    if (current < 0 || current >= cells.length) {
      return;
    }

    // Swap with a neighbour only once the pointer passes that neighbour's
    // midpoint. Tracking currentIndex keeps the live reorder stable (no jitter).
    if (current < cells.length - 1) {
      const rightRect = cells[current + 1].getBoundingClientRect();

      if (clientX > rightRect.left + rightRect.width / 2) {
        this.moveDraggedColumn(current + 1);
        return;
      }
    }

    if (current > 0) {
      const leftRect = cells[current - 1].getBoundingClientRect();

      if (clientX < leftRect.left + leftRect.width / 2) {
        this.moveDraggedColumn(current - 1);
      }
    }
  }

  private moveDraggedColumn(toIndex: number): void {
    const state = this.columnDragState;

    if (!state) {
      return;
    }

    this.columnOrder.set(moveColumn(this.columnOrder(), state.currentIndex, toIndex));
    state.currentIndex = toIndex;
  }

  private finishColumnDrag(commit: boolean): void {
    const state = this.columnDragState;
    this.clearColumnHoldTimer();

    if (state && this.columnDragCaptureCell) {
      try {
        this.columnDragCaptureCell.releasePointerCapture(state.pointerId);
      } catch {
        // The capture may already have been released.
      }
    }

    this.columnDragCaptureCell = undefined;
    this.columnDragState = undefined;
    this.draggingColumn.set(null);

    if (!state) {
      return;
    }

    if (!commit) {
      // Restore the order captured when the drag began.
      this.columnOrder.set(state.startOrder);
      return;
    }

    if (serializeColumnOrder(this.columnOrder()) === serializeColumnOrder(state.startOrder)) {
      return;
    }

    this.persistColumnOrder();
    const newIndex = this.columnOrder().indexOf(state.key);
    this.announceColumn(
      `${this.columnLabel(state.key)} column moved to position ${newIndex + 1} of ${this.columnOrder().length}.`,
    );
  }

  private applyColumnMove(fromIndex: number, toIndex: number): void {
    const currentOrder = this.columnOrder();
    const key = currentOrder[fromIndex];
    const nextOrder = moveColumn(currentOrder, fromIndex, toIndex);

    if (!key || serializeColumnOrder(nextOrder) === serializeColumnOrder(currentOrder)) {
      return;
    }

    this.columnOrder.set(nextOrder);
    this.persistColumnOrder();
    const newIndex = nextOrder.indexOf(key);
    this.announceColumn(
      `${this.columnLabel(key)} column moved to position ${newIndex + 1} of ${nextOrder.length}.`,
    );
  }

  private effectiveColumnWidth(column: PaymentSortColumn): number {
    return this.columnWidths()[column] ?? PAYMENT_TABLE_COLUMN_MAP.get(column)!.defaultWidth;
  }

  private setColumnWidth(column: PaymentSortColumn, width: number): void {
    this.columnWidths.update((widths) => ({ ...widths, [column]: width }));
  }

  private restoreColumnLayout(browserWindow: Window): void {
    this.columnOrder.set(readStoredColumnOrder(browserWindow));
    this.columnWidths.set(readStoredColumnWidths(browserWindow));
  }

  private persistColumnOrder(): void {
    try {
      this.document.defaultView?.localStorage.setItem(
        COLUMN_ORDER_STORAGE_KEY,
        serializeColumnOrder(this.columnOrder()),
      );
    } catch {
      // Keep column ordering usable when localStorage is unavailable.
    }
  }

  private persistColumnWidths(): void {
    try {
      this.document.defaultView?.localStorage.setItem(
        COLUMN_WIDTHS_STORAGE_KEY,
        serializeColumnWidths(this.columnWidths()),
      );
    } catch {
      // Keep column resizing usable when localStorage is unavailable.
    }
  }

  private clearColumnHoldTimer(): void {
    if (this.columnHoldTimer !== undefined) {
      clearTimeout(this.columnHoldTimer);
      this.columnHoldTimer = undefined;
    }
  }

  private announceColumn(message: string): void {
    this.columnAnnouncement.set(message);
  }

  private columnLabel(column: PaymentSortColumn): string {
    return PAYMENT_SORT_COLUMN_LABELS[column];
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
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      this.filterAnnouncement.set(
        selection === null
          ? `Date range filter cleared. ${paymentCount} found.`
          : `Date range filter applied: ${formatDateRangeLabel(selection)}. ${paymentCount} found.`,
      );
    });
  }

  protected changeStatuses(statuses: readonly PaymentStatus[]): void {
    this.selectedStatuses.set([...statuses]);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      if (statuses.length === 0) {
        this.filterAnnouncement.set(`Status filter cleared. ${paymentCount} found.`);
        return;
      }

      const statusLabel = statuses.map((status) => PAYMENT_STATUS_LABELS[status]).join(', ');
      this.filterAnnouncement.set(`Status filter applied: ${statusLabel}. ${paymentCount} found.`);
    });
  }

  protected changePaymentMethods(paymentMethods: readonly PaymentMethodFilterValue[]): void {
    this.selectedPaymentMethods.set([...paymentMethods]);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      if (paymentMethods.length === 0) {
        this.filterAnnouncement.set(`Payment method filter cleared. ${paymentCount} found.`);
        return;
      }

      const methodLabel = paymentMethods.map(paymentMethodFilterLabel).join(', ');
      this.filterAnnouncement.set(
        `Payment method filter applied: ${methodLabel}. ${paymentCount} found.`,
      );
    });
  }

  protected changeAmountRange(range: AmountRange | null): void {
    this.amountRange.set(range);
    this.requestPayments(() => {
      const paymentCount = this.paymentCountSummary();

      this.filterAnnouncement.set(
        range === null
          ? `Amount range filter cleared. ${paymentCount} found.`
          : `Amount range filter applied: ${formatAmountRangeLabel(range)}. ${paymentCount} found.`,
      );
    });
  }

  protected changeTextSearch(value: string): void {
    this.textSearchInput.set(value);
    this.clearTextSearchTimer();

    if (
      this.isLoading() &&
      serializeTextSearchQuery(parseTextSearchQuery(value)) !==
        serializeTextSearchQuery(this.textSearch())
    ) {
      this.cancelPendingQuery();
    }

    this.textSearchTimer = setTimeout(() => {
      this.textSearchTimer = undefined;
      this.applyTextSearch(value);
    }, TEXT_SEARCH_DEBOUNCE_MS);
  }

  protected clearAllFilters(event: MouseEvent): void {
    this.clearTextSearchTimer();
    this.dateRange.set(null);
    this.selectedStatuses.set([]);
    this.selectedPaymentMethods.set([]);
    this.amountRange.set(null);
    this.textSearchInput.set('');
    this.textSearch.set(null);
    this.requestPayments(() => {
      this.filterAnnouncement.set(
        `All payment filters cleared. ${this.paymentCountSummary()} found.`,
      );
    });

    if (this.shouldFocusTextSearchAfterClean(event)) {
      this.textSearchFilter().focus();
    }
  }

  private startBrowserState(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.restorePageSize(browserWindow);
    this.restoreColumnLayout(browserWindow);
    browserWindow.addEventListener('storage', this.handlePageSizeStorageChange);
    browserWindow.addEventListener('storage', this.handleColumnStorageChange);
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
    if (this.isPendingViewStateWrite()) {
      return;
    }

    const nextCriteria = parsePaymentSort(queryParams.get(SORT_QUERY_PARAM));
    const nextDateRange = parseDateRangeQuery(
      queryParams.get(DATE_RANGE_QUERY_PARAM),
      dateKeyInTimeZone(this.currentTime() ?? Date.now(), this.timeZone()),
    );
    const nextStatuses = parseStatusQuery(queryParams.get(STATUS_QUERY_PARAM));
    const nextPaymentMethods = parsePaymentMethodQuery(queryParams.get(PAYMENT_METHOD_QUERY_PARAM));
    const nextAmountRange = parseAmountRangeQuery(queryParams.get(AMOUNT_RANGE_QUERY_PARAM));
    const nextTextSearch = parseTextSearchQuery(queryParams.get(TEXT_SEARCH_QUERY_PARAM));
    const sortChanged =
      serializePaymentSort(this.sortCriteria()) !== serializePaymentSort(nextCriteria);
    const structuredFiltersChanged =
      serializeDateRangeQuery(this.dateRange()) !== serializeDateRangeQuery(nextDateRange) ||
      serializeStatusQuery(this.selectedStatuses()) !== serializeStatusQuery(nextStatuses) ||
      serializePaymentMethodQuery(this.selectedPaymentMethods()) !==
        serializePaymentMethodQuery(nextPaymentMethods) ||
      serializeAmountRangeQuery(this.amountRange()) !== serializeAmountRangeQuery(nextAmountRange);
    const textSearchChanged =
      serializeTextSearchQuery(this.textSearch()) !== serializeTextSearchQuery(nextTextSearch);
    const filtersChanged = structuredFiltersChanged || textSearchChanged;

    if (sortChanged) {
      this.sortCriteria.set(nextCriteria);
    }

    if (structuredFiltersChanged) {
      this.dateRange.set(nextDateRange);
      this.selectedStatuses.set(nextStatuses);
      this.selectedPaymentMethods.set(nextPaymentMethods);
      this.amountRange.set(nextAmountRange);
    }

    this.clearTextSearchTimer();
    this.textSearch.set(nextTextSearch);
    this.textSearchInput.set(nextTextSearch ?? '');

    const shouldResumeUnappliedView = !this.isLoading() && this.hasUnappliedRequestedViewState();

    if (sortChanged || filtersChanged || shouldResumeUnappliedView) {
      const announceRestoredView = (): void => {
        if (sortChanged) {
          this.sortAnnouncement.set(
            'Sort order restored from the URL. ' + this.describeSortOrder(nextCriteria),
          );
        }

        if (filtersChanged) {
          this.filterAnnouncement.set(
            this.describeRestoredFilters(
              nextDateRange,
              nextStatuses,
              nextPaymentMethods,
              nextAmountRange,
              nextTextSearch,
            ),
          );
        } else if (!sortChanged) {
          this.filterAnnouncement.set(
            `Payment results restored from the URL. ${this.paymentCountSummary()} found.`,
          );
        }
      };

      if (announceRestore) {
        this.requestPayments(announceRestoredView, false);
      } else {
        this.cancelPendingQuery();
        this.currentPage.set(1);
        this.appliedViewState.set(this.captureRequestedViewState());
        this.resetTableScrollPosition();
      }
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
      ) &&
      this.isCanonicalQueryParam(
        queryParams,
        AMOUNT_RANGE_QUERY_PARAM,
        serializeAmountRangeQuery(this.amountRange()),
      ) &&
      this.isCanonicalQueryParam(
        queryParams,
        TEXT_SEARCH_QUERY_PARAM,
        serializeTextSearchQuery(this.textSearch()),
      ) &&
      this.hasCanonicalTextSearchPosition(queryParams)
    );
  }

  private isCanonicalQueryParam(queryParams: ParamMap, key: string, value: string | null): boolean {
    const values = queryParams.getAll(key);
    return value === null ? values.length === 0 : values.length === 1 && values[0] === value;
  }

  private hasCanonicalTextSearchPosition(queryParams: ParamMap): boolean {
    if (this.textSearch() === null) {
      return true;
    }

    return queryParams.keys[queryParams.keys.length - 1] === TEXT_SEARCH_QUERY_PARAM;
  }

  private writeViewStateToUrl(replaceUrl: boolean): void {
    const queryParams: Record<string, string | string[]> = {};
    const currentQueryParams = this.activatedRoute.snapshot.queryParamMap;

    for (const key of currentQueryParams.keys) {
      if (MANAGED_VIEW_QUERY_PARAMS.has(key)) {
        continue;
      }

      const values = currentQueryParams.getAll(key);

      if (values.length > 0) {
        queryParams[key] = values.length === 1 ? values[0] : values;
      }
    }

    this.appendQueryParam(queryParams, SORT_QUERY_PARAM, serializePaymentSort(this.sortCriteria()));
    this.appendQueryParam(
      queryParams,
      DATE_RANGE_QUERY_PARAM,
      serializeDateRangeQuery(this.dateRange()),
    );
    this.appendQueryParam(
      queryParams,
      STATUS_QUERY_PARAM,
      serializeStatusQuery(this.selectedStatuses()),
    );
    this.appendQueryParam(
      queryParams,
      PAYMENT_METHOD_QUERY_PARAM,
      serializePaymentMethodQuery(this.selectedPaymentMethods()),
    );
    this.appendQueryParam(
      queryParams,
      AMOUNT_RANGE_QUERY_PARAM,
      serializeAmountRangeQuery(this.amountRange()),
    );
    this.appendQueryParam(
      queryParams,
      TEXT_SEARCH_QUERY_PARAM,
      serializeTextSearchQuery(this.textSearch()),
    );

    const pendingWrite: PendingViewStateWrite = {
      source: 'payments-table',
    };
    this.pendingViewStateWrites.add(pendingWrite);
    void this.router
      .navigate([], {
        relativeTo: this.activatedRoute,
        queryParams,
        preserveFragment: true,
        replaceUrl,
        info: pendingWrite,
      })
      .then(
        () => this.finishViewStateWrite(pendingWrite),
        () => this.finishViewStateWrite(pendingWrite),
      );
  }

  private appendQueryParam(
    queryParams: Record<string, string | string[]>,
    key: string,
    value: string | null,
  ): void {
    if (value !== null) {
      queryParams[key] = value;
    }
  }

  private isPendingViewStateWrite(): boolean {
    const navigationInfo = this.router.currentNavigation()?.extras.info;
    return this.pendingViewStateWrites.has(navigationInfo as PendingViewStateWrite);
  }

  private finishViewStateWrite(pendingWrite: PendingViewStateWrite): void {
    this.pendingViewStateWrites.delete(pendingWrite);
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

  private applyTextSearch(value: string): void {
    const nextTextSearch = parseTextSearchQuery(value);
    const textSearchChanged =
      serializeTextSearchQuery(this.textSearch()) !== serializeTextSearchQuery(nextTextSearch);

    if (!textSearchChanged && !this.hasUnappliedRequestedViewState()) {
      return;
    }

    if (textSearchChanged) {
      this.textSearch.set(nextTextSearch);
    }

    this.requestPayments(() => {
      if (textSearchChanged) {
        const action = nextTextSearch === null ? 'cleared' : `applied: ${nextTextSearch}`;
        this.filterAnnouncement.set(
          `Text search filter ${action}. ${this.paymentCountSummary()} found.`,
        );
        return;
      }

      this.filterAnnouncement.set(`Payment results updated. ${this.paymentCountSummary()} found.`);
    });
  }

  private captureRequestedViewState(): PaymentViewState {
    return {
      sortCriteria: [...this.sortCriteria()],
      dateRange: this.dateRange(),
      selectedStatuses: [...this.selectedStatuses()],
      selectedPaymentMethods: [...this.selectedPaymentMethods()],
      amountRange: this.amountRange(),
      textSearch: this.textSearch(),
    };
  }

  private hasUnappliedRequestedViewState(): boolean {
    return (
      this.paymentViewStateSignature(this.captureRequestedViewState()) !==
      this.paymentViewStateSignature(this.appliedViewState())
    );
  }

  private paymentViewStateSignature(viewState: PaymentViewState): string {
    return JSON.stringify([
      serializePaymentSort(viewState.sortCriteria),
      serializeDateRangeQuery(viewState.dateRange),
      serializeStatusQuery(viewState.selectedStatuses),
      serializePaymentMethodQuery(viewState.selectedPaymentMethods),
      serializeAmountRangeQuery(viewState.amountRange),
      serializeTextSearchQuery(viewState.textSearch),
    ]);
  }

  private requestPayments(announceResult: () => void, writeUrl = true): void {
    const requestedViewState = this.captureRequestedViewState();

    this.cancelPendingQuery();
    const requestId = ++this.queryRequestId;
    this.isLoading.set(true);
    this.sortAnnouncement.set('');
    this.filterAnnouncement.set('');

    const applyResponse = (): void => {
      if (requestId !== this.queryRequestId) {
        return;
      }

      this.queryTimer = undefined;
      this.currentPage.set(1);
      this.appliedViewState.set(requestedViewState);
      this.isLoading.set(false);
      this.resetTableScrollPosition();
      announceResult();

      if (writeUrl) {
        this.writeViewStateToUrl(false);
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

    this.isLoading.set(false);
  }

  private resetTableScrollPosition(): void {
    const tableScroll = this.tableScroll()?.nativeElement;

    if (tableScroll) {
      tableScroll.scrollTop = 0;
    }
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

  private shouldFocusTextSearchAfterClean(event: MouseEvent): boolean {
    if (event.detail === 0) {
      return true;
    }

    return !this.document.defaultView?.matchMedia?.('(any-pointer: coarse)').matches;
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

  private showExportSuccess(paymentCount: number): void {
    this.clearExportToastTimer();
    const toastId = ++this.exportToastId;
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    this.exportToasts.set([
      {
        id: toastId,
        message: `CSV export completed successfully. ${paymentCount} ${paymentLabel} exported.`,
      },
    ]);
    this.exportToastTimer = setTimeout(() => {
      if (this.exportToasts()[0]?.id === toastId) {
        this.exportToasts.set([]);
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
}
