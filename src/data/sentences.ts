import { faker } from '@faker-js/faker';
import { countries, type CountryEntry } from './countries';

export interface GameSentence {
  id: number;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

type Difficulty = 'easy' | 'medium' | 'hard';

// Countries grouped by familiarity for difficulty levels
const easyCountries = [
  'France', 'Japan', 'Germany', 'Italy', 'Mexico', 'Greece', 'Canada',
  'China', 'Australia', 'Brazil', 'Spain', 'India', 'Russia', 'Egypt',
  'United States', 'United Kingdom',
];

const mediumCountries = [
  'New Zealand', 'Singapore', 'Norway', 'Denmark', 'Sweden', 'Thailand',
  'Portugal', 'Colombia', 'Ethiopia', 'Turkey', 'Morocco', 'Netherlands',
  'Argentina', 'Uruguay', 'Poland', 'South Korea', 'Ireland', 'Switzerland',
  'Austria', 'Belgium', 'Vietnam', 'Philippines', 'Chile', 'Peru',
];

const hardCountries = [
  'Liechtenstein', 'Bhutan', 'Nepal', 'Myanmar', 'Luxembourg', 'Malta',
  'Cyprus', 'Iceland', 'Fiji', 'Samoa', 'Tonga', 'Latvia', 'Estonia',
  'Lithuania', 'Paraguay', 'Bolivia', 'Azerbaijan', 'Georgia', 'Armenia',
  'Namibia', 'Botswana', 'Zimbabwe', 'Brunei', 'Bahrain', 'Oman',
  'Suriname', 'Andorra', 'Monaco', 'San Marino', 'Lesotho',
];

function getCountryEntry(name: string): CountryEntry | undefined {
  return countries.find(
    (c) =>
      c.name.toLowerCase() === name.toLowerCase() ||
      c.aliases.some((a) => a.toLowerCase() === name.toLowerCase())
  );
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Slots: {0n} = country name, {0d} = demonym
type SlotType = 'name' | 'demonym';
type Template = {
  pattern: string;
  slots: SlotType[];
};

const templates: Template[] = [
  // 1-country templates
  { pattern: `${p('name')} just got back from a trip to {0}.`, slots: ['name'] },
  { pattern: `The {0} restaurant on ${p('street')} is fantastic.`, slots: ['demonym'] },
  { pattern: `${p('name')} studied abroad in {0} for a year.`, slots: ['name'] },
  { pattern: `My favourite {0} dish is absolutely delicious.`, slots: ['demonym'] },
  { pattern: `We are planning a holiday to {0} next year.`, slots: ['name'] },
  { pattern: `${p('name')} brought back {0} souvenirs for everyone.`, slots: ['demonym'] },
  { pattern: `The documentary about {0} was truly eye-opening.`, slots: ['name'] },
  { pattern: `${p('name')} has always dreamed of visiting {0}.`, slots: ['name'] },
  { pattern: `The {0} team won the championship last night.`, slots: ['demonym'] },
  { pattern: `${p('name')} is learning the {0} language.`, slots: ['demonym'] },
  { pattern: `A {0} film just won best picture at the festival.`, slots: ['demonym'] },
  { pattern: `The {0} embassy is located on ${p('street')}.`, slots: ['demonym'] },

  // 2-country templates
  { pattern: `${p('name')} flew from {0} to {1} last month.`, slots: ['name', 'name'] },
  { pattern: `The {0} and {1} delegations met at the summit.`, slots: ['demonym', 'demonym'] },
  { pattern: `{0} cuisine pairs surprisingly well with {1} wine.`, slots: ['demonym', 'demonym'] },
  { pattern: `${p('name')} compared {0} culture with {1} traditions.`, slots: ['demonym', 'demonym'] },
  { pattern: `The trade deal between {0} and {1} was historic.`, slots: ['name', 'name'] },
  { pattern: `${p('name')} moved from {0} to {1} for work.`, slots: ['name', 'name'] },

  // 3-country templates
  { pattern: `${p('name')} backpacked through {0}, {1}, and {2}.`, slots: ['name', 'name', 'name'] },
  { pattern: `The {0}, {1}, and {2} athletes competed fiercely.`, slots: ['demonym', 'demonym', 'demonym'] },
  { pattern: `${p('name')} tried {0}, {1}, and {2} food all in one week.`, slots: ['demonym', 'demonym', 'demonym'] },
];

function p(type: 'name' | 'street'): string {
  // Placeholder — resolved at generation time
  return `__${type}__`;
}

function resolvePlaceholders(text: string): string {
  return text
    .replace(/__name__/g, () => faker.person.firstName())
    .replace(/__street__/g, () => faker.location.street());
}

function getPoolForDifficulty(difficulty: Difficulty): string[] {
  switch (difficulty) {
    case 'easy':
      return easyCountries;
    case 'medium':
      return mediumCountries;
    case 'hard':
      return hardCountries;
  }
}

function slotCountForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return Math.random() > 0.5 ? 1 : 2;
    case 'medium':
      return Math.random() > 0.5 ? 2 : 3;
    case 'hard':
      return Math.random() > 0.3 ? 3 : 2;
  }
}

