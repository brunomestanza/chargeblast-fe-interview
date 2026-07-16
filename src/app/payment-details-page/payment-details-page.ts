import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentClipboardAdapter } from '../payments-table/payment-clipboard.adapter';
import { PaymentMethodIcon } from '../payments/payment-method-icon';
import { PAYMENT_DETAILS_DATA, type PaymentDetailsData } from './payment-details.data';

type RiskTab = 'factors' | 'scores';

@Component({
  selector: 'app-payment-details-page',
  imports: [RouterLink, PaymentMethodIcon],
  templateUrl: './payment-details-page.html',
  styleUrls: [
    './payment-details-page.css',
    './payment-details-content.css',
    './payment-details-responsive.css',
  ],
  providers: [PaymentClipboardAdapter],
  host: {
    '(document:click)': 'handleDocumentClick($event)',
    '(document:keydown.escape)': 'closeActionsMenu(true)',
  },
})
export class PaymentDetailsPage {
  protected readonly details: PaymentDetailsData = PAYMENT_DETAILS_DATA;
  protected readonly riskTab = signal<RiskTab>('factors');
  protected readonly actionsMenuOpen = signal(false);
  protected readonly copyAnnouncement = signal('');
  protected readonly riskPanelLabelledBy = computed(() => `risk-tab-${this.riskTab()}`);
  protected readonly riskPanelMessage = computed(() =>
    this.riskTab() === 'factors'
      ? 'Risk insights are only available for live mode data.'
      : `This payment has a ${this.details.riskEvaluation.toLowerCase()} risk evaluation.`,
  );
  private readonly actionsMenuRoot = viewChild<ElementRef<HTMLElement>>('actionsMenuRoot');
  private readonly actionsMenuTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('actionsMenuTrigger');
  private readonly riskFactorsTab = viewChild<ElementRef<HTMLButtonElement>>('riskFactorsTab');
  private readonly riskScoresTab = viewChild<ElementRef<HTMLButtonElement>>('riskScoresTab');
  private readonly clipboard = inject(PaymentClipboardAdapter);

  protected selectRiskTab(tab: RiskTab): void {
    this.riskTab.set(tab);
  }

  protected handleRiskTabKeydown(event: KeyboardEvent): void {
    let nextTab: RiskTab | undefined;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'Home') {
      nextTab = 'factors';
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'End') {
      nextTab = 'scores';
    }

    if (!nextTab) {
      return;
    }

    event.preventDefault();
    this.selectRiskTab(nextTab);
    const tab = nextTab === 'factors' ? this.riskFactorsTab() : this.riskScoresTab();
    tab?.nativeElement.focus();
  }

  protected toggleActionsMenu(): void {
    this.actionsMenuOpen.update((open) => !open);
  }

  protected closeActionsMenu(returnFocus = false): void {
    if (!this.actionsMenuOpen()) {
      return;
    }

    this.actionsMenuOpen.set(false);

    if (returnFocus) {
      this.actionsMenuTrigger()?.nativeElement.focus();
    }
  }

  protected handleDocumentClick(event: MouseEvent): void {
    const root = this.actionsMenuRoot()?.nativeElement;

    if (this.actionsMenuOpen() && root && event.target && !root.contains(event.target as Node)) {
      this.closeActionsMenu();
    }
  }

  protected copyValue(value: string, label: string): void {
    const result = this.clipboard.writeText(value);

    void Promise.resolve(result).then((copied) => {
      const message = copied ? `${label} copied.` : `Could not copy ${label}.`;
      this.copyAnnouncement.set('');
      setTimeout(() => this.copyAnnouncement.set(message));
    });
  }
}
