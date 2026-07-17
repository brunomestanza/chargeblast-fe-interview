import { DestroyRef, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, type ParamMap } from '@angular/router';
import { filter, take } from 'rxjs';
import {
  AMOUNT_RANGE_QUERY_PARAM,
  CURRENCY_QUERY_PARAM,
  DATE_RANGE_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  TEXT_SEARCH_QUERY_PARAM,
  parseAmountRangeQuery,
  parseCurrencyQuery,
  parseDateRangeQuery,
  parsePaymentMethodQuery,
  parseStatusQuery,
  parseTextSearchQuery,
  serializeAmountRangeQuery,
  serializeCurrencyQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
  serializeTextSearchQuery,
} from './payment-filter-query';
import { parsePaymentSort, serializePaymentSort } from './payment-sort.query-codec';
import type { PaymentViewState } from './payment-view-state';

export const SORT_QUERY_PARAM = 'sort';

const MANAGED_VIEW_QUERY_PARAMS = new Set([
  SORT_QUERY_PARAM,
  DATE_RANGE_QUERY_PARAM,
  STATUS_QUERY_PARAM,
  PAYMENT_METHOD_QUERY_PARAM,
  CURRENCY_QUERY_PARAM,
  AMOUNT_RANGE_QUERY_PARAM,
  TEXT_SEARCH_QUERY_PARAM,
]);

interface PendingViewStateWrite {
  readonly source: 'payment-view-url-adapter';
}

export interface PaymentViewUrlChange {
  readonly viewState: PaymentViewState;
  readonly announceRestore: boolean;
}

export interface PaymentViewUrlBinding {
  readonly today: () => string;
  readonly applyViewState: (change: PaymentViewUrlChange) => void;
}

export interface PaymentViewUrlWriteOptions {
  readonly replaceUrl?: boolean;
}

export function parsePaymentViewQuery(queryParams: ParamMap, today: string): PaymentViewState {
  return {
    sortCriteria: parsePaymentSort(queryParams.get(SORT_QUERY_PARAM)),
    dateRange: parseDateRangeQuery(queryParams.get(DATE_RANGE_QUERY_PARAM), today),
    selectedStatuses: parseStatusQuery(queryParams.get(STATUS_QUERY_PARAM)),
    selectedPaymentMethods: parsePaymentMethodQuery(queryParams.get(PAYMENT_METHOD_QUERY_PARAM)),
    selectedCurrencies: parseCurrencyQuery(queryParams.get(CURRENCY_QUERY_PARAM)),
    amountRange: parseAmountRangeQuery(queryParams.get(AMOUNT_RANGE_QUERY_PARAM)),
    textSearch: parseTextSearchQuery(queryParams.get(TEXT_SEARCH_QUERY_PARAM)),
  };
}

export function hasCanonicalPaymentViewQuery(
  queryParams: ParamMap,
  viewState: PaymentViewState,
): boolean {
  return (
    isCanonicalQueryParam(
      queryParams,
      SORT_QUERY_PARAM,
      serializePaymentSort(viewState.sortCriteria),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      DATE_RANGE_QUERY_PARAM,
      serializeDateRangeQuery(viewState.dateRange),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      STATUS_QUERY_PARAM,
      serializeStatusQuery(viewState.selectedStatuses),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      PAYMENT_METHOD_QUERY_PARAM,
      serializePaymentMethodQuery(viewState.selectedPaymentMethods),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      CURRENCY_QUERY_PARAM,
      serializeCurrencyQuery(viewState.selectedCurrencies),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      AMOUNT_RANGE_QUERY_PARAM,
      serializeAmountRangeQuery(viewState.amountRange),
    ) &&
    isCanonicalQueryParam(
      queryParams,
      TEXT_SEARCH_QUERY_PARAM,
      serializeTextSearchQuery(viewState.textSearch),
    ) &&
    hasCanonicalTextSearchPosition(queryParams, viewState.textSearch)
  );
}

