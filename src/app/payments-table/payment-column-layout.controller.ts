import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  PaymentColumnWidths,
  clampColumnWidth,
  moveColumn,
  serializeColumnOrder,
} from './payment-columns';
import { PaymentTablePreferencesAdapter } from './payment-table-preferences.adapter';
import { PAYMENT_SORT_COLUMN_LABELS, PaymentSortColumn } from './payment-sort';

export interface PaymentTableColumn {
  readonly key: PaymentSortColumn;
  readonly label: string;
  readonly align: 'left' | 'right';
  readonly columnClass: string;
  readonly defaultWidth: number;
}

const PAYMENT_TABLE_COLUMNS: readonly PaymentTableColumn[] = [
  {
    key: 'paymentId',
    label: PAYMENT_SORT_COLUMN_LABELS.paymentId,
    align: 'left',
    columnClass: 'payment-id-column',
    defaultWidth: 248,
  },
  {
    key: 'customer',
    label: PAYMENT_SORT_COLUMN_LABELS.customer,
    align: 'left',
    columnClass: 'customer-column',
    defaultWidth: 220,
  },
  {
    key: 'amount',
    label: PAYMENT_SORT_COLUMN_LABELS.amount,
    align: 'right',
    columnClass: 'amount-column',
    defaultWidth: 150,
  },
  {
    key: 'status',
    label: PAYMENT_SORT_COLUMN_LABELS.status,
    align: 'left',
    columnClass: 'status-column',
    defaultWidth: 130,
  },
  {
    key: 'paymentMethod',
    label: PAYMENT_SORT_COLUMN_LABELS.paymentMethod,
    align: 'right',
    columnClass: 'payment-method-column',
    defaultWidth: 190,
  },
  {
    key: 'created',
    label: PAYMENT_SORT_COLUMN_LABELS.created,
    align: 'right',
    columnClass: 'created-column',
    defaultWidth: 175,
  },
];

const PAYMENT_TABLE_COLUMN_MAP = new Map<PaymentSortColumn, PaymentTableColumn>(
  PAYMENT_TABLE_COLUMNS.map((column) => [column.key, column]),
);
const COLUMN_REORDER_HOLD_MS = 1_000;
const COLUMN_REORDER_HOLD_MOVE_TOLERANCE = 8;
const COLUMN_RESIZE_KEYBOARD_STEP = 8;
const COLUMN_RESIZE_KEYBOARD_STEP_LARGE = 24;

interface ColumnResizeState {
  readonly key: PaymentSortColumn;
  readonly pointerId: number;
  readonly startX: number;
  readonly startWidth: number;
}

interface ColumnDragState {
  readonly key: PaymentSortColumn;
  readonly pointerId: number;
  readonly startIndex: number;
  readonly startOrder: readonly PaymentSortColumn[];
  readonly startX: number;
  readonly startY: number;
  readonly headerRow: HTMLElement;
  currentIndex: number;
  dragging: boolean;
}

@Service({ autoProvided: false })
export class PaymentColumnLayoutController {
  private readonly preferences = inject(PaymentTablePreferencesAdapter);
  private readonly destroyRef = inject(DestroyRef);

  readonly minColumnWidth = MIN_COLUMN_WIDTH;
  readonly maxColumnWidth = MAX_COLUMN_WIDTH;
  readonly columnOrder = signal<readonly PaymentSortColumn[]>(this.preferences.readColumnOrder());
  readonly columnWidths = signal<PaymentColumnWidths>(this.preferences.readColumnWidths());
  readonly orderedColumns = computed<readonly PaymentTableColumn[]>(() =>
    this.columnOrder().map((key) => PAYMENT_TABLE_COLUMN_MAP.get(key)!),
  );
  readonly draggingColumn = signal<PaymentSortColumn | null>(null);
  readonly resizingColumn = signal<PaymentSortColumn | null>(null);
  readonly announcement = signal('');

