import { createReleaseSchema, updateReleaseSchema, checkSchema } from './releases.schemas';
describe('release schemas', () => {
  it('requires a version', () => { expect(createReleaseSchema.safeParse({ version: '2.1.0' }).success).toBe(true); });
  it('rejects empty release updates', () => { expect(updateReleaseSchema.safeParse({}).success).toBe(false); });
  it('requires a boolean checklist value', () => { expect(checkSchema.safeParse({ completed: true }).success).toBe(true); expect(checkSchema.safeParse({ completed: 'yes' }).success).toBe(false); });
});
