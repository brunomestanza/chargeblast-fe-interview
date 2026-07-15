import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payments-page-header',
  imports: [RouterLink],
  templateUrl: './payments-page-header.html',
  styleUrls: ['./payments-page-header.css', './payments-page-header-interactions.css'],
})
export class PaymentsPageHeader {
  protected readonly isInvoiceSuggestionVisible = signal(true);

  protected dismissInvoiceSuggestion(): void {
    this.isInvoiceSuggestionVisible.set(false);
  }
}
