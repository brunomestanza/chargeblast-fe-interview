import {
  DEFAULT_PAYMENT_SKELETON_LAYOUT,
  calculatePaymentSkeletonLayout,
} from './payment-skeleton-layout';

describe('payment skeleton layout', () => {
  it('keeps the regular 60px row density when the body divides evenly', () => {
    expect(calculatePaymentSkeletonLayout(944, 44)).toEqual({
      rowCount: 15,
      rowHeightPx: 60,
    });
  });

  it('uses only complete row slots and distributes the remaining height', () => {
    expect(calculatePaymentSkeletonLayout(574, 44)).toEqual({
      rowCount: 8,
      rowHeightPx: 66.25,
    });
  });

  it('keeps one row when the available body is shorter than a regular row', () => {
    expect(calculatePaymentSkeletonLayout(89, 44)).toEqual({
      rowCount: 1,
      rowHeightPx: 45,
    });
  });

  it('preserves the fallback while browser geometry is unavailable', () => {
    expect(calculatePaymentSkeletonLayout(0, 0)).toBe(DEFAULT_PAYMENT_SKELETON_LAYOUT);
    expect(calculatePaymentSkeletonLayout(Number.NaN, 44)).toBe(DEFAULT_PAYMENT_SKELETON_LAYOUT);
  });
});
