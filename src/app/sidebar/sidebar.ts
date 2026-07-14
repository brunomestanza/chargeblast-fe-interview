import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, type IsActiveMatchOptions } from '@angular/router';
import { AccountSwitcher } from './account-switcher/account-switcher';
import { DashboardIcon } from './dashboard-icon';

@Component({
  selector: 'app-sidebar',
  imports: [AccountSwitcher, DashboardIcon, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  protected readonly routeMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
}
