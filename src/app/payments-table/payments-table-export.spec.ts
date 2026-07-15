import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Payment } from './payment';
import { PaymentsTable } from './payments-table';
import { findButton, payment, setupPaymentsTableTesting } from './testing/payments-table.testing';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(blob);
  });
}

function requireCapturedValue<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }

  return value;
}

function replaceUrlMethod(
  method: 'createObjectURL' | 'revokeObjectURL',
  implementation: unknown,
): () => void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window.URL, method);

  Object.defineProperty(window.URL, method, {
    configurable: true,
    value: implementation,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(window.URL, method, originalDescriptor);
      return;
    }

    Reflect.deleteProperty(window.URL, method);
  };
}

describe('PaymentsTable export', () => {
  setupPaymentsTableTesting();

  it('exports every filtered and sorted payment across pages, then shows a success toast', async () => {
    const failedPayments = Array.from({ length: 31 }, (_, index) => ({
      ...payment,
      id: `pay_failed_${String(index + 1).padStart(2, '0')}`,
      amount: 31 - index,
      status: 'failed' as const,
      createdAt: `2026-07-13T${String(index % 24).padStart(2, '0')}:00:00.000Z`,
    }));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?status=failed&sort=amount.asc');

    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [
      ...failedPayments,
      { ...payment, id: 'pay_succeeded', amount: 0, status: 'succeeded' },
    ] satisfies readonly Payment[]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const actionGroup = element.querySelector<HTMLElement>('.filter-toolbar__actions')!;
    const exportButton = findButton(element, 'Export');
    const exportStatus = element.querySelector<HTMLElement>('#payments-export-status');
    let exportedBlob: Blob | null = null;
    let clickedAnchor: HTMLAnchorElement | null = null;
    const createObjectUrl = vi.fn((blob: Blob | MediaSource) => {
      if (blob instanceof Blob) {
        exportedBlob = blob;
      }

      return 'blob:payments-export';
    });
    const revokeObjectUrl = vi.fn();
    const restoreCreateObjectUrl = replaceUrlMethod('createObjectURL', createObjectUrl);
    const restoreRevokeObjectUrl = replaceUrlMethod('revokeObjectURL', revokeObjectUrl);
    const clickSpy = vi
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedAnchor = this;
        expect(this.isConnected).toBe(true);
      });

    try {
      expect(
        Array.from(actionGroup.querySelectorAll('button')).map((button) =>
          button.textContent?.trim(),
        ),
      ).toEqual(['Clean all filters', 'Export']);
      expect(getComputedStyle(actionGroup).gap).toBe('12px');
      expect(element.querySelectorAll('tbody tr')).toHaveLength(25);
      expect(exportButton.type).toBe('button');
      expect(exportButton.getAttribute('aria-label')).toBe('Export current payments view as CSV');
      expect(exportStatus?.textContent?.trim()).toBe('');

      exportButton.focus();
      exportButton.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(exportButton);
      expect(createObjectUrl).toHaveBeenCalledOnce();
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:payments-export');
      const downloadedAnchor = requireCapturedValue<HTMLAnchorElement>(
        clickedAnchor,
        'The download link was not clicked.',
      );
      const csvBlob = requireCapturedValue<Blob>(exportedBlob, 'The CSV Blob was not created.');

      expect(downloadedAnchor.isConnected).toBe(false);
      expect(downloadedAnchor.href).toBe('blob:payments-export');
      expect(downloadedAnchor.download).toMatch(/^payments-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(csvBlob.type).toBe('text/csv;charset=utf-8');

      const csv = await readBlobAsText(csvBlob);
      const exportedIds = csv
        .slice(1)
        .split('\r\n')
        .slice(1, -1)
        .map((row) => /^"([^"]+)"/.exec(row)?.[1]);

      expect(exportedIds).toHaveLength(31);
      expect(exportedIds[0]).toBe('pay_failed_31');
      expect(exportedIds.at(-1)).toBe('pay_failed_01');
      expect(csv).not.toContain('pay_succeeded');

      const toast = element.querySelector<HTMLElement>('.export-toast');
      const toastHost = element.querySelector<HTMLElement>('app-export-success-toast');

      expect(exportStatus?.getAttribute('role')).toBe('status');
      expect(exportStatus?.getAttribute('aria-live')).toBe('polite');
      expect(exportStatus?.getAttribute('aria-atomic')).toBe('true');
      expect(exportStatus?.textContent).toContain(
        'CSV export completed successfully. 31 payments exported.',
      );
      expect(toastHost?.getAttribute('aria-hidden')).toBe('true');
      expect(toast?.hasAttribute('role')).toBe(false);
      expect(toast?.textContent).toContain(
        'CSV export completed successfully. 31 payments exported.',
      );
      const toastHostStyle = getComputedStyle(toastHost!);

      expect(toastHostStyle.position).toBe('fixed');
      expect(toastHostStyle.insetInlineEnd).toBe('calc(24px + env(safe-area-inset-right))');
      expect(toastHostStyle.insetInlineStart).toBe('');
      expect(getComputedStyle(toast!).backgroundColor).toBe('rgb(23, 107, 58)');
    } finally {
      fixture.destroy();
      clickSpy.mockRestore();
      restoreCreateObjectUrl();
      restoreRevokeObjectUrl();
    }
  });

  it('restarts the success-toast timeout when another export completes', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const exportButton = findButton(element, 'Export');
    const restoreCreateObjectUrl = replaceUrlMethod(
      'createObjectURL',
      vi.fn(() => 'blob:payments-export'),
    );
    const restoreRevokeObjectUrl = replaceUrlMethod('revokeObjectURL', vi.fn());
    const clickSpy = vi
      .spyOn(window.HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    vi.useFakeTimers();

    try {
      exportButton.click();
      fixture.detectChanges();
      const firstToast = element.querySelector('.export-toast');

      expect(firstToast?.textContent).toContain(
        'CSV export completed successfully. 1 payment exported.',
      );

      vi.advanceTimersByTime(4_000);
      exportButton.click();
      fixture.detectChanges();

      const secondToast = element.querySelector('.export-toast');

      expect(secondToast).toBeTruthy();
      expect(secondToast).not.toBe(firstToast);

      vi.advanceTimersByTime(4_999);
      fixture.detectChanges();
      expect(element.querySelector('.export-toast')).toBeTruthy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(element.querySelector('.export-toast')).toBeNull();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      fixture.destroy();
      clickSpy.mockRestore();
      restoreCreateObjectUrl();
      restoreRevokeObjectUrl();
    }
  });

  it('does not announce success when the browser cannot create the download URL', async () => {
    const fixture = TestBed.createComponent(PaymentsTable);
    fixture.componentRef.setInput('payments', [payment]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const createObjectUrl = vi.fn(() => {
      throw new Error('Object URLs are unavailable.');
    });
    const restoreCreateObjectUrl = replaceUrlMethod('createObjectURL', createObjectUrl);

    try {
      findButton(element, 'Export').click();
      fixture.detectChanges();

      expect(createObjectUrl).toHaveBeenCalledOnce();
      expect(element.querySelector('.export-toast')).toBeNull();
    } finally {
      fixture.destroy();
      restoreCreateObjectUrl();
    }
  });
});
