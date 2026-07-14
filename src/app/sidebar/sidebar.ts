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

@Component({
  selector: 'app-sidebar',
  imports: [AccountSwitcher, DashboardIcon, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly paymentsRouteActive = signal(this.isPaymentsUrl(this.router.url));
  protected readonly routeMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) =>
        this.paymentsRouteActive.set(this.isPaymentsUrl(event.urlAfterRedirects)),
      );
  }

  private isPaymentsUrl(url: string): boolean {
    const path = url.split(/[?#]/)[0] ?? '';
    return path === '/' || path.startsWith('/payments/');
  }
}
