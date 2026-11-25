import { createFeedbackSchema, createProductSchema, updateFeedbackSchema } from './products-feedback.schemas';
describe('Products & Feedback schemas', () => {
  it('rejects blank product names', () => expect(createProductSchema.safeParse({ name: ' ' }).success).toBe(false));
  it('accepts a valid product name', () => expect(createProductSchema.safeParse({ name: 'Customer Portal' }).success).toBe(true));
  it('rejects malformed URLs', () => expect(createFeedbackSchema.safeParse({ text: 'An issue', sourceUrl: 'bad' }).success).toBe(false));
  it('rejects empty updates', () => expect(updateFeedbackSchema.safeParse({}).success).toBe(false));
  it('rejects unknown update fields', () => expect(updateFeedbackSchema.safeParse({ status: 'DONE', organisationId: 'x' }).success).toBe(false));
});