function getRef(entry: CountryEntry | undefined, countryName: string, slotType: SlotType): string {
  if (!entry) return countryName;
  if (slotType === 'demonym' && entry.demonyms.length > 0) {
    return entry.demonyms[Math.floor(Math.random() * entry.demonyms.length)];
  }
  return entry.name;
}

function getSeededRef(entry: CountryEntry | undefined, countryName: string, slotType: SlotType, rng: () => number): string {
  if (!entry) return countryName;
  if (slotType === 'demonym' && entry.demonyms.length > 0) {
    return entry.demonyms[Math.floor(rng() * entry.demonyms.length)];
  }
  return entry.name;
}

export function generateSentence(difficulty: Difficulty, id: number): GameSentence {
  const slotCount = slotCountForDifficulty(difficulty);
  const pool = getPoolForDifficulty(difficulty);
  const countryNames = pickRandom(pool, slotCount);

  // Pick a template with the right slot count
  const matchingTemplates = templates.filter((t) => t.slots.length === slotCount);
  const template = matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];

  let text = template.pattern;
  for (let i = 0; i < slotCount; i++) {
    const entry = getCountryEntry(countryNames[i]);
    const ref = getRef(entry, countryNames[i], template.slots[i]);
    text = text.replace(`{${i}}`, ref);
  }

  text = resolvePlaceholders(text);

  return { id, text, difficulty };
}

export function generateRound(difficulty: Difficulty, count = 10): GameSentence[] {
  return Array.from({ length: count }, (_, i) =>
    generateSentence(difficulty, i + 1)
  );
}

// Simple seeded PRNG (mulberry32)
function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDateString(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash + date.charCodeAt(i)) | 0;
  }
  return hash;
}

