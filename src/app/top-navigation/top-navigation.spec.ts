import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TopNavigation } from './top-navigation';

describe('TopNavigation', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopNavigation],
      providers: [
        provideRouter([
          { path: 'settings', children: [] },
          { path: 'mock', children: [] },
        ]),
      ],
    }).compileComponents();
  });

  it('should expose a labeled search field and every navigation action', () => {
    const fixture = TestBed.createComponent(TopNavigation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#dashboard-search');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));
    const settingsLink = links.find((link) => link.getAttribute('aria-label') === 'Settings');

    expect(element.querySelector('label[for="dashboard-search"]')?.textContent?.trim()).toBe(
      'Search dashboard',
    );
    expect(input?.type).toBe('search');
    expect(input?.getAttribute('aria-describedby')).toBe('dashboard-search-description');
    expect(settingsLink?.getAttribute('href')).toBe('/settings');
    expect(links.filter((link) => link.getAttribute('href') === '/mock')).toHaveLength(8);

    for (const label of [
      'Developer tools',
      'AI assistant',
      'Test mode',
      'Apps',
      'Help',
      'Notifications, unread',
      'Settings',
      'Create new',
    ]) {
      expect(links.some((link) => link.getAttribute('aria-label') === label)).toBe(true);
    }
  });

  it('should retain typed search text without navigating', async () => {
    const fixture = TestBed.createComponent(TopNavigation);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#dashboard-search',
    )!;
    const router = TestBed.inject(Router);

    input.value = 'customers';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(input.value).toBe('customers');
    expect(router.url).toBe('/');
  });

  it('should navigate to settings and mark the gear as current', async () => {
    const fixture = TestBed.createComponent(TopNavigation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const settingsLink = element.querySelector<HTMLAnchorElement>('a[aria-label="Settings"]')!;

    settingsLink.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/settings');
    expect(settingsLink.getAttribute('aria-current')).toBe('page');
  });
});
