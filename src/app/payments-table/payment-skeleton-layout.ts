export const PAYMENT_SKELETON_ROW_HEIGHT_PX = 36;

export interface PaymentSkeletonLayout {
  readonly rowCount: number;
  readonly rowHeightPx: number;
}

export const DEFAULT_PAYMENT_SKELETON_LAYOUT: PaymentSkeletonLayout = {
  rowCount: 25,
  rowHeightPx: PAYMENT_SKELETON_ROW_HEIGHT_PX,
};

export function calculatePaymentSkeletonLayout(
  viewportHeight: number,
  headerHeight: number,
  minimumRowHeight = PAYMENT_SKELETON_ROW_HEIGHT_PX,
): PaymentSkeletonLayout {
  if (
    !Number.isFinite(viewportHeight) ||
    !Number.isFinite(headerHeight) ||
    !Number.isFinite(minimumRowHeight) ||
    minimumRowHeight <= 0
  ) {
    return DEFAULT_PAYMENT_SKELETON_LAYOUT;
  }

  const bodyHeight = Math.max(0, viewportHeight - Math.max(0, headerHeight));

  if (bodyHeight === 0) {
    return DEFAULT_PAYMENT_SKELETON_LAYOUT;
  }

  const rowCount = Math.max(1, Math.floor(bodyHeight / minimumRowHeight));

  return {
    rowCount,
    rowHeightPx: bodyHeight / rowCount,
  };
}