function seededPickRandom<T>(arr: T[], count: number, rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export interface DailySentences {
  date: string;
  easy: GameSentence[];
  medium: GameSentence[];
  hard: GameSentence[];
}

export function generateDailySentences(dateStr: string): DailySentences {
  const seed = hashDateString(dateStr);
  const rng = createSeededRng(seed);

  // Seed faker for deterministic names/streets
  faker.seed(seed);

  const generate = (difficulty: Difficulty, count: number): GameSentence[] => {
    const pool = getPoolForDifficulty(difficulty);
    return Array.from({ length: count }, (_, i) => {
      const slotCount = difficulty === 'easy'
        ? (rng() > 0.5 ? 1 : 2)
        : difficulty === 'medium'
          ? (rng() > 0.5 ? 2 : 3)
          : (rng() > 0.3 ? 3 : 2);

      const countryNames = seededPickRandom(pool, slotCount, rng);
      let matchingTemplates = templates.filter((t) => t.slots.length === slotCount);
      // Hard mode: ensure at least one demonym slot
      if (difficulty === 'hard') {
        const withDemonym = matchingTemplates.filter((t) => t.slots.includes('demonym'));
        if (withDemonym.length > 0) matchingTemplates = withDemonym;
      }
      const template = matchingTemplates[Math.floor(rng() * matchingTemplates.length)];

      let text = template.pattern;
      for (let j = 0; j < slotCount; j++) {
        const entry = getCountryEntry(countryNames[j]);
        const ref = getSeededRef(entry, countryNames[j], template.slots[j], rng);
        text = text.replace(`{${j}}`, ref);
      }
      text = resolvePlaceholders(text);

      return { id: i + 1, text, difficulty };
    });
  };

  const result = {
    date: dateStr,
    easy: generate('easy', 1),
    medium: generate('medium', 1),
    hard: generate('hard', 1),
  };

  // Reset faker seed so practice mode stays random
  faker.seed();

  return result;
}

// Pre-baked sentences as fallback / curated pool
export const curatedSentences: GameSentence[] = [
  // Easy
  { id: 101, text: "I visited France last summer.", difficulty: "easy" },
  { id: 102, text: "The Brazilian coffee was amazing.", difficulty: "easy" },
  { id: 103, text: "She moved to Japan for work.", difficulty: "easy" },
  { id: 104, text: "German cars are well engineered.", difficulty: "easy" },
  { id: 105, text: "He brought Italian wine to dinner.", difficulty: "easy" },
  { id: 106, text: "I love Mexican food.", difficulty: "easy" },
  { id: 107, text: "They honeymooned in Greece.", difficulty: "easy" },
  { id: 108, text: "Canadian maple syrup is the best.", difficulty: "easy" },
  { id: 109, text: "The Chinese lanterns lit up the sky.", difficulty: "easy" },
  { id: 110, text: "We watched the Australian Open.", difficulty: "easy" },
  // Medium
  { id: 201, text: "She flew from New Zealand to the United States via Singapore.", difficulty: "medium" },
  { id: 202, text: "The Swedish band toured Norway and Denmark.", difficulty: "medium" },
  { id: 203, text: "Thai cuisine rivals Indian cooking in spice.", difficulty: "medium" },
  { id: 204, text: "Portuguese explorers mapped the coast of Brazil.", difficulty: "medium" },
  { id: 205, text: "The Egyptian pyramids and Greek temples are ancient wonders.", difficulty: "medium" },
  { id: 206, text: "Colombian coffee and Ethiopian beans dominate the market.", difficulty: "medium" },
  { id: 207, text: "Turkish rugs and Moroccan tiles decorated the room.", difficulty: "medium" },
  { id: 208, text: "The Dutch painter was inspired by Spain and Italy.", difficulty: "medium" },
  { id: 209, text: "Argentine and Uruguayan teams met in the final.", difficulty: "medium" },
  { id: 210, text: "She studied Polish history while living in Germany.", difficulty: "medium" },
  // Hard
  { id: 301, text: "The Liechtenstein delegation met the Trinidadian ambassador.", difficulty: "hard" },
  { id: 302, text: "Bhutanese monks visited monasteries in Nepal and Myanmar.", difficulty: "hard" },
  { id: 303, text: "The Luxembourgish economy outperforms many larger nations.", difficulty: "hard" },
  { id: 304, text: "Maltese and Cypriot divers explored the Mediterranean.", difficulty: "hard" },
  { id: 305, text: "The Icelandic volcano disrupted flights across Ireland and Belgium.", difficulty: "hard" },
  { id: 306, text: "Fijian rugby players trained with the Samoan and Tongan teams.", difficulty: "hard" },
  { id: 307, text: "The Latvian choir sang alongside Estonian and Lithuanian performers.", difficulty: "hard" },
  { id: 308, text: "Paraguayan artists exhibited alongside Bolivian sculptors in Peru.", difficulty: "hard" },
  { id: 309, text: "The Azerbaijani director filmed in Georgia and Armenia.", difficulty: "hard" },
  { id: 310, text: "Namibian wildlife rivals that of Botswana and Zimbabwe.", difficulty: "hard" },
];
