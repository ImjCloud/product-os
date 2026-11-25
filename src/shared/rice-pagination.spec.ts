import { BadRequestException } from '@nestjs/common';
import { parseRicePageRequest, ricePage } from './rice-pagination';

const rows = [
  { id: 'low', reach: 100, impact: 1, confidence: 50, effort: 2, updatedAt: new Date('2026-11-20T10:00:00.000Z') },
  { id: 'high', reach: 1000, impact: 2, confidence: 90, effort: 2, updatedAt: new Date('2026-11-19T10:00:00.000Z') },
  { id: 'tie-b', reach: 500, impact: 2, confidence: 80, effort: 2, updatedAt: new Date('2026-11-18T10:00:00.000Z') },
  { id: 'tie-a', reach: 500, impact: 2, confidence: 80, effort: 2, updatedAt: new Date('2026-11-18T10:00:00.000Z') },
];

describe('RICE-ranked pagination', () => {
  it('keeps legacy backlog requests unpaged', () => expect(parseRicePageRequest()).toBeNull());
  it('validates bounded page sizes and opaque cursors', () => {
    expect(parseRicePageRequest('2')?.limit).toBe(2);
    expect(() => parseRicePageRequest('101')).toThrow(BadRequestException);
    expect(() => parseRicePageRequest(undefined, 'bad cursor')).toThrow(BadRequestException);
  });
  it('returns globally ranked pages with no duplicates or gaps', () => {
    const first = ricePage(rows, 2);
    expect(first.items.map(x => x.id)).toEqual(['high', 'tie-b']);
    expect(first.hasMore).toBe(true);
    const cursor = parseRicePageRequest('2', first.nextCursor!)!.cursor;
    const second = ricePage(rows, 2, cursor);
    expect(second.items.map(x => x.id)).toEqual(['tie-a', 'low']);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();
  });
  it('uses updated date and id as deterministic tie breakers', () => {
    const page = ricePage(rows, 4);
    expect(page.items.map(x => x.id)).toEqual(['high', 'tie-b', 'tie-a', 'low']);
  });
});
