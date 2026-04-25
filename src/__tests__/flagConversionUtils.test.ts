import { describe, it, expect } from 'vitest';
import { replaceWithFlags, getAsText } from '../utils/flagConversionUtils';

describe('flagConversionUtils', () => {
  it('replaces simple country names and multi-word phrases', () => {
    const s1 = replaceWithFlags('I visited France.');
    expect(getAsText(s1)).toContain('🇫🇷');

    const s2 = replaceWithFlags('She lives in the United Kingdom.');
    expect(getAsText(s2)).toContain('🇬🇧');

    const s3 = replaceWithFlags('Åland Islands are small.');
    expect(getAsText(s3)).toContain('🇦🇽');
  });

  it('handles possessives and plurals', () => {
    const s1 = replaceWithFlags("France's cuisine is great.");
    expect(getAsText(s1)).toContain('🇫🇷');

    const s2 = replaceWithFlags('Americans love coffee.');
    expect(s2.some(seg => seg.type === 'flag')).toBeTruthy();
  });
});