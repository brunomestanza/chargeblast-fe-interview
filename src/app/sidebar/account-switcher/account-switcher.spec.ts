import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountSwitcher, companyInitials } from './account-switcher';

describe('companyInitials', () => {
  it.each([
    { name: 'Chargeblast', max: 1, expected: 'C' },
    { name: 'Chargeblast', max: 2, expected: 'C' },
    { name: 'AdroCard, Inc', max: 2, expected: 'AI' },
    { name: 'teste sandbox', max: 2, expected: 'TS' },
    { name: '  spaced   out  ', max: 2, expected: 'SO' },
    { name: '— Chargeblast', max: 1, expected: 'C' },
  ])('should letter "$name" as "$expected" with max $max', ({ name, max, expected }) => {
    expect(companyInitials(name, max)).toBe(expected);
  });
});

describe('AccountSwitcher', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSwitcher],
      providers: [
        provideRouter([
          { path: 'settings', children: [] },
          { path: 'mock', children: [] },
        ]),
      ],
    }).compileComponents();
  });

  it('should expose an accessible trigger and the complete menu content', () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = getTrigger(element);

    expect(trigger.textContent).toContain('Chargeblast');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('#account-switcher-panel')).toBeNull();

    openMenu(fixture);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('#account-switcher-panel')?.getAttribute('role')).toBe('dialog');
    expect(element.querySelector('.account-menu__company')?.textContent?.trim()).toBe(
      'Chargeblast',
    );

    expect(findLink(element, 'Settings')?.getAttribute('href')).toBe('/settings');

    for (const label of [
      'Exit sandbox',
      'Switch sandbox',
      'Create',
      'Bruno Mestanza',
      'Sign out',
    ]) {
      expect(findLink(element, label)?.getAttribute('href')).toBe('/mock');
    }
  });

  it('should close with Escape and restore focus to its trigger', () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = getTrigger(element);
    openMenu(fixture);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('#account-switcher-panel')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('should close after a pointer interaction outside the switcher', () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    openMenu(fixture);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(getTrigger(element).getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('#account-switcher-panel')).toBeNull();
  });

  it('should navigate an account action to the mock route and close the menu', async () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    openMenu(fixture);

    findLink(element, 'Exit sandbox')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/mock');
    expect(getTrigger(element).getAttribute('aria-expanded')).toBe('false');
  });

  it('should navigate the Settings action to settings and close the menu', async () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    openMenu(fixture);

    findLink(element, 'Settings')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/settings');
    expect(getTrigger(element).getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('#account-switcher-panel')).toBeNull();
  });
});

function getTrigger(element: HTMLElement): HTMLButtonElement {
  return element.querySelector<HTMLButtonElement>('.account-switcher__trigger')!;
}

function openMenu(fixture: ComponentFixture<AccountSwitcher>): void {
  getTrigger(fixture.nativeElement as HTMLElement).click();
  fixture.detectChanges();
}

function findLink(element: HTMLElement, label: string): HTMLAnchorElement | undefined {
  return Array.from(element.querySelectorAll<HTMLAnchorElement>('.account-menu a')).find((link) =>
    link.textContent?.includes(label),
  );
}
