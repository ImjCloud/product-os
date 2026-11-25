import { createActionItemSchema, updateActionItemSchema } from './action-items.schemas';
describe('action item schemas', () => {
  it('accepts a minimally defined action item', () => { expect(createActionItemSchema.safeParse({ title: 'Confirm UAT sign-off' }).success).toBe(true); });
  it('rejects an unsupported status', () => { expect(createActionItemSchema.safeParse({ title: 'Confirm UAT sign-off', status: 'PENDING' }).success).toBe(false); });
  it('rejects empty updates', () => { expect(updateActionItemSchema.safeParse({}).success).toBe(false); });
});
