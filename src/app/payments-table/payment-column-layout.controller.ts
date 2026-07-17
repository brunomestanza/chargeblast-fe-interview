import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  PaymentColumnWidths,
  clampColumnWidth,
  normalizeColumnOrder,
  serializeColumnOrder,
} from './payment-columns';
import { PaymentTablePreferencesAdapter } from './payment-table-preferences.adapter';
import { PAYMENT_TABLE_COLUMN_LABELS, type PaymentTableColumnKey } from './payment-table-column';

export interface PaymentTableColumn {
  readonly key: PaymentTableColumnKey;
  readonly label: string;
  readonly align: 'left' | 'right';
  readonly columnClass: string;
  readonly defaultWidth: number;
}

const PAYMENT_TABLE_COLUMNS: readonly PaymentTableColumn[] = [
  {
    key: 'amount',
    label: PAYMENT_TABLE_COLUMN_LABELS.amount,
    align: 'left',
    columnClass: 'amount-column',
    defaultWidth: 280,
  },
  {
    key: 'paymentMethod',
    label: PAYMENT_TABLE_COLUMN_LABELS.paymentMethod,
    align: 'left',
    columnClass: 'payment-method-column',
    defaultWidth: 170,
  },
  {
    key: 'description',
    label: PAYMENT_TABLE_COLUMN_LABELS.description,
    align: 'left',
    columnClass: 'description-column',
    defaultWidth: 180,
  },
  {
    key: 'customer',
    label: PAYMENT_TABLE_COLUMN_LABELS.customer,
    align: 'left',
    columnClass: 'customer-column',
    defaultWidth: 240,
  },
  {
    key: 'created',
    label: PAYMENT_TABLE_COLUMN_LABELS.created,
    align: 'left',
    columnClass: 'created-column',
    defaultWidth: 160,
  },
  {
    key: 'refundedDate',
    label: PAYMENT_TABLE_COLUMN_LABELS.refundedDate,
    align: 'left',
    columnClass: 'refunded-date-column',
    defaultWidth: 150,
  },
  {
    key: 'declineReason',
    label: PAYMENT_TABLE_COLUMN_LABELS.declineReason,
    align: 'left',
    columnClass: 'decline-reason-column',
    defaultWidth: 170,
  },
];

const PAYMENT_TABLE_COLUMN_MAP = new Map<PaymentTableColumnKey, PaymentTableColumn>(
  PAYMENT_TABLE_COLUMNS.map((column) => [column.key, column]),
);
const COLUMN_RESIZE_KEYBOARD_STEP = 8;
const COLUMN_RESIZE_KEYBOARD_STEP_LARGE = 24;

interface ColumnResizeState {
  readonly key: PaymentTableColumnKey;
  readonly pointerId: number;
  readonly startX: number;
  readonly startWidth: number;
}

@Service({ autoProvided: false })
export class PaymentColumnLayoutController {
  private readonly preferences = inject(PaymentTablePreferencesAdapter);
  private readonly destroyRef = inject(DestroyRef);

  readonly minColumnWidth = MIN_COLUMN_WIDTH;
  readonly maxColumnWidth = MAX_COLUMN_WIDTH;
  readonly columnOrder = signal<readonly PaymentTableColumnKey[]>(
    this.preferences.readColumnOrder(),
  );
  readonly columnWidths = signal<PaymentColumnWidths>(this.preferences.readColumnWidths());
  readonly orderedColumns = computed<readonly PaymentTableColumn[]>(() =>
    this.columnOrder().map((key) => PAYMENT_TABLE_COLUMN_MAP.get(key)!),
  );
  readonly resizingColumn = signal<PaymentTableColumnKey | null>(null);
  readonly announcement = signal('');

  private columnResizeState: ColumnResizeState | undefined;
  private stopObservingPreferences: (() => void) | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopObservingPreferences?.());
  }

  start(): void {
    this.columnOrder.set(this.preferences.readColumnOrder());
    this.columnWidths.set(this.preferences.readColumnWidths());
    this.stopObservingPreferences?.();
    this.stopObservingPreferences = this.preferences.observeColumnLayout(
      ({ columnOrder, columnWidths }) => {
        if (columnOrder) {
          this.columnOrder.set(columnOrder);
        }

        if (columnWidths) {
          this.columnWidths.set(columnWidths);
        }
      },
    );
  }

  columnWidth(column: PaymentTableColumnKey): number {
    return this.columnWidths()[column] ?? PAYMENT_TABLE_COLUMN_MAP.get(column)!.defaultWidth;
  }

  setColumnOrder(order: readonly PaymentTableColumnKey[]): void {
    const nextOrder = normalizeColumnOrder(order);

    if (serializeColumnOrder(nextOrder) === serializeColumnOrder(this.columnOrder())) {
      return;
    }

    this.columnOrder.set(nextOrder);
    this.preferences.writeColumnOrder(nextOrder);
  }

  resizeHandleLabel(column: PaymentTableColumn): string {
    return `Resize ${column.label} column. Use the left and right arrow keys to adjust its width.`;
  }

  onResizePointerDown(event: PointerEvent, column: PaymentTableColumnKey): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    const headerCell = handle.closest('th');
    const startWidth = headerCell
      ? headerCell.getBoundingClientRect().width
      : this.columnWidth(column);

    this.columnResizeState = {
      key: column,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
    };
    this.resizingColumn.set(column);

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a best-effort enhancement.
    }
  }

  onResizePointerMove(event: PointerEvent): void {
    const state = this.columnResizeState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.setColumnWidth(
      state.key,
      clampColumnWidth(state.startWidth + (event.clientX - state.startX)),
    );
  }

  onResizePointerUp(event: PointerEvent): void {
    const state = this.columnResizeState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // The capture may already have been released.
    }

    this.columnResizeState = undefined;
    this.resizingColumn.set(null);
    this.preferences.writeColumnWidths(this.columnWidths());
    this.announce(
      `${this.columnLabel(state.key)} column width set to ${this.columnWidth(state.key)} pixels.`,
    );
  }

  onResizeKeydown(event: KeyboardEvent, column: PaymentTableColumnKey): void {
    const step = event.shiftKey ? COLUMN_RESIZE_KEYBOARD_STEP_LARGE : COLUMN_RESIZE_KEYBOARD_STEP;
    const currentWidth = this.columnWidth(column);
    let nextWidth: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextWidth = currentWidth - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextWidth = currentWidth + step;
        break;
      case 'Home':
        nextWidth = MIN_COLUMN_WIDTH;
        break;
      case 'End':
        nextWidth = MAX_COLUMN_WIDTH;
        break;
      default:
        return;
    }

    event.preventDefault();
    const clampedWidth = clampColumnWidth(nextWidth);

    if (clampedWidth === currentWidth) {
      return;
    }

    this.setColumnWidth(column, clampedWidth);
    this.preferences.writeColumnWidths(this.columnWidths());
    this.announce(`${this.columnLabel(column)} column width set to ${clampedWidth} pixels.`);
  }

  private setColumnWidth(column: PaymentTableColumnKey, width: number): void {
    this.columnWidths.update((widths) => ({ ...widths, [column]: width }));
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private columnLabel(column: PaymentTableColumnKey): string {
    return PAYMENT_TABLE_COLUMN_LABELS[column];
  }
}
