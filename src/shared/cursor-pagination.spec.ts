import { BadRequestException } from '@nestjs/common';
import { afterCursor, encodePageCursor, pageResult, parsePageRequest } from './cursor-pagination';

describe('cursor pagination', () => {
  it('keeps legacy requests unpaged', () => expect(parsePageRequest()).toBeNull());
  it('defaults the page size and caps it at 100', () => {
    const token = encodePageCursor('row_1', new Date('2026-11-23T10:00:00.000Z'));
    expect(parsePageRequest(undefined, token)?.limit).toBe(25);
    expect(() => parsePageRequest('101')).toThrow(BadRequestException);
    expect(() => parsePageRequest('0')).toThrow(BadRequestException);
    expect(() => parsePageRequest('2.5')).toThrow(BadRequestException);
  });
  it('round trips a cursor and rejects malformed tokens', () => {
    const token = encodePageCursor('row_1', new Date('2026-11-23T10:00:00.000Z'));
    expect(parsePageRequest(undefined, token)?.cursor).toEqual({ id: 'row_1', value: '2026-11-23T10:00:00.000Z' });
    expect(() => parsePageRequest(undefined, 'not a cursor')).toThrow(BadRequestException);
    expect(() => parsePageRequest(undefined, Buffer.from('{"id":"x","value":"bad"}').toString('base64url'))).toThrow(BadRequestException);
  });
  it('builds a stable descending composite cursor predicate', () => {
    expect(afterCursor('createdAt', { id: 'b', value: '2026-11-23T10:00:00.000Z' })).toEqual({ AND: [{ OR: [
      { createdAt: { lt: new Date('2026-11-23T10:00:00.000Z') } },
      { createdAt: new Date('2026-11-23T10:00:00.000Z'), id: { lt: 'b' } },
    ] }] });
  });
  it('keeps cursor conditions composable with search OR filters', () => {
    const cursor = afterCursor('occurredAt', { id: 'x', value: '2026-11-23T10:00:00.000Z' });
    expect(cursor).toHaveProperty('AND');
    expect(cursor).not.toHaveProperty('OR');
  });
  it('returns only the requested rows and a continuation token', () => {
    const rows = [1, 2, 3].map(n => ({ id: `id${n}`, createdAt: new Date(`2026-11-2${n}T00:00:00Z`) }));
    const result = pageResult(rows, 2, row => row.createdAt);
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(parsePageRequest('2', result.nextCursor!)?.cursor?.id).toBe('id2');
  });
});

