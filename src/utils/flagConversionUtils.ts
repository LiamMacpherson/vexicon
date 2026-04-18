import { flagMap, multiWordTerms } from '../data/flagLookup';

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'flag'; flag: string; original: string };

/**
 * Replace country names and demonyms with flag emojis.
 * Returns an array of text and flag segments for rich rendering.
 */
export function replaceWithFlags(input: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Try multi-word matches first (longest match wins)
    let matched = false;
    const remaining = input.slice(pos).toLowerCase();

    for (const { term, flag } of multiWordTerms) {
      if (remaining.startsWith(term)) {
        // Check word boundary after the match
        const afterIdx = pos + term.length;
        if (afterIdx >= input.length || isWordBoundary(input[afterIdx])) {
          segments.push({
            type: 'flag',
            flag,
            original: input.slice(pos, afterIdx),
          });
          pos = afterIdx;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // Extract the next word
    if (isWordChar(input[pos])) {
      const wordStart = pos;
      while (pos < input.length && isWordChar(input[pos])) {
        pos++;
      }
      const word = input.slice(wordStart, pos);
      const flag = lookupWord(word);
      if (flag) {
        segments.push({ type: 'flag', flag, original: word });
      } else {
        appendText(segments, word);
      }
    } else {
      // Non-word character (whitespace, punctuation, etc.)
      appendText(segments, input[pos]);
      pos++;
    }
  }

  return segments;
}

export function getAsText(segments: Segment[]): string {
  return segments
    .map(seg => (seg.type === 'flag' ? seg.flag : seg.text))
    .join('');
}

function lookupWord(word: string): string | null {
  const lower = word.toLowerCase();

  // Direct match
  const direct = flagMap.get(lower);
  if (direct) return direct;

  // Strip trailing punctuation and try again
  const stripped = lower.replace(/[''s]+$/i, '').replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (stripped && stripped !== lower) {
    const match = flagMap.get(stripped);
    if (match) return match;
  }

  // Try without trailing 's' (plural demonyms like "Americans")
  if (lower.endsWith('s') && lower.length > 3) {
    const singular = lower.slice(0, -1);
    const match = flagMap.get(singular);
    if (match) return match;
  }

  return null;
}

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{M}''-]/u.test(ch);
}

function isWordBoundary(ch: string): boolean {
  return !isWordChar(ch);
}

function appendText(segments: Segment[], text: string) {
  const last = segments[segments.length - 1];
  if (last && last.type === 'text') {
    last.text += text;
  } else {
    segments.push({ type: 'text', text });
  }
}