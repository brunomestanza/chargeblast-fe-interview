import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountSwitcher, COMPANY_OPTIONS, filterCompaniesByPrefix } from './account-switcher';

describe('filterCompaniesByPrefix', () => {
  it.each([
    { query: 'Cha', expected: ['Chargeblast'] },
    { query: 'ja', expected: ['Jazzify'] },
    { query: '  ADRO', expected: ['AdroCard, Inc'] },
    { query: 'blast', expected: [] },
    { query: '', expected: ['AdroCard, Inc', 'Chargeblast', 'Jazzify'] },
  ])('should match "$query" only from the beginning of the company name', ({ query, expected }) => {
    expect(filterCompaniesByPrefix(COMPANY_OPTIONS, query).map(({ name }) => name)).toEqual(
      expected,
    );
  });
});

describe('AccountSwitcher', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSwitcher],
      providers: [provideRouter([{ path: 'mock', children: [] }])],
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
    expect(element.querySelector('label[for="company-search"]')?.textContent?.trim()).toBe(
      'Search companies',
    );
    expect(companyNames(element)).toEqual(['AdroCard, Inc', 'Chargeblast', 'Jazzify']);

    for (const label of [
      'Settings',
      'Switch to Sandbox',
      'Create account',
      'Bruno Mestanza',
      'Sign out',
    ]) {
      expect(findLink(element, label)?.getAttribute('href')).toBe('/mock');
    }

    for (const company of COMPANY_OPTIONS) {
      expect(findLink(element, company.name)?.getAttribute('href')).toBe('/mock');
    }
  });

  it('should filter only companies with a case-insensitive prefix', () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    openMenu(fixture);
    const search = element.querySelector<HTMLInputElement>('#company-search')!;

    setSearch(search, 'Cha');
    fixture.detectChanges();

    expect(companyNames(element)).toEqual(['Chargeblast']);
    expect(findLink(element, 'Settings')).toBeTruthy();
    expect(element.textContent).toContain('1 company found.');

    setSearch(search, 'blast');
    fixture.detectChanges();

    expect(companyNames(element)).toEqual([]);
    expect(element.querySelector('.account-menu__empty')?.textContent?.trim()).toBe(
      'No companies found',
    );
    expect(element.textContent).toContain('No companies found.');
  });

  it('should close with Escape and restore focus to its trigger', () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = getTrigger(element);
    openMenu(fixture);
    element.querySelector<HTMLInputElement>('#company-search')?.focus();

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

  it('should navigate every company and account action to the mock route', async () => {
    const fixture = TestBed.createComponent(AccountSwitcher);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    openMenu(fixture);

    findLink(element, 'Jazzify')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/mock');
    expect(getTrigger(element).getAttribute('aria-expanded')).toBe('false');
  });
});

function getTrigger(element: HTMLElement): HTMLButtonElement {
  return element.querySelector<HTMLButtonElement>('.account-switcher__trigger')!;
}

function openMenu(fixture: ComponentFixture<AccountSwitcher>): void {
  getTrigger(fixture.nativeElement as HTMLElement).click();
  fixture.detectChanges();
}

function setSearch(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function companyNames(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll<HTMLAnchorElement>('.account-menu__company-row')).map(
    (link) => link.querySelector('.company-mark + span')?.textContent?.trim() ?? '',
  );
}

function findLink(element: HTMLElement, label: string): HTMLAnchorElement | undefined {
  return Array.from(element.querySelectorAll<HTMLAnchorElement>('.account-menu a')).find((link) =>
    link.textContent?.includes(label),
  );
}
