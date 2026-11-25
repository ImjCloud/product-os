import { calculateMetricProgress } from './metric-progress';

describe('calculateMetricProgress', () => {
  it('supports higher-is-better metrics', () => {
    expect(calculateMetricProgress({
      baseline: 82, target: 98, actual: 90, direction: 'HIGHER_IS_BETTER',
    })).toBe(50);
  });
  it('supports lower-is-better metrics such as response time', () => {
    expect(calculateMetricProgress({
      baseline: 800, target: 200, actual: 500, direction: 'LOWER_IS_BETTER',
    })).toBe(50);
  });
  it('clamps progress when actual exceeds target', () => {
    expect(calculateMetricProgress({
      baseline: 800, target: 200, actual: 100, direction: 'LOWER_IS_BETTER',
    })).toBe(100);
  });
});
