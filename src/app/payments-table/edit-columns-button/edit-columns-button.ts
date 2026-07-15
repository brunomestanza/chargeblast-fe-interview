import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { moveColumn } from '../payment-columns';
import type { PaymentTableColumn } from '../payment-column-layout.controller';
import type { PaymentTableColumnKey } from '../payment-table-column';

interface PointerReorder {
  readonly pointerId: number;
  readonly handle: HTMLButtonElement;
  readonly startClientY: number;
  readonly rowCenters: readonly number[];
  readonly rowHeight: number;
}

interface ColumnReorderState {
  readonly column: PaymentTableColumnKey;
  readonly startIndex: number;
  readonly pointer?: PointerReorder;
  targetIndex: number;
}

@Component({
  selector: 'app-edit-columns-button',
  templateUrl: './edit-columns-button.html',
  styleUrl: './edit-columns-button.css',
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:focusin)': 'onDocumentFocusIn($event)',
    '(document:keydown.escape)': 'onDocumentEscape($event)',
  },
})
export class EditColumnsButton {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly columns = input.required<readonly PaymentTableColumn[]>();
  readonly popoverId = input('payments-edit-columns');
  readonly orderChange = output<readonly PaymentTableColumnKey[]>();

  protected readonly open = signal(false);
  protected readonly draftColumns = signal<readonly PaymentTableColumn[]>([]);
  protected readonly activeColumn = signal<PaymentTableColumnKey | null>(null);
  protected readonly pointerDragging = signal(false);
  protected readonly pointerOffsetY = signal(0);
  protected readonly announcement = signal('');

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly columnRows = viewChildren<ElementRef<HTMLElement>>('columnRow');
  private reorderState: ColumnReorderState | undefined;

  protected togglePopover(): void {
    if (this.open()) {
      this.closePopover(false);
      return;
    }

    this.cancelActiveReorder();
    this.draftColumns.set([...this.columns()]);
    this.open.set(true);
  }

  protected reorderHandleLabel(column: PaymentTableColumn, index: number): string {
    return `Reorder ${column.label} column, position ${index + 1} of ${this.draftColumns().length}`;
  }

  protected onHandlePointerDown(
    event: PointerEvent,
    index: number,
    column: PaymentTableColumnKey,
  ): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.cancelActiveReorder();

    const handle = event.currentTarget as HTMLButtonElement;
    const rowRects = this.columnRows().map((row) => row.nativeElement.getBoundingClientRect());
    this.reorderState = {
      column,
      startIndex: index,
      targetIndex: index,
      pointer: {
        pointerId: event.pointerId,
        handle,
        startClientY: event.clientY,
        rowCenters: rowRects.map((rect) => rect.top + rect.height / 2),
        rowHeight: rowRects[index]?.height ?? 0,
      },
    };
    this.activeColumn.set(column);
    handle.focus({ preventScroll: true });

    let captureEstablished: boolean;

    try {
      handle.setPointerCapture(event.pointerId);
      captureEstablished = handle.hasPointerCapture(event.pointerId);
    } catch {
      captureEstablished = false;
    }

    if (!captureEstablished) {
      this.reorderState = undefined;
      this.activeColumn.set(null);
      this.announcement.set(
        `Could not pick up ${this.columnLabel(column)} column with the pointer. Use the keyboard controls instead.`,
      );
      return;
    }

