import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from '../dashboard-icon';

export const CURRENT_COMPANY = 'Chargeblast';

/**
 * Stripe letters its account avatars from the name: one initial in the 24px
 * marks, up to two in the 32px one.
 */
export function companyInitials(name: string, max = 1): string {
  return name
    .split(/\s+/)
    .filter((word) => /\p{Letter}|\p{Number}/u.test(word))
    .slice(0, max)
    .map((word) => [...word][0]?.toLocaleUpperCase('en-US') ?? '')
    .join('');
}

@Component({
  selector: 'app-account-switcher',
  imports: [DashboardIcon, RouterLink],
  templateUrl: './account-switcher.html',
  styleUrl: './account-switcher.css',
  host: {
    '(document:pointerdown)': 'handleDocumentPointerDown($event)',
    '(document:keydown)': 'handleDocumentKeydown($event)',
  },
})
export class AccountSwitcher {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('accountTrigger');

  protected readonly currentCompany = CURRENT_COMPANY;
  protected readonly currentCompanyInitial = companyInitials(CURRENT_COMPANY);
  protected readonly currentCompanyInitials = companyInitials(CURRENT_COMPANY, 2);

  protected readonly isOpen = signal(false);

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.isOpen.set(true);
  }

  protected close(restoreFocus = false): void {
    if (!this.isOpen()) {
      return;
    }

    this.isOpen.set(false);

    if (restoreFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  protected handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;

    if (
      this.isOpen() &&
      nextTarget instanceof Node &&
      !this.element.nativeElement.contains(nextTarget)
    ) {
      this.close();
    }
  }

  protected handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target;

    if (this.isOpen() && target instanceof Node && !this.element.nativeElement.contains(target)) {
      this.close();
    }
  }

  protected handleDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isOpen() || event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    this.close(true);
  }
}
