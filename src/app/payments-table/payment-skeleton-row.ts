import { Component, input } from '@angular/core';
import { PAYMENT_COLUMN_KEYS } from './payment-columns';
import type { PaymentTableColumnKey } from './payment-table-column';

@Component({
  selector: 'tr[appPaymentSkeletonRow]',
  template: `
    @for (columnKey of columnOrder(); track columnKey) {
      @switch (columnKey) {
        @case ('paymentId') {
          <td data-column="paymentId">
            <div class="skeleton-payment-id">
              <span class="skeleton-shape skeleton-payment-id__value"></span>
              <span class="skeleton-copy" aria-hidden="true">
                <span class="skeleton-copy__icon"></span>
                <span class="skeleton-copy__label"></span>
              </span>
            </div>
          </td>
        }
        @case ('customer') {
          <td data-column="customer">
            <span class="skeleton-shape skeleton-customer"></span>
          </td>
        }
        @case ('amount') {
          <td data-column="amount">
            <div class="skeleton-amount">
              <span class="skeleton-shape skeleton-amount__value"></span>
              <span class="skeleton-shape skeleton-amount__currency"></span>
            </div>
          </td>
        }
        @case ('status') {
          <td data-column="status">
            <span class="skeleton-shape skeleton-status">
              <span class="skeleton-status__label"></span>
              <span class="skeleton-status__dot"></span>
            </span>
          </td>
        }
        @case ('paymentMethod') {
          <td data-column="paymentMethod">
            <div class="skeleton-payment-method">
              <span class="skeleton-payment-method__icons">
                <span class="skeleton-shape skeleton-payment-method__icon"></span>
                <span
                  class="skeleton-shape skeleton-payment-method__icon skeleton-payment-method__icon--secondary"
                ></span>
              </span>
              <span class="skeleton-payment-method__reference">
                <span class="skeleton-shape"></span>
              </span>
            </div>
          </td>
        }
        @case ('created') {
          <td data-column="created">
            <div class="skeleton-created">
              <span class="skeleton-shape skeleton-created__date"></span>
              <span class="skeleton-shape skeleton-created__time"></span>
            </div>
          </td>
        }
      }
    }
  `,
  styleUrl: './payment-skeleton-row.css',
  host: {
    class: 'payment-skeleton-row',
    'aria-hidden': 'true',
  },
})
export class PaymentSkeletonRow {
  readonly columnOrder = input<readonly PaymentTableColumnKey[]>(PAYMENT_COLUMN_KEYS);
}
