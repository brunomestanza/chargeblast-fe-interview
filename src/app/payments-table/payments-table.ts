import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Payment } from './payment';
import { PaymentCopyState, PaymentRow } from './payment-row';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const PAGE_SIZE_STORAGE_KEY = 'chargeblast.payments.page-size';

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function isPageSize(value: number): value is PageSize {
  return value === 25 || value === 50 || value === 100;
}

@Component({
  selector: 'app-payments-table',
  imports: [PaymentRow],
  templateUrl: './payments-table.html',
  styleUrl: './payments-table.css',
})
export class PaymentsTable {
  readonly payments = input.required<readonly Payment[]>();

  protected readonly copyState = signal<PaymentCopyState | null>(null);
  protected readonly currentTime = signal<number | null>(null);
  protected readonly timeZone = signal('UTC');
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly pageSize = signal<PageSize>(DEFAULT_PAGE_SIZE);
  protected readonly currentPage = signal(1);
  protected readonly paymentCountLabel = computed(() => {
    const count = this.payments().length;
    return count === 1 ? '1 payment' : count + ' payments';
  });
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.payments().length / this.pageSize())),
  );
  protected readonly paginatedPayments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.payments().slice(startIndex, startIndex + this.pageSize());
  });
  protected readonly paginationRangeLabel = computed(() => {
    const paymentCount = this.payments().length;

    if (paymentCount === 0) {
      return 'Viewing 0 of 0 payments';
    }

    const firstPayment = (this.currentPage() - 1) * this.pageSize() + 1;
    const lastPayment = Math.min(firstPayment + this.pageSize() - 1, paymentCount);
    const paymentLabel = paymentCount === 1 ? 'payment' : 'payments';

    return `Viewing ${firstPayment}–${lastPayment} of ${paymentCount} ${paymentLabel}`;
  });
  protected readonly copyAnnouncement = computed(() => {
    const state = this.copyState();

    if (!state) {
      return '';
    }

    return state.status === 'copied'
      ? 'Payment ID ' + state.paymentId + ' copied to clipboard.'
      : 'Payment ID ' + state.paymentId + ' could not be copied. Try again.';
  });

  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly keepCurrentPageInBounds = effect(() => {
    const pageCount = this.pageCount();

    untracked(() => {
      if (this.currentPage() > pageCount) {
        this.currentPage.set(pageCount);
      }
    });
  });
  private feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  private clockTimer: number | undefined;

  constructor() {
    afterNextRender(() => this.startBrowserState());
    this.destroyRef.onDestroy(() => {
      this.clearFeedbackTimer();
      this.stopClock();
    });
  }

  protected async copyPaymentId(paymentId: string): Promise<void> {
    this.clearFeedbackTimer();
    const clipboard = this.document.defaultView?.navigator.clipboard;

    if (!clipboard) {
      this.showCopyFeedback(paymentId, 'failed');
      return;
    }

    try {
      await clipboard.writeText(paymentId);
      this.showCopyFeedback(paymentId, 'copied');
    } catch {
      this.showCopyFeedback(paymentId, 'failed');
    }
  }

  protected changePageSize(event: Event): void {
    const selectedPageSize = Number((event.target as HTMLSelectElement).value);

    if (!isPageSize(selectedPageSize)) {
      return;
    }

    this.currentPage.set(1);
    this.pageSize.set(selectedPageSize);
    this.storePageSize(selectedPageSize);
  }

  protected showPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected showNextPage(): void {
    this.currentPage.update((page) => Math.min(this.pageCount(), page + 1));
  }

  private startBrowserState(): void {
    const browserWindow = this.document.defaultView;

    if (!browserWindow) {
      return;
    }

    this.restorePageSize(browserWindow);
    this.timeZone.set(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    this.currentTime.set(Date.now());
    this.clockTimer = browserWindow.setInterval(() => this.currentTime.set(Date.now()), 60_000);
  }

  private restorePageSize(browserWindow: Window): void {
    try {
      const storedPageSize = Number(browserWindow.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));

      if (isPageSize(storedPageSize)) {
        this.pageSize.set(storedPageSize);
      }
    } catch {
      // Browser privacy settings can make localStorage unavailable.
    }
  }

  private storePageSize(pageSize: PageSize): void {
    try {
      this.document.defaultView?.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {
      // Keep pagination usable when localStorage is unavailable.
    }
  }

  private stopClock(): void {
    const browserWindow = this.document.defaultView;

    if (browserWindow && this.clockTimer !== undefined) {
      browserWindow.clearInterval(this.clockTimer);
      this.clockTimer = undefined;
    }
  }

  private showCopyFeedback(paymentId: string, status: PaymentCopyState['status']): void {
    this.copyState.set({ paymentId, status });
    this.feedbackTimer = setTimeout(() => {
      if (this.copyState()?.paymentId === paymentId) {
        this.copyState.set(null);
      }
    }, 1800);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer !== undefined) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = undefined;
    }
  }
}
