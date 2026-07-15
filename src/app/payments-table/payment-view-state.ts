import type { AmountRange } from './filters/amount-range-filter/amount-range';
import type { DateRangeSelection } from './filters/date-range-filter/date-range';
import type { PaymentMethodFilterValue } from './filters/payment-method-filter/payment-method-filter-options.mock';
import type { PaymentStatus } from './payment';
import {
  serializeAmountRangeQuery,
  serializeDateRangeQuery,
  serializePaymentMethodQuery,
  serializeStatusQuery,
  serializeTextSearchQuery,
} from './payment-filter-query';
import {
  DEFAULT_PAYMENT_SORT,
  serializePaymentSort,
  type PaymentSortCriterion,
} from './payment-sort';

export interface PaymentViewState {
  readonly sortCriteria: readonly PaymentSortCriterion[];
  readonly dateRange: DateRangeSelection | null;
  readonly selectedStatuses: readonly PaymentStatus[];
  readonly selectedPaymentMethods: readonly PaymentMethodFilterValue[];
  readonly amountRange: AmountRange | null;
  readonly textSearch: string | null;
}

export const INITIAL_PAYMENT_VIEW_STATE: PaymentViewState = {
  sortCriteria: DEFAULT_PAYMENT_SORT,
  dateRange: null,
  selectedStatuses: [],
  selectedPaymentMethods: [],
  amountRange: null,
  textSearch: null,
};

export function paymentViewStateSignature(viewState: PaymentViewState): string {
  return JSON.stringify([
    serializePaymentSort(viewState.sortCriteria),
    serializeDateRangeQuery(viewState.dateRange),
    serializeStatusQuery(viewState.selectedStatuses),
    serializePaymentMethodQuery(viewState.selectedPaymentMethods),
    serializeAmountRangeQuery(viewState.amountRange),
    serializeTextSearchQuery(viewState.textSearch),
  ]);
}
