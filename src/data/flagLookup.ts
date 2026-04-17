import { countries } from './countries';

// Map from lowercased term → flag emoji
const flagMap = new Map<string, string>();

// Track multi-word entries separately for longest-match-first
const multiWordTerms: { term: string; flag: string }[] = [];

// Transliterate non-ASCII characters to their ASCII equivalents
const charMap: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae',
  'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'ÿ': 'y',
  'ð': 'd', 'þ': 'th', 'ß': 'ss',
  'ā': 'a', 'ă': 'a', 'ą': 'a', 'ć': 'c', 'ĉ': 'c', 'č': 'c',
  'ď': 'd', 'đ': 'd', 'ē': 'e', 'ĕ': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
  'ğ': 'g', 'ĝ': 'g', 'ġ': 'g', 'ģ': 'g',
  'ĥ': 'h', 'ħ': 'h', 'ĩ': 'i', 'ī': 'i', 'ĭ': 'i', 'į': 'i',
  'ĵ': 'j', 'ķ': 'k', 'ĺ': 'l', 'ļ': 'l', 'ľ': 'l', 'ł': 'l',
  'ń': 'n', 'ņ': 'n', 'ň': 'n', 'ō': 'o', 'ŏ': 'o', 'ő': 'o', 'œ': 'oe',
  'ŕ': 'r', 'ř': 'r', 'ś': 's', 'ŝ': 's', 'ş': 's', 'š': 's',
  'ţ': 't', 'ť': 't', 'ũ': 'u', 'ū': 'u', 'ŭ': 'u', 'ů': 'u', 'ű': 'u', 'ų': 'u',
  'ŵ': 'w', 'ŷ': 'y', 'ź': 'z', 'ż': 'z', 'ž': 'z',
  '\u2019': "'", '\u2018': "'",
};

function transliterate(str: string): string {
  return str
    .split('')
    .map((ch) => charMap[ch.toLowerCase()] ?? ch)
    .join('');
}

function hasNonAscii(str: string): boolean {
  return /[^\x00-\x7F]/.test(str);
}

function addTerm(term: string, flag: string) {
  const lower = term.toLowerCase();
  if (!flagMap.has(lower)) {
    flagMap.set(lower, flag);
  }
  if (lower.includes(' ')) {
    multiWordTerms.push({ term: lower, flag });
  }
}

for (const country of countries) {
  const allTerms = [country.name, ...country.demonyms, ...country.aliases];

  for (const term of allTerms) {
    addTerm(term, country.flag);

    // Add transliterated version if the term has non-ASCII chars
    if (hasNonAscii(term)) {
      const ascii = transliterate(term);
      if (ascii.toLowerCase() !== term.toLowerCase()) {
        addTerm(ascii, country.flag);
      }
    }
  }
}

// Sort multi-word terms by length descending (longest match first)
multiWordTerms.sort((a, b) => b.term.length - a.term.length);

export { flagMap, multiWordTerms };
