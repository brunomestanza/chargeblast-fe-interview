import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SettingsPage } from './settings-page';
import { SETTINGS_SECTIONS } from './settings-page.data';

describe('SettingsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [provideRouter([{ path: 'mock', children: [] }])],
    }).compileComponents();
  });

  it('should render every settings group and item from the reference', () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const headings = Array.from(element.querySelectorAll<HTMLHeadingElement>('h2')).map((heading) =>
      heading.textContent?.trim(),
    );
    const itemLinks = Array.from(element.querySelectorAll<HTMLAnchorElement>('.settings-item'));

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Settings');
    expect(headings).toEqual(SETTINGS_SECTIONS.map(({ title }) => title));
    expect(
      itemLinks.map((link) => link.querySelector('.settings-item__name')?.textContent?.trim()),
    ).toEqual(SETTINGS_SECTIONS.flatMap(({ items }) => items.map(({ name }) => name)));
    expect(itemLinks.every((link) => link.getAttribute('href') === '/mock')).toBe(true);
  });

  it('should navigate every settings resource to the mock page', async () => {
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(links).toHaveLength(22);
    expect(links.every((link) => link.getAttribute('href') === '/mock')).toBe(true);

    links[0]?.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/mock');
  });
});
