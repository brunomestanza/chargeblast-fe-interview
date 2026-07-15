import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import {
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_WIDTHS_STORAGE_KEY,
  type PaymentColumnWidths,
  parseStoredColumnOrder,
  parseStoredColumnWidths,
  serializeColumnOrder,
  serializeColumnWidths,
} from './payment-columns';
import type { PaymentSortColumn } from './payment-sort';

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
export const PAGE_SIZE_STORAGE_KEY = 'chargeblast.payments.page-size';

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaymentColumnLayoutChange {
  readonly columnOrder?: readonly PaymentSortColumn[];
  readonly columnWidths?: PaymentColumnWidths;
}

export type PageSizeObserver = (pageSize: PageSize) => void;
export type PaymentColumnLayoutObserver = (change: PaymentColumnLayoutChange) => void;

export function isPageSize(value: number): value is PageSize {
  return value === 25 || value === 50 || value === 100;
}

export function parseStoredPageSize(value: string | null): PageSize {
  if (value === null) {
    return DEFAULT_PAGE_SIZE;
  }

  const pageSize = Number(value);
  return isPageSize(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
}

@Service({ autoProvided: false })
export class PaymentTablePreferencesAdapter {
  private readonly document = inject(DOCUMENT);

  readPageSize(): PageSize {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return DEFAULT_PAGE_SIZE;
    }

    try {
      return parseStoredPageSize(browserWindow.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    } catch {
      return DEFAULT_PAGE_SIZE;
    }
  }

  writePageSize(pageSize: PageSize): void {
    if (!isPageSize(pageSize)) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // Keep pagination usable when localStorage is unavailable.
    }
  }

  readColumnOrder(): readonly PaymentSortColumn[] {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return parseStoredColumnOrder(null);
    }

    try {
      return parseStoredColumnOrder(browserWindow.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY));
    } catch {
      return parseStoredColumnOrder(null);
    }
  }

  readColumnWidths(): PaymentColumnWidths {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return parseStoredColumnWidths(null);
    }

    try {
      return parseStoredColumnWidths(browserWindow.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY));
    } catch {
      return parseStoredColumnWidths(null);
    }
  }

  writeColumnOrder(order: readonly PaymentSortColumn[]): void {
    try {
      this.document.defaultView?.localStorage.setItem(
        COLUMN_ORDER_STORAGE_KEY,
        serializeColumnOrder(order),
      );
    } catch {
      // Keep column ordering usable when localStorage is unavailable.
    }
  }

  writeColumnWidths(widths: PaymentColumnWidths): void {
    try {
      this.document.defaultView?.localStorage.setItem(
        COLUMN_WIDTHS_STORAGE_KEY,
        serializeColumnWidths(widths),
      );
    } catch {
      // Keep column resizing usable when localStorage is unavailable.
    }
  }

  observePageSize(callback: PageSizeObserver): () => void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return () => undefined;
    }

    const handleStorageChange = (event: StorageEvent): void => {
      if (
        (event.key !== PAGE_SIZE_STORAGE_KEY && event.key !== null) ||
        !this.isLocalStorageEvent(event)
      ) {
        return;
      }

      callback(parseStoredPageSize(event.newValue));
    };

    browserWindow.addEventListener('storage', handleStorageChange);
    return () => browserWindow.removeEventListener('storage', handleStorageChange);
  }

  observeColumnLayout(callback: PaymentColumnLayoutObserver): () => void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return () => undefined;
    }

    const handleStorageChange = (event: StorageEvent): void => {
      if (
        (event.key !== COLUMN_ORDER_STORAGE_KEY &&
          event.key !== COLUMN_WIDTHS_STORAGE_KEY &&
          event.key !== null) ||
        !this.isLocalStorageEvent(event)
      ) {
        return;
      }

      callback({
        ...(event.key === COLUMN_ORDER_STORAGE_KEY || event.key === null
          ? { columnOrder: parseStoredColumnOrder(event.newValue) }
          : {}),
        ...(event.key === COLUMN_WIDTHS_STORAGE_KEY || event.key === null
          ? { columnWidths: parseStoredColumnWidths(event.newValue) }
          : {}),
      });
    };

    browserWindow.addEventListener('storage', handleStorageChange);
    return () => browserWindow.removeEventListener('storage', handleStorageChange);
  }

  private isLocalStorageEvent(event: StorageEvent): boolean {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return false;
    }

    try {
      return event.storageArea === null || event.storageArea === browserWindow.localStorage;
    } catch {
      return false;
    }
  }
}
