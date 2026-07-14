import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentMethodIcon } from '../payments-table/payment-method-icon';
import { PAYMENT_DETAILS_FIXTURE, type PaymentDetailsFixture } from './payment-details.mock';

@Component({
  selector: 'app-payment-details-page',
  imports: [RouterLink, PaymentMethodIcon],
  templateUrl: './payment-details-page.html',
  styleUrls: ['./payment-details-page.css', './payment-details-content.css'],
})
export class PaymentDetailsPage {
  protected readonly details: PaymentDetailsFixture = PAYMENT_DETAILS_FIXTURE;
}
