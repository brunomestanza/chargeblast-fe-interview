import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  type IsActiveMatchOptions,
} from '@angular/router';
import { filter } from 'rxjs';
import { AccountSwitcher } from './account-switcher/account-switcher';
import { DashboardIcon } from './dashboard-icon';
import type { DashboardIconName } from './dashboard-icon.types';

interface SidebarShortcut {
  readonly label: string;
  readonly icon: DashboardIconName;
}

@Component({
  selector: 'app-sidebar',
  imports: [AccountSwitcher, DashboardIcon, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly transactionsRouteActive = signal(this.isTransactionsUrl(this.router.url));
  protected readonly routeMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /* Stripe pins one shortcut and lists the rest as recently visited, which is why
     only the first of these carries the pin glyph. */
  protected readonly shortcuts: readonly SidebarShortcut[] = [
    { label: 'Payments analytics', icon: 'pin' },
    { label: 'Reports', icon: 'clock' },
    { label: 'Sigma', icon: 'clock' },
    { label: 'Radar', icon: 'clock' },
  ];

  protected readonly products: readonly SidebarShortcut[] = [
    { label: 'Connect', icon: 'layers' },
    { label: 'Payments', icon: 'wallet' },
    { label: 'Billing', icon: 'receipt' },
    { label: 'Reporting', icon: 'reporting' },
    { label: 'More', icon: 'more' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) =>
        this.transactionsRouteActive.set(this.isTransactionsUrl(event.urlAfterRedirects)),
      );
  }

  private isTransactionsUrl(url: string): boolean {
    const path = url.split(/[?#]/)[0] ?? '';
    return path === '/' || path.startsWith('/payments/');
  }
}
