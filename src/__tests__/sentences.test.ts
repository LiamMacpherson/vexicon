import { describe, it, expect } from 'vitest';
import { generateDailySentences } from '../data/sentences';

describe('generateDailySentences', () => {
  it('is deterministic for the same date', () => {
    const a = generateDailySentences('2024-04-10');
    const b = generateDailySentences('2024-04-10');
    expect(a).toEqual(b);
  });

  it('returns one sentence per difficulty and correct difficulty tags', () => {
    const d = generateDailySentences('2024-04-10');
    expect(d.easy).toHaveLength(1);
    expect(d.medium).toHaveLength(1);
    expect(d.hard).toHaveLength(1);
    expect(d.easy[0].difficulty).toBe('easy');
  });
});