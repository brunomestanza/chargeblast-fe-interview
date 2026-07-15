import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import {
  getPaymentIconDefinition,
  humanizePaymentIconKey,
  paymentIconFallbackText,
  type PaymentIconCategory,
} from './payment-method-icon.catalog';

export type { PaymentIconCategory } from './payment-method-icon.catalog';

@Component({
  selector: 'app-payment-method-icon',
  imports: [NgOptimizedImage],
  template: `
    <span
      class="payment-icon__trigger"
      [class.payment-icon__trigger--fallback]="source() === null"
      role="img"
      [attr.aria-label]="label()"
    >
      @if (source(); as iconSource) {
        <span class="payment-icon__image">
          <img [ngSrc]="iconSource" fill alt="" />
        </span>
      } @else {
        <span aria-hidden="true">{{ fallbackText() }}</span>
      }
    </span>
    <span class="payment-icon__tooltip" aria-hidden="true">
      {{ label() }}
    </span>
  `,
  styleUrl: './payment-method-icon.css',
})
export class PaymentMethodIcon {
  readonly category = input.required<PaymentIconCategory>();
  readonly iconKey = input.required<string>();

  private readonly definition = computed(() =>
    getPaymentIconDefinition(this.category(), this.iconKey()),
  );

  protected readonly source = computed(() => this.definition()?.source ?? null);
  protected readonly label = computed(
    () => this.definition()?.label ?? humanizePaymentIconKey(this.iconKey()),
  );
  protected readonly fallbackText = computed(() => paymentIconFallbackText(this.label()));
}
