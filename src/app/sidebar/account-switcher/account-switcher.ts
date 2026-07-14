import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from '../dashboard-icon';

export interface CompanyOption {
  readonly name: string;
  readonly tone: 'lime' | 'midnight' | 'violet';
  readonly current?: boolean;
}

export const COMPANY_OPTIONS: readonly CompanyOption[] = [
  { name: 'AdroCard, Inc', tone: 'midnight' },
  { name: 'Chargeblast', tone: 'violet', current: true },
  { name: 'Jazzify', tone: 'lime' },
];

export function filterCompaniesByPrefix(
  companies: readonly CompanyOption[],
  query: string,
): readonly CompanyOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');

  if (normalizedQuery.length === 0) {
    return companies;
  }

  return companies.filter((company) =>
    company.name.toLocaleLowerCase('en-US').startsWith(normalizedQuery),
  );
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('accountTrigger');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('companySearch');
  private focusTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly isOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly companies = computed(() =>
    filterCompaniesByPrefix(COMPANY_OPTIONS, this.searchQuery()),
  );
  protected readonly companyResultLabel = computed(() => {
    const count = this.companies().length;

    if (count === 0) {
      return 'No companies found.';
    }

    return count === 1 ? '1 company found.' : `${count} companies found.`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearFocusTimer());
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.searchQuery.set('');
    this.isOpen.set(true);
    this.focusSearchForFinePointer();
  }

  protected close(restoreFocus = false): void {
    if (!this.isOpen()) {
      return;
    }

    this.clearFocusTimer();
    this.searchQuery.set('');
    this.isOpen.set(false);

    if (restoreFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  protected updateSearch(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.searchQuery.set(target.value);
    }
  }

  protected companyAriaLabel(company: CompanyOption): string {
    return company.current ? `${company.name}, current company` : company.name;
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

  private focusSearchForFinePointer(): void {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    this.clearFocusTimer();
    this.focusTimer = setTimeout(() => {
      this.focusTimer = undefined;
      this.searchInput()?.nativeElement.focus();
    });
  }

  private clearFocusTimer(): void {
    if (this.focusTimer !== undefined) {
      clearTimeout(this.focusTimer);
      this.focusTimer = undefined;
    }
  }
}
