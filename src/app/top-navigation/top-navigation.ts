import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, type IsActiveMatchOptions } from '@angular/router';
import { DashboardIcon } from '../sidebar/dashboard-icon';

@Component({
  selector: 'app-top-navigation',
  imports: [DashboardIcon, RouterLink, RouterLinkActive],
  templateUrl: './top-navigation.html',
  styleUrl: './top-navigation.css',
})
export class TopNavigation {
  protected readonly routeMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
}
