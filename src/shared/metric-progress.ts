export type MetricDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export interface MetricValues {
  baseline: number;
  target: number;
  actual: number;
  direction: MetricDirection;
}

/**
 * Returns progress from baseline to target, clamped to 0–100.
 * For lower-is-better metrics (e.g. latency, error rate), improvement is a decrease.
 * A baseline already at target is treated as complete only when actual also meets target.
 */
export function calculateMetricProgress(metric: MetricValues): number {
  const { baseline, target, actual, direction } = metric;
  if (![baseline, target, actual].every(Number.isFinite)) {
    throw new Error('Metric values must be finite numbers.');
  }

  if (direction === 'HIGHER_IS_BETTER') {
    if (target <= baseline) throw new Error('Higher-is-better target must exceed baseline.');
    return Math.max(0, Math.min(100, Math.round(((actual - baseline) / (target - baseline)) * 100)));
  }

  if (direction === 'LOWER_IS_BETTER') {
    if (target >= baseline) throw new Error('Lower-is-better target must be below baseline.');
    return Math.max(0, Math.min(100, Math.round(((baseline - actual) / (baseline - target)) * 100)));
  }

  throw new Error('Unsupported metric direction.');
}
