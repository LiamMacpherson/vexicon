
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock sentences to produce a deterministic hard-mode sentence with punctuation
vi.mock('../data/sentences', () => ({
  generateRound: (difficulty: any) => [
    { id: 999, text: 'I went to Brazil, on holiday.', difficulty },
  ],
  curatedSentences: [],
}));

import DecodeGame from '../components/DecodeGame';

describe('DecodeGame punctuation handling (expected behaviour)', () => {
  it('considers "Brazil" correct even when answer is "Brazil," in hard mode', async () => {
    render(<DecodeGame />);

    // Switch to Hard mode
    const hardBtn = await screen.findByText('Hard');
    fireEvent.click(hardBtn);

    // Wait for the text input to appear
    const textarea = await screen.findByPlaceholderText('Type the decoded sentence...');

    // User types the sentence without punctuation for the last word
    fireEvent.change(textarea, { target: { value: 'I went to Brazil' } });

    // The guess word "Brazil" should be marked correct even though the answer has a trailing comma.
    const brazil = await screen.findByText('Brazil');

    // Expectation models the desired behaviour: punctuation-insensitive word matching
    expect(brazil.classList.contains('word-correct')).toBe(true);
  });
});
