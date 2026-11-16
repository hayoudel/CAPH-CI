import { describe, expect, it } from 'vitest';
import { formatDate } from '../lib/format';

describe('format', () => {
  it('formate une date en français', () => {
    expect(formatDate('2026-11-03T12:00:00Z')).toMatch(/3 novembre 2026/);
  });
  it('renvoie une chaîne vide sans date', () => {
    expect(formatDate(null)).toBe('');
  });
});
