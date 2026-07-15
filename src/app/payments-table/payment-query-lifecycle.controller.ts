import { DestroyRef, Service, inject, signal } from '@angular/core';
import { PAYMENT_QUERY_DELAY } from './payment-query-delay';
import type { PaymentViewState } from './payment-view-state';

export interface PaymentQueryRequest {
  readonly viewState: PaymentViewState;
  readonly announceResult: () => void;
  readonly writeUrl: boolean;
}

export interface PaymentQueryLifecycleBinding {
  readonly prepareRequest: () => void;
  readonly loadingStarted: () => void;
  readonly applyViewState: (viewState: PaymentViewState) => void;
  readonly completeRequest: (request: PaymentQueryRequest) => void;
}

@Service({ autoProvided: false })
export class PaymentQueryLifecycleController {
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryDelay = inject(PAYMENT_QUERY_DELAY);

  private readonly loadingState = signal(false);
  readonly isLoading = this.loadingState.asReadonly();

  private binding: PaymentQueryLifecycleBinding | undefined;
  private queryTimer: ReturnType<typeof setTimeout> | undefined;
  private queryRequestId = 0;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancel();
      this.binding = undefined;
    });
  }

  connect(binding: PaymentQueryLifecycleBinding): void {
    if (this.binding) {
      throw new Error('The payment query lifecycle controller can only be connected once.');
    }

    this.binding = binding;
  }

  request(request: PaymentQueryRequest): void {
    const binding = this.binding;

    if (!binding) {
      throw new Error('The payment query lifecycle controller must be connected before use.');
    }

    this.cancel();
    const requestId = ++this.queryRequestId;
    binding.prepareRequest();
    this.loadingState.set(true);
    binding.loadingStarted();

    const applyResponse = (): void => {
      if (requestId !== this.queryRequestId) {
        return;
      }

      this.queryTimer = undefined;
      binding.applyViewState(request.viewState);
      this.loadingState.set(false);
      binding.completeRequest(request);
    };
    const delay = this.queryDelay();

    if (delay <= 0) {
      applyResponse();
      return;
    }

    this.queryTimer = setTimeout(applyResponse, delay);
  }

  cancel(): void {
    this.queryRequestId += 1;

    if (this.queryTimer !== undefined) {
      clearTimeout(this.queryTimer);
      this.queryTimer = undefined;
    }

    this.loadingState.set(false);
  }
}
