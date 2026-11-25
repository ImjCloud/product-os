import { BadRequestException } from '@nestjs/common';

export interface CursorPosition { id: string; value: string }
export interface PageRequest { limit: number; cursor?: CursorPosition }

/** Cursor is an opaque base64url JSON tuple. It is a navigation token, never an authorization token. */
export function parsePageRequest(limitValue?: string, cursorValue?: string): PageRequest | null {
  if (limitValue === undefined && cursorValue === undefined) return null;
  const limit = limitValue === undefined ? 25 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException('limit must be an integer between 1 and 100.');
  }
  if (cursorValue === undefined) return { limit };
  if (cursorValue.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursorValue)) {
    throw new BadRequestException('Invalid pagination cursor.');
  }
  try {
    const decoded = JSON.parse(Buffer.from(cursorValue, 'base64url').toString('utf8')) as unknown;
    if (!decoded || typeof decoded !== 'object') throw new Error('invalid');
    const value = decoded as Record<string, unknown>;
    if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 128 || typeof value.value !== 'string' || !Number.isFinite(Date.parse(value.value))) throw new Error('invalid');
    return { limit, cursor: { id: value.id, value: new Date(value.value).toISOString() } };
  } catch {
    throw new BadRequestException('Invalid pagination cursor.');
  }
}

export function encodePageCursor(id: string, value: Date): string {
  return Buffer.from(JSON.stringify({ id, value: value.toISOString() })).toString('base64url');
}

/** For descending (date, id) order; callers MUST also retain tenant/product/visibility predicates. */
export function afterCursor(field: string, cursor?: CursorPosition) {
  if (!cursor) return {};
  return { AND: [{ OR: [
    { [field]: { lt: new Date(cursor.value) } },
    { [field]: new Date(cursor.value), id: { lt: cursor.id } },
  ] }] };
}

export function pageResult<T extends { id: string }>(rows: T[], limit: number, dateOf: (row: T) => Date) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, hasMore, nextCursor: hasMore && last ? encodePageCursor(last.id, dateOf(last)) : null };
}
