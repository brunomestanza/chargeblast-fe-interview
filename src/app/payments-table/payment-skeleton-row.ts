import { Component, input } from '@angular/core';
import { PAYMENT_COLUMN_KEYS } from './payment-columns';
import type { PaymentTableColumnKey } from './payment-table-column';

@Component({
  selector: 'tr[appPaymentSkeletonRow]',
  template: `
    <td class="select-cell" data-column="select">
      <span class="skeleton-shape skeleton-select"></span>
    </td>

    @for (columnKey of columnOrder(); track columnKey) {
      @switch (columnKey) {
        @case ('amount') {
          <td data-column="amount">
            <div class="skeleton-amount">
              <span class="skeleton-shape skeleton-amount__value"></span>
              <span class="skeleton-shape skeleton-amount__currency"></span>
              <span class="skeleton-shape skeleton-status">
                <span class="skeleton-status__label"></span>
                <span class="skeleton-status__dot"></span>
              </span>
            </div>
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
        @case ('description') {
          <td data-column="description">
            <span class="skeleton-shape skeleton-description"></span>
          </td>
        }
        @case ('customer') {
          <td data-column="customer">
            <span class="skeleton-shape skeleton-customer"></span>
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
        @case ('refundedDate') {
          <td data-column="refundedDate">
            <span class="skeleton-shape skeleton-muted"></span>
          </td>
        }
        @case ('declineReason') {
          <td data-column="declineReason">
            <span class="skeleton-shape skeleton-muted"></span>
          </td>
        }
      }
    }

    <td class="row-menu-cell" data-column="menu">
      <span class="skeleton-shape skeleton-menu"></span>
    </td>
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
