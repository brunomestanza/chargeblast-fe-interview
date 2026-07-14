import { Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { TopNavigation } from './top-navigation/top-navigation';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, TopNavigation],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private hasActivatedRoute = false;

  protected handleRouteActivation(): void {
    if (!this.hasActivatedRoute) {
      this.hasActivatedRoute = true;
      return;
    }

    queueMicrotask(() => {
      const mainContent = this.mainContent()?.nativeElement;

      if (!mainContent) {
        return;
      }

      mainContent.focus({ preventScroll: true });
      mainContent.scrollTop = 0;
      mainContent.ownerDocument.documentElement.scrollTop = 0;
      mainContent.ownerDocument.body.scrollTop = 0;
    });
  }
}
