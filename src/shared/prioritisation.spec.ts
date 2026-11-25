import { calculateRice } from './prioritisation';

describe('calculateRice', () => {
  it('calculates the prototype RICE score', () => {
    expect(calculateRice({ reach: 800, impact: 2, confidence: 80, effort: 4 })).toBe(320);
  });
  it('rejects zero effort instead of silently returning zero', () => {
    expect(() => calculateRice({ reach: 100, impact: 1, confidence: 50, effort: 0 })).toThrow();
  });
  it('rejects confidence outside 0–100', () => {
    expect(() => calculateRice({ reach: 100, impact: 1, confidence: 120, effort: 2 })).toThrow();
  });
});