  private columnResizeState: ColumnResizeState | undefined;
  private columnDragState: ColumnDragState | undefined;
  private columnDragCaptureCell: HTMLElement | undefined;
  private columnHoldTimer: ReturnType<typeof setTimeout> | undefined;
  private suppressedSortColumn: PaymentSortColumn | null = null;
  private stopObservingPreferences: (() => void) | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearColumnHoldTimer();
      this.stopObservingPreferences?.();
    });
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

  consumeSortSuppression(column: PaymentSortColumn): boolean {
    const shouldSuppress = this.suppressedSortColumn === column;
    this.suppressedSortColumn = null;
    return shouldSuppress;
  }

  columnWidth(column: PaymentSortColumn): number {
    return this.columnWidths()[column] ?? PAYMENT_TABLE_COLUMN_MAP.get(column)!.defaultWidth;
  }

  reorderHandleLabel(column: PaymentTableColumn, index: number): string {
    return (
      `Reorder ${column.label} column, position ${index + 1} of ${this.columnOrder().length}. ` +
      'Use the arrow keys to move it, or press and hold the header to drag it.'
    );
  }

  resizeHandleLabel(column: PaymentTableColumn): string {
    return `Resize ${column.label} column. Use the left and right arrow keys to adjust its width.`;
  }

  onHeaderPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    if (this.columnResizeState || this.columnDragState) {
      return;
    }

    const headerRow = event.currentTarget as HTMLElement;
    const headerCell = (event.target as HTMLElement | null)?.closest('th');

    if (!headerCell || headerCell.parentElement !== headerRow) {
      return;
    }

    const index = Array.prototype.indexOf.call(headerRow.children, headerCell);
    const column = this.columnOrder()[index];

    if (column === undefined) {
      return;
    }

    this.suppressedSortColumn = null;
    this.columnDragState = {
      key: column,
      pointerId: event.pointerId,
      startIndex: index,
      startOrder: this.columnOrder(),
      startX: event.clientX,
      startY: event.clientY,
      headerRow,
      currentIndex: index,
      dragging: false,
    };
    this.clearColumnHoldTimer();
    this.columnHoldTimer = setTimeout(() => this.activateColumnDrag(), COLUMN_REORDER_HOLD_MS);
  }

  onHeaderPointerMove(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (!state.dragging) {
      const movement = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);

      if (movement > COLUMN_REORDER_HOLD_MOVE_TOLERANCE) {
        this.clearColumnHoldTimer();
        this.columnDragState = undefined;
      }

      return;
    }

    event.preventDefault();
    this.updateLiveReorder(event.clientX);
  }

  onHeaderPointerUp(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (state.dragging) {
      this.finishColumnDrag(true);
      return;
    }

    this.clearColumnHoldTimer();
    this.columnDragState = undefined;
  }

  onHeaderPointerCancel(event: PointerEvent): void {
    const state = this.columnDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (state.dragging) {
      this.finishColumnDrag(false);
      return;
    }

    this.clearColumnHoldTimer();
    this.columnDragState = undefined;
  }

  onReorderHandlePointerDown(event: PointerEvent, index: number, column: PaymentSortColumn): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.columnResizeState || this.columnDragState) {
      return;
    }

    const headerRow = (event.currentTarget as HTMLElement).closest('tr');

    if (!headerRow) {
      return;
    }

    this.suppressedSortColumn = null;
    this.columnDragState = {
      key: column,
      pointerId: event.pointerId,
      startIndex: index,
      startOrder: this.columnOrder(),
      startX: event.clientX,
      startY: event.clientY,
      headerRow,
      currentIndex: index,
      dragging: false,
    };
    this.activateColumnDrag();
  }

  onReorderHandleKeydown(event: KeyboardEvent, index: number, column: PaymentSortColumn): void {
    const lastIndex = this.columnOrder().length - 1;
    let targetIndex: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = index - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = index + 1;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();

    if (targetIndex < 0 || targetIndex > lastIndex || targetIndex === index) {
      this.announce(
        `${this.columnLabel(column)} is already at position ${index + 1} of ${lastIndex + 1}.`,
      );
      return;
    }

    this.applyColumnMove(index, targetIndex);
  }

  onResizePointerDown(event: PointerEvent, column: PaymentSortColumn): void {
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

  onResizeKeydown(event: KeyboardEvent, column: PaymentSortColumn): void {
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

  private activateColumnDrag(): void {
    const state = this.columnDragState;
    this.clearColumnHoldTimer();

    if (!state || state.dragging) {
      return;
    }

    const cell = state.headerRow.children[state.startIndex] as HTMLElement | undefined;

    if (!cell) {
      this.columnDragState = undefined;
      return;
    }

    try {
      cell.setPointerCapture(state.pointerId);
    } catch {
      this.columnDragState = undefined;
      return;
    }

    if (!cell.hasPointerCapture(state.pointerId)) {
      this.columnDragState = undefined;
      return;
    }

    this.columnDragCaptureCell = cell;
    state.dragging = true;
    this.suppressedSortColumn = state.key;
    this.draggingColumn.set(state.key);
    this.announce(
      `Reordering ${this.columnLabel(state.key)} column. Move over another column to reposition it, then release to save.`,
    );
  }

  private updateLiveReorder(clientX: number): void {
    const state = this.columnDragState;

    if (!state) {
      return;
    }

    const cells = Array.from(state.headerRow.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.tagName === 'TH',
    );
    const current = state.currentIndex;

    if (current < 0 || current >= cells.length) {
      return;
    }

    if (current < cells.length - 1) {
      const rightRect = cells[current + 1].getBoundingClientRect();

      if (clientX > rightRect.left + rightRect.width / 2) {
        this.moveDraggedColumn(current + 1);
        return;
      }
    }

    if (current > 0) {
      const leftRect = cells[current - 1].getBoundingClientRect();

      if (clientX < leftRect.left + leftRect.width / 2) {
        this.moveDraggedColumn(current - 1);
      }
    }
  }

  private moveDraggedColumn(toIndex: number): void {
    const state = this.columnDragState;

    if (!state) {
      return;
    }

    this.columnOrder.set(moveColumn(this.columnOrder(), state.currentIndex, toIndex));
    state.currentIndex = toIndex;
  }

  private finishColumnDrag(commit: boolean): void {
    const state = this.columnDragState;
    this.clearColumnHoldTimer();

    if (state && this.columnDragCaptureCell) {
      try {
        this.columnDragCaptureCell.releasePointerCapture(state.pointerId);
      } catch {
        // The capture may already have been released.
      }
    }

    this.columnDragCaptureCell = undefined;
    this.columnDragState = undefined;
    this.draggingColumn.set(null);

    if (!state) {
      return;
    }

    if (!commit) {
      this.columnOrder.set(state.startOrder);
      return;
    }

    if (serializeColumnOrder(this.columnOrder()) === serializeColumnOrder(state.startOrder)) {
      return;
    }

    this.preferences.writeColumnOrder(this.columnOrder());
    const newIndex = this.columnOrder().indexOf(state.key);
    this.announce(
      `${this.columnLabel(state.key)} column moved to position ${newIndex + 1} of ${this.columnOrder().length}.`,
    );
  }

  private applyColumnMove(fromIndex: number, toIndex: number): void {
    const currentOrder = this.columnOrder();
    const key = currentOrder[fromIndex];
    const nextOrder = moveColumn(currentOrder, fromIndex, toIndex);

    if (!key || serializeColumnOrder(nextOrder) === serializeColumnOrder(currentOrder)) {
      return;
    }

    this.columnOrder.set(nextOrder);
    this.preferences.writeColumnOrder(nextOrder);
    const newIndex = nextOrder.indexOf(key);
    this.announce(
      `${this.columnLabel(key)} column moved to position ${newIndex + 1} of ${nextOrder.length}.`,
    );
  }

  private setColumnWidth(column: PaymentSortColumn, width: number): void {
    this.columnWidths.update((widths) => ({ ...widths, [column]: width }));
  }

  private clearColumnHoldTimer(): void {
    if (this.columnHoldTimer !== undefined) {
      clearTimeout(this.columnHoldTimer);
      this.columnHoldTimer = undefined;
    }
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }

  private columnLabel(column: PaymentSortColumn): string {
    return PAYMENT_SORT_COLUMN_LABELS[column];
  }
}
