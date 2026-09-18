import { describe, expect, it } from 'vitest';
import { paginationOffset } from './pagination.dto';

describe('paginationOffset', () => {
  it('is 0 on the first page', () => {
    expect(paginationOffset({ page: 1, pageSize: 25 })).toBe(0);
  });

  it('skips one full page per page number', () => {
    expect(paginationOffset({ page: 2, pageSize: 25 })).toBe(25);
    expect(paginationOffset({ page: 3, pageSize: 10 })).toBe(20);
  });
});
