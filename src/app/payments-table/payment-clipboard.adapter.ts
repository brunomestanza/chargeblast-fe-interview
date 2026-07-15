import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';

@Service({ autoProvided: false })
export class PaymentClipboardAdapter {
  private readonly document = inject(DOCUMENT);

  writeText(value: string): boolean | Promise<boolean> {
    const clipboard = this.document.defaultView?.navigator.clipboard;

    if (!clipboard) {
      return false;
    }

    try {
      return clipboard.writeText(value).then(
        () => true,
        () => false,
      );
    } catch {
      return false;
    }
  }
}
