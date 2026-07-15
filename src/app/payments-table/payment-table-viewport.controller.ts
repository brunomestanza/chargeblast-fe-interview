import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import {
  DEFAULT_PAYMENT_SKELETON_LAYOUT,
  PaymentSkeletonLayout,
  calculatePaymentSkeletonLayout,
} from './payment-skeleton-layout';

@Service({ autoProvided: false })
export class PaymentTableViewportController {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly skeletonLayout = signal<PaymentSkeletonLayout>(DEFAULT_PAYMENT_SKELETON_LAYOUT);

  readonly skeletonRows = computed(() =>
    Array.from({ length: this.skeletonLayout().rowCount }, (_, index) => index),
  );
  readonly skeletonRowHeight = computed(() => this.skeletonLayout().rowHeightPx + 'px');

  private tableScroll: HTMLElement | undefined;
  private tableHead: HTMLTableSectionElement | undefined;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  start(tableScroll: HTMLElement): void {
    this.stop();
    this.tableScroll = tableScroll;
    this.tableHead = tableScroll.querySelector<HTMLTableSectionElement>('thead') ?? undefined;

    if (!this.tableHead) {
      return;
    }

    this.measure();
    const ResizeObserverConstructor = this.document.defaultView?.ResizeObserver;

    if (typeof ResizeObserverConstructor !== 'function') {
      return;
    }

    this.resizeObserver = new ResizeObserverConstructor(() => this.measure());
    this.resizeObserver.observe(this.tableScroll);
    this.resizeObserver.observe(this.tableHead);
  }

  resetScrollPosition(): void {
    if (this.tableScroll) {
      this.tableScroll.scrollTop = 0;
    }
  }

  measure(): void {
    const tableScroll = this.tableScroll;
    const tableHead = this.tableHead;

    if (!tableScroll || !tableHead || this.destroyRef.destroyed) {
      return;
    }

    const tableScrollStyles = this.document.defaultView?.getComputedStyle(tableScroll);
    const borderHeight = tableScrollStyles
      ? (Number.parseFloat(tableScrollStyles.borderTopWidth) || 0) +
        (Number.parseFloat(tableScrollStyles.borderBottomWidth) || 0)
      : 0;
    const viewportHeight = tableScroll.getBoundingClientRect().height - borderHeight;
    const headerHeight = tableHead.getBoundingClientRect().height;

    if (!(viewportHeight > headerHeight)) {
      return;
    }

    const nextLayout = calculatePaymentSkeletonLayout(viewportHeight, headerHeight);
    const currentLayout = this.skeletonLayout();

    if (
      nextLayout.rowCount === currentLayout.rowCount &&
      Math.abs(nextLayout.rowHeightPx - currentLayout.rowHeightPx) < 0.01
    ) {
      return;
    }

    this.skeletonLayout.set(nextLayout);
  }

  private stop(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.tableScroll = undefined;
    this.tableHead = undefined;
  }
}
