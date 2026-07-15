import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import type { Payment } from '../payments/payment';
import {
  createPaymentsCsvFilename,
  PAYMENTS_CSV_MIME_TYPE,
  serializePaymentsCsv,
} from './payment-csv';

@Service({ autoProvided: false })
export class PaymentCsvDownloadAdapter {
  private readonly document = inject(DOCUMENT);

  download(payments: readonly Payment[], timestamp: Date): boolean {
    const browserWindow = this.document.defaultView;

    if (!browserWindow || typeof browserWindow.URL.createObjectURL !== 'function') {
      return false;
    }

    const downloadLink = this.document.createElement('a');
    let objectUrl: string | null = null;

    try {
      const csv = serializePaymentsCsv(payments);
      const blob = new browserWindow.Blob([csv], { type: PAYMENTS_CSV_MIME_TYPE });

      objectUrl = browserWindow.URL.createObjectURL(blob);
      downloadLink.href = objectUrl;
      downloadLink.download = createPaymentsCsvFilename(timestamp);
      downloadLink.hidden = true;
      this.document.body.append(downloadLink);
      downloadLink.click();
      return true;
    } catch {
      return false;
    } finally {
      downloadLink.remove();

      if (objectUrl !== null && typeof browserWindow.URL.revokeObjectURL === 'function') {
        browserWindow.URL.revokeObjectURL(objectUrl);
      }
    }
  }
}
