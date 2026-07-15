import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardIcon } from '../sidebar/dashboard-icon';
import { SETTINGS_SECTIONS } from './settings-page.data';

export { SETTINGS_SECTIONS } from './settings-page.data';

@Component({
  selector: 'app-settings-page',
  imports: [DashboardIcon, RouterLink],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage {
  protected readonly sections = SETTINGS_SECTIONS;
}
