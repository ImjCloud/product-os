import { createRequirementSchema, updateRequirementSchema } from './requirements.schemas';

describe('requirement validation', () => {
  it('accepts a valid requirement with RICE inputs', () => {
    expect(createRequirementSchema.safeParse({
      title: 'Improve onboarding', reach: 500, impact: 2, confidence: 80, effort: 4,
    }).success).toBe(true);
  });

  it('rejects zero effort and confidence above 100', () => {
    expect(createRequirementSchema.safeParse({ title: 'Valid title', effort: 0 }).success).toBe(false);
    expect(createRequirementSchema.safeParse({ title: 'Valid title', confidence: 101 }).success).toBe(false);
  });

  it('rejects unknown fields and empty updates', () => {
    expect(createRequirementSchema.safeParse({ title: 'Valid title', admin: true }).success).toBe(false);
    expect(updateRequirementSchema.safeParse({}).success).toBe(false);
  });
});
