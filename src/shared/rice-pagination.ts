import { BadRequestException } from '@nestjs/common';
import { calculateRice } from './prioritisation';

export interface RiceCursor { score: number; updatedAt: string; id: string }
export interface RicePageRequest { limit: number; cursor?: RiceCursor }

/** RICE is derived from four editable fields, so it is sorted consistently in application code. */
export function parseRicePageRequest(limitValue?: string, cursorValue?: string): RicePageRequest | null {
  if (limitValue === undefined && cursorValue === undefined) return null;
  const limit = limitValue === undefined ? 25 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException('limit must be an integer between 1 and 100.');
  }
  if (cursorValue === undefined) return { limit };
  if (cursorValue.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursorValue)) {
    throw new BadRequestException('Invalid RICE pagination cursor.');
  }
  try {
    const decoded = JSON.parse(Buffer.from(cursorValue, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (!decoded || typeof decoded !== 'object' || typeof decoded.id !== 'string' || !decoded.id || decoded.id.length > 128 || typeof decoded.score !== 'number' || !Number.isFinite(decoded.score) || typeof decoded.updatedAt !== 'string' || !Number.isFinite(Date.parse(decoded.updatedAt))) throw new Error('invalid');
    return { limit, cursor: { id: decoded.id, score: decoded.score, updatedAt: new Date(decoded.updatedAt).toISOString() } };
  } catch {
    throw new BadRequestException('Invalid RICE pagination cursor.');
  }
}

export function ricePage<T extends { id: string; updatedAt: Date; reach: number; impact: number; confidence: number; effort: number }>(rows: T[], limit: number, cursor?: RiceCursor) {
  const ranked = rows.map(row => ({ ...row, riceScore: calculateRice(row) }))
    .sort((a, b) => b.riceScore - a.riceScore || b.updatedAt.getTime() - a.updatedAt.getTime() || b.id.localeCompare(a.id));
  const remaining = cursor ? ranked.filter(row => row.riceScore < cursor.score || (row.riceScore === cursor.score && (row.updatedAt.getTime() < Date.parse(cursor.updatedAt) || (row.updatedAt.getTime() === Date.parse(cursor.updatedAt) && row.id.localeCompare(cursor.id) < 0)))) : ranked;
  const hasMore = remaining.length > limit;
  const items = remaining.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ id: last.id, score: last.riceScore, updatedAt: last.updatedAt.toISOString() })).toString('base64url') : null;
  return { items, hasMore, nextCursor };
}