@Service({ autoProvided: false })
export class PaymentViewUrlAdapter {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly pendingWrites = new Set<PendingViewStateWrite>();
  private binding: PaymentViewUrlBinding | undefined;
  private connected = false;
  private urlSyncReady = false;

  connect(binding: PaymentViewUrlBinding): void {
    if (this.connected) {
      throw new Error('The payment view URL adapter can only be connected once.');
    }

    this.connected = true;
    this.binding = binding;
    this.applyQueryParams(this.activatedRoute.snapshot.queryParamMap, false);

    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queryParams) => this.applyQueryParams(queryParams));

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

  write(viewState: PaymentViewState, options: PaymentViewUrlWriteOptions = {}): void {
    const queryParams = this.createQueryParams(viewState);
    const pendingWrite: PendingViewStateWrite = {
      source: 'payment-view-url-adapter',
    };

    this.pendingWrites.add(pendingWrite);
    void this.router
      .navigate([], {
        relativeTo: this.activatedRoute,
        queryParams,
        preserveFragment: true,
        replaceUrl: options.replaceUrl ?? false,
        info: pendingWrite,
      })
      .then(
        () => this.pendingWrites.delete(pendingWrite),
        () => this.pendingWrites.delete(pendingWrite),
      );
  }

  private enableUrlSync(): void {
    this.urlSyncReady = true;
    this.applyQueryParams(this.activatedRoute.snapshot.queryParamMap, false);
  }

  private applyQueryParams(queryParams: ParamMap, announceRestore = this.urlSyncReady): void {
    const binding = this.binding;

    if (!binding || this.isPendingWrite()) {
      return;
    }

    const viewState = parsePaymentViewQuery(queryParams, binding.today());
    binding.applyViewState({ viewState, announceRestore });

    if (this.urlSyncReady && !hasCanonicalPaymentViewQuery(queryParams, viewState)) {
      this.write(viewState, { replaceUrl: true });
    }
  }

  private createQueryParams(viewState: PaymentViewState): Record<string, string | string[]> {
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

    appendQueryParam(queryParams, SORT_QUERY_PARAM, serializePaymentSort(viewState.sortCriteria));
    appendQueryParam(
      queryParams,
      DATE_RANGE_QUERY_PARAM,
      serializeDateRangeQuery(viewState.dateRange),
    );
    appendQueryParam(
      queryParams,
      STATUS_QUERY_PARAM,
      serializeStatusQuery(viewState.selectedStatuses),
    );
    appendQueryParam(
      queryParams,
      PAYMENT_METHOD_QUERY_PARAM,
      serializePaymentMethodQuery(viewState.selectedPaymentMethods),
    );
    appendQueryParam(
      queryParams,
      CURRENCY_QUERY_PARAM,
      serializeCurrencyQuery(viewState.selectedCurrencies),
    );
    appendQueryParam(
      queryParams,
      AMOUNT_RANGE_QUERY_PARAM,
      serializeAmountRangeQuery(viewState.amountRange),
    );
    appendQueryParam(
      queryParams,
      TEXT_SEARCH_QUERY_PARAM,
      serializeTextSearchQuery(viewState.textSearch),
    );

    return queryParams;
  }

  private isPendingWrite(): boolean {
    const navigationInfo = this.router.currentNavigation()?.extras.info;
    return this.pendingWrites.has(navigationInfo as PendingViewStateWrite);
  }
}

function appendQueryParam(
  queryParams: Record<string, string | string[]>,
  key: string,
  value: string | null,
): void {
  if (value !== null) {
    queryParams[key] = value;
  }
}

function isCanonicalQueryParam(queryParams: ParamMap, key: string, value: string | null): boolean {
  const values = queryParams.getAll(key);
  return value === null ? values.length === 0 : values.length === 1 && values[0] === value;
}

function hasCanonicalTextSearchPosition(queryParams: ParamMap, textSearch: string | null): boolean {
  if (textSearch === null) {
    return true;
  }

  return queryParams.keys[queryParams.keys.length - 1] === TEXT_SEARCH_QUERY_PARAM;
}
