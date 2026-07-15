import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentMethodIcon } from '../payments/payment-method-icon';
import { PAYMENT_DETAILS_DATA, type PaymentDetailsData } from './payment-details.data';

@Component({
  selector: 'app-payment-details-page',
  imports: [RouterLink, PaymentMethodIcon],
  templateUrl: './payment-details-page.html',
  styleUrls: ['./payment-details-page.css', './payment-details-content.css'],
})
export class PaymentDetailsPage {
  protected readonly details: PaymentDetailsData = PAYMENT_DETAILS_DATA;
}
