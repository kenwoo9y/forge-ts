import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './utils';

describe('formatDate', () => {
  it('null の場合："-" を返す', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('日付文字列の場合：先頭10文字（YYYY-MM-DD）を返す', () => {
    expect(formatDate('2024-12-31T00:00:00.000Z')).toBe('2024-12-31');
  });

  it('ちょうど10文字の場合：そのまま返す', () => {
    expect(formatDate('2024-12-31')).toBe('2024-12-31');
  });
});

describe('formatDateTime', () => {
  it('null の場合："-" を返す', () => {
    expect(formatDateTime(null)).toBe('-');
  });

  it('日時文字列の場合：YYYY/MM/DD HH:mm 形式で返す', () => {
    expect(formatDateTime('2024-12-31T23:59:00')).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it('月・日・時・分が1桁の場合：ゼロ埋めされる', () => {
    const date = new Date(2024, 0, 5, 3, 7, 0);
    const result = formatDateTime(date.toISOString());
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    expect(result).toContain('/01/');
  });
});
