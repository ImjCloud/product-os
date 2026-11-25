import { createMetricSchema, updateMetricSchema } from './metrics.schemas';
describe('metric schemas', () => {
  it('accepts higher-is-better targets above baseline', () => {
    expect(createMetricSchema.safeParse({ name: 'Activation', baseline: 30, target: 60, actual: 42 }).success).toBe(true);
  });
  it('accepts lower-is-better targets below baseline', () => {
    expect(createMetricSchema.safeParse({ name: 'Latency', direction: 'LOWER_IS_BETTER', baseline: 800, target: 200, actual: 500 }).success).toBe(true);
  });
  it('rejects a lower-is-better target above baseline', () => {
    expect(createMetricSchema.safeParse({ name: 'Latency', direction: 'LOWER_IS_BETTER', baseline: 200, target: 800, actual: 500 }).success).toBe(false);
  });
  it('rejects empty updates', () => { expect(updateMetricSchema.safeParse({}).success).toBe(false); });
});
