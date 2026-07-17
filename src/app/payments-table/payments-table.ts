import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { EditColumnsButton } from './edit-columns-button/edit-columns-button';
import { ExportPaymentsButton } from './export-payments-button/export-payments-button';
import { ExportSuccessToast } from './export-success-toast/export-success-toast';
import { AmountRangeFilter } from './filters/amount-range-filter/amount-range-filter';
import { CleanFiltersButton } from './filters/clean-filters-button/clean-filters-button';
import { DateRangeFilter } from './filters/date-range-filter/date-range-filter';
import { PaymentMethodFilter } from './filters/payment-method-filter/payment-method-filter';
import { StatusFilter } from './filters/status-filter/status-filter';
import { TextSearchFilter } from './filters/text-search-filter/text-search-filter';
import { PaymentClipboardAdapter } from './payment-clipboard.adapter';
import { PaymentColumnLayoutController } from './payment-column-layout.controller';
import { PaymentCsvDownloadAdapter } from './payment-csv-download.adapter';
import type { Payment } from '../payments/payment';
import { PaymentQueryLifecycleController } from './payment-query-lifecycle.controller';
import { PaymentTablePreferencesAdapter, isPageSize } from './payment-table-preferences.adapter';
import { PaymentTableFeedbackController } from './payment-table-feedback.controller';
import { PaymentTableViewportController } from './payment-table-viewport.controller';
import { PaymentViewUrlAdapter } from './payment-view-url.adapter';
import { PaymentRow } from './payment-row';
import { PaymentSkeletonRow } from './payment-skeleton-row';
import { PaymentStatusSummary } from './payment-status-summary/payment-status-summary';
import type { PaymentSortColumn } from './payment-sort.contract';
import { PaymentsTableFacade } from './payments-table.facade';

export { TEXT_SEARCH_DEBOUNCE_MS } from './payments-table.facade';

@Component({
  selector: 'app-payments-table',
  imports: [
    DateRangeFilter,
    StatusFilter,
    PaymentMethodFilter,
    AmountRangeFilter,
    TextSearchFilter,
    CleanFiltersButton,
    EditColumnsButton,
    ExportPaymentsButton,
    ExportSuccessToast,
    PaymentStatusSummary,
    PaymentRow,
    PaymentSkeletonRow,
  ],
  providers: [
    PaymentClipboardAdapter,
    PaymentColumnLayoutController,
    PaymentCsvDownloadAdapter,
    PaymentQueryLifecycleController,
    PaymentTableFeedbackController,
    PaymentTablePreferencesAdapter,
    PaymentTableViewportController,
    PaymentViewUrlAdapter,
    PaymentsTableFacade,
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
  private readonly router = inject(Router);

  readonly payments = input.required<readonly Payment[]>();

  protected readonly view = inject(PaymentsTableFacade);
  protected readonly columns = inject(PaymentColumnLayoutController);
  protected readonly viewport = inject(PaymentTableViewportController);

  private readonly textSearchFilter = viewChild.required(TextSearchFilter);
  private readonly tableScroll = viewChild.required<ElementRef<HTMLElement>>('tableScroll');

  constructor() {
    effect(() => this.view.setPayments(this.payments()));
    this.view.setViewEffects({
      resetScrollPosition: () => this.viewport.resetScrollPosition(),
      updateSkeletonLayout: () => this.viewport.measure(),
    });

    afterNextRender(() => {
      this.view.startBrowserState();
      this.columns.start();
      this.viewport.start(this.tableScroll().nativeElement);
    });
  }

  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set<string>());

  protected readonly pageAllSelected = computed(() => {
    const rows = this.view.paginatedPayments();
    const selected = this.selectedIds();
    return rows.length > 0 && rows.every((payment) => selected.has(payment.id));
  });

  protected readonly pageSomeSelected = computed(() => {
    const rows = this.view.paginatedPayments();
    const selected = this.selectedIds();
    return rows.some((payment) => selected.has(payment.id)) && !this.pageAllSelected();
  });

  protected isRowSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleRowSelection(id: string): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected toggleSelectAllOnPage(): void {
    const rows = this.view.paginatedPayments();
    const shouldDeselect = this.pageAllSelected();
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const payment of rows) {
        if (shouldDeselect) {
          next.delete(payment.id);
        } else {
          next.add(payment.id);
        }
      }
      return next;
    });
  }

  protected changeSort(column: PaymentSortColumn): void {
    this.view.changeSort(column);
  }

  protected changePageSize(event: Event): void {
    const pageSize = Number((event.target as HTMLSelectElement).value);

    if (isPageSize(pageSize)) {
      this.view.changePageSize(pageSize);
    }
  }

  protected clearAllFilters(event: MouseEvent): void {
    this.view.clearAllFilters();

    if (this.shouldFocusTextSearchAfterClean(event)) {
      this.textSearchFilter().focus();
    }
  }

  protected openPaymentDetails(paymentId: string): void {
    void this.router.navigate(['/payments', paymentId], { queryParamsHandling: 'preserve' });
  }

  private shouldFocusTextSearchAfterClean(event: MouseEvent): boolean {
    if (event.detail === 0) {
      return true;
    }

    return !this.document.defaultView?.matchMedia?.('(any-pointer: coarse)').matches;
  }
}
