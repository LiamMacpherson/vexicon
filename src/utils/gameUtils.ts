// Utility types and functions shared by DailyChallenge and DecodeGame
import { countries } from '../data/countries';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface FlagChoice {
  segmentIndex: number;
  flag: string;
  original: string;
  options: string[];
  correctAnswer: string;
  selected: string | null;
  hinted: boolean;
}

export function generateDistractors(correctName: string, count: number): string[] {
  const allNames = countries
    .map((c) => c.name)
    .filter((n) => n.toLowerCase() !== correctName.toLowerCase());
  const shuffled = allNames.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function findCountryName(original: string): string {
  const lower = original.toLowerCase();
  for (const c of countries) {
    if (c.name.toLowerCase() === lower) return c.name;
    if (c.demonyms.some((d) => d.toLowerCase() === lower)) return c.name;
    if (c.aliases.some((a) => a.toLowerCase() === lower)) return c.name;
  }
  return original;
}