    this.pointerDragging.set(true);
    this.announcePickup(column, index);
  }

  protected onHandlePointerMove(event: PointerEvent): void {
    const state = this.reorderState;

    if (!state?.pointer || state.pointer.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const targetIndex = this.closestRowIndex(event.clientY, state.pointer.rowCenters);

    if (targetIndex !== state.targetIndex) {
      state.targetIndex = targetIndex;
      this.announceMove(state.column, targetIndex);
    }

    this.pointerOffsetY.set(event.clientY - state.pointer.startClientY);
  }

  protected onHandlePointerUp(event: PointerEvent): void {
    const state = this.reorderState;

    if (!state?.pointer || state.pointer.pointerId !== event.pointerId) {
      return;
    }

    this.reorderState = undefined;
    this.releasePointerCapture(state.pointer);
    this.activeColumn.set(null);
    this.resetPointerAnimation();
    this.finishReorder(state);
  }

  protected onHandlePointerCancel(event: PointerEvent): void {
    const state = this.reorderState;

    if (!state?.pointer || state.pointer.pointerId !== event.pointerId) {
      return;
    }

    this.reorderState = undefined;
    this.releasePointerCapture(state.pointer);
    this.activeColumn.set(null);
    this.resetPointerAnimation();
    this.announcement.set(`Reordering ${this.columnLabel(state.column)} column was cancelled.`);
  }

  protected rowTransform(index: number): string | null {
    const state = this.reorderState;

    if (!state?.pointer || !this.pointerDragging()) {
      return null;
    }

    if (index === state.startIndex) {
      return `translate3d(0, ${this.pointerOffsetY()}px, 0)`;
    }

    const rowHeight = state.pointer.rowHeight;

    if (
      state.startIndex < state.targetIndex &&
      index > state.startIndex &&
      index <= state.targetIndex
    ) {
      return `translate3d(0, ${-rowHeight}px, 0)`;
    }

    if (
      state.targetIndex < state.startIndex &&
      index >= state.targetIndex &&
      index < state.startIndex
    ) {
      return `translate3d(0, ${rowHeight}px, 0)`;
    }

    return null;
  }

  protected onHandleKeydown(
    event: KeyboardEvent,
    index: number,
    column: PaymentTableColumnKey,
  ): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      const currentState = this.reorderState;

      if (currentState?.column === column && currentState.pointer === undefined) {
        this.reorderState = undefined;
        this.activeColumn.set(null);
        this.finishReorder(currentState);
        return;
      }

      this.cancelActiveReorder();
      this.reorderState = { column, startIndex: index, targetIndex: index };
      this.activeColumn.set(column);
      this.announcePickup(column, index);
      return;
    }

    const state = this.reorderState;

    if (!state || state.pointer || state.column !== column) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.reorderState = undefined;
      this.activeColumn.set(null);
      this.announcement.set(`Reordering ${this.columnLabel(column)} column was cancelled.`);
      return;
    }

    const lastIndex = this.draftColumns().length - 1;
    const targetIndex = this.keyboardTargetIndex(event.key, state.targetIndex, lastIndex);

    if (targetIndex === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (targetIndex === state.targetIndex) {
      this.announcement.set(
        `${this.columnLabel(column)} column is already at position ${targetIndex + 1} of ${lastIndex + 1}.`,
      );
      return;
    }

    state.targetIndex = targetIndex;
    this.announceMove(column, targetIndex);
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.open() || !(event.target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target)) {
      this.closePopover(false);
    }
  }

  protected onDocumentFocusIn(event: FocusEvent): void {
    if (!this.open() || !(event.target instanceof Node)) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target)) {
      this.closePopover(false);
    }
  }

  protected onDocumentEscape(event: Event): void {
    if (!this.open()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.closePopover(true);
  }

  private keyboardTargetIndex(key: string, currentIndex: number, lastIndex: number): number | null {
    switch (key) {
      case 'ArrowUp':
        return Math.max(0, currentIndex - 1);
      case 'ArrowDown':
        return Math.min(lastIndex, currentIndex + 1);
      case 'Home':
        return 0;
      case 'End':
        return lastIndex;
      default:
        return null;
    }
  }

  private closestRowIndex(clientY: number, rowCenters: readonly number[]): number {
    if (rowCenters.length === 0) {
      return 0;
    }

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    rowCenters.forEach((rowCenter, index) => {
      const distance = Math.abs(clientY - rowCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  private finishReorder(state: ColumnReorderState): void {
    if (state.targetIndex !== state.startIndex) {
      this.moveDraftColumn(state.startIndex, state.targetIndex);
    }

    const order = this.draftColumns().map((column) => column.key);
    const currentOrder = this.columns().map((column) => column.key);

    if (!this.ordersMatch(order, currentOrder)) {
      this.orderChange.emit(order);
    }

    const position = order.indexOf(state.column) + 1;
    this.announcement.set(
      `${this.columnLabel(state.column)} column dropped at position ${position} of ${order.length}.`,
    );
  }

  private moveDraftColumn(fromIndex: number, toIndex: number): void {
    const currentColumns = this.draftColumns();
    const columnsByKey = new Map(currentColumns.map((column) => [column.key, column]));
    const nextColumns = moveColumn(
      currentColumns.map((column) => column.key),
      fromIndex,
      toIndex,
    ).flatMap((key) => {
      const column = columnsByKey.get(key);
      return column ? [column] : [];
    });

    this.draftColumns.set(nextColumns);
  }

  private closePopover(restoreFocus: boolean): void {
    this.cancelActiveReorder();
    this.open.set(false);

    if (restoreFocus) {
      this.trigger().nativeElement.focus({ preventScroll: true });
    }
  }

  private cancelActiveReorder(): void {
    const pointer = this.reorderState?.pointer;
    this.reorderState = undefined;
    this.activeColumn.set(null);
    this.resetPointerAnimation();

    if (pointer) {
      this.releasePointerCapture(pointer);
    }
  }

  private releasePointerCapture(pointer: PointerReorder): void {
    try {
      pointer.handle.releasePointerCapture(pointer.pointerId);
    } catch {
      // The capture may already have been released.
    }
  }

  private resetPointerAnimation(): void {
    this.pointerDragging.set(false);
    this.pointerOffsetY.set(0);
  }

  private announcePickup(column: PaymentTableColumnKey, index: number): void {
    this.announcement.set(
      `${this.columnLabel(column)} column picked up at position ${index + 1} of ${this.draftColumns().length}. Use the up and down arrow keys to move it, Space to drop it, or Escape to cancel.`,
    );
  }

  private announceMove(column: PaymentTableColumnKey, targetIndex: number): void {
    this.announcement.set(
      `${this.columnLabel(column)} column moved to position ${targetIndex + 1} of ${this.draftColumns().length}.`,
    );
  }

  private ordersMatch(
    first: readonly PaymentTableColumnKey[],
    second: readonly PaymentTableColumnKey[],
  ): boolean {
    return first.length === second.length && first.every((key, index) => key === second[index]);
  }

  private columnLabel(column: PaymentTableColumnKey): string {
    return this.draftColumns().find((candidate) => candidate.key === column)?.label ?? column;
  }
}
