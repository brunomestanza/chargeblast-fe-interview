import {
  DEFAULT_PAYMENT_SKELETON_LAYOUT,
  calculatePaymentSkeletonLayout,
} from './payment-skeleton-layout';

describe('payment skeleton layout', () => {
  it('keeps the regular 36px row density when the body divides evenly', () => {
    expect(calculatePaymentSkeletonLayout(936, 36)).toEqual({
      rowCount: 25,
      rowHeightPx: 36,
    });
  });

  it('uses only complete row slots and distributes the remaining height', () => {
    expect(calculatePaymentSkeletonLayout(574, 36)).toEqual({
      rowCount: 14,
      rowHeightPx: 38.42857142857143,
    });
  });

  it('keeps one row when the available body is shorter than a regular row', () => {
    expect(calculatePaymentSkeletonLayout(89, 36)).toEqual({
      rowCount: 1,
      rowHeightPx: 53,
    });
  });

  it('preserves the fallback while browser geometry is unavailable', () => {
    expect(calculatePaymentSkeletonLayout(0, 0)).toBe(DEFAULT_PAYMENT_SKELETON_LAYOUT);
    expect(calculatePaymentSkeletonLayout(Number.NaN, 36)).toBe(DEFAULT_PAYMENT_SKELETON_LAYOUT);
  });
});
