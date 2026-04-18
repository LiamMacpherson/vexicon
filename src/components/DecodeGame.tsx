import { useState, useCallback, useEffect, useRef } from 'react';
import { generateRound, curatedSentences, type GameSentence } from '../data/sentences';
import { countries, checkWrongForm } from '../data/countries';
import { replaceWithFlags, type Segment } from '../utils/flagConversionUtils';

type Difficulty = 'easy' | 'medium' | 'hard';

interface FlagChoice {
  segmentIndex: number;
  flag: string;
  original: string;
  options: string[];      // multiple choice options (country/demonym names)
  correctAnswer: string;  // the correct option
  selected: string | null;
  hinted: boolean;
}

interface GameState {
  sentence: GameSentence;
  encoded: Segment[];
  // Hard mode state
  guess: string;
  // Easy/Medium mode state
  flagChoices: FlagChoice[];
  solved: boolean;
  startTime: number;
  elapsed: number;
  hintsUsed: number;
  revealedFlags: Set<number>;
}

function generateDistractors(correctName: string, count: number): string[] {
  const allNames = countries
    .map((c) => c.name)
    .filter((n) => n.toLowerCase() !== correctName.toLowerCase());
  const shuffled = allNames.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Find the country name that matches a given original word (name or demonym)
function findCountryName(original: string): string {
  const lower = original.toLowerCase();
  for (const c of countries) {
    if (c.name.toLowerCase() === lower) return c.name;
    if (c.demonyms.some((d) => d.toLowerCase() === lower)) return c.name;
    if (c.aliases.some((a) => a.toLowerCase() === lower)) return c.name;
  }
  return original;
}

export default function DecodeGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [sentences, setSentences] = useState<GameSentence[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const isMultipleChoice = difficulty === 'easy' || difficulty === 'medium';

  // Generate sentences when difficulty changes
  useEffect(() => {
    const curated = curatedSentences.filter((s) => s.difficulty === difficulty);
    const generated = generateRound(difficulty, 10);
    const combined = shuffleArray([...curated, ...generated]);
    setSentences(combined);
    setRoundIndex(0);
  }, [difficulty]);

  const startRound = useCallback(() => {
    if (sentences.length === 0) return;
    const sentence = sentences[roundIndex % sentences.length];
    const encoded = replaceWithFlags(sentence.text);

    // Build multiple-choice options for easy/medium
    const flagChoices: FlagChoice[] = [];
    if (isMultipleChoice) {
      encoded.forEach((seg, i) => {
        if (seg.type === 'flag') {
          const countryName = findCountryName(seg.original);
          const distractorCount = difficulty === 'easy' ? 2 : 3;
          const distractors = generateDistractors(countryName, distractorCount);
          const options = shuffleArray([countryName, ...distractors]);
          flagChoices.push({
            segmentIndex: i,
            flag: seg.flag,
            original: seg.original,
            options,
            correctAnswer: countryName,
            selected: null,
            hinted: false,
          });
        }
      });
    }

    setGameState({
      sentence,
      encoded,
      guess: '',
      flagChoices,
      solved: false,
      startTime: Date.now(),
      elapsed: 0,
      hintsUsed: 0,
      revealedFlags: new Set(),
    });
    if (!isMultipleChoice) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [sentences, roundIndex, isMultipleChoice, difficulty]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  // Timer
  useEffect(() => {
    if (gameState && !gameState.solved) {
      timerRef.current = setInterval(() => {
        setGameState((prev) =>
          prev ? { ...prev, elapsed: Date.now() - prev.startTime } : prev
        );
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState?.solved, gameState?.startTime]);

  if (!gameState) return null;

  const handleChoice = (choiceIdx: number, option: string, isHint = false) => {
    if (gameState.solved) return;
    const newChoices = [...gameState.flagChoices];
    newChoices[choiceIdx] = {
      ...newChoices[choiceIdx],
      selected: option,
      hinted: isHint || newChoices[choiceIdx].hinted,
    };

    const allAnswered = newChoices.every((c) => c.selected !== null);
    const userCorrect = newChoices.filter((c) => c.selected === c.correctAnswer && !c.hinted).length;
    const totalChoices = newChoices.length;
    const hintsUsed = isHint ? gameState.hintsUsed + 1 : gameState.hintsUsed;
    const allCorrect = userCorrect === totalChoices;

    const updated: GameState = { ...gameState, flagChoices: newChoices, solved: allAnswered, hintsUsed };
    if (allAnswered) {
      updated.elapsed = Date.now() - gameState.startTime;
      if (allCorrect) {
        const points = Math.max(10 - hintsUsed * 3, 1);
        setScore((s) => s + points);
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
    }
    setGameState(updated);
  };

  const handleTextInput = (value: string) => {
    if (gameState.solved) return;
    const updated = { ...gameState, guess: value };

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalize(value) === normalize(gameState.sentence.text)) {
      updated.solved = true;
      updated.elapsed = Date.now() - gameState.startTime;
      const points = Math.max(10 - gameState.hintsUsed * 3, 1);
      setScore((s) => s + points);
      setStreak((s) => s + 1);
    }

    setGameState(updated);
  };

  const useHint = () => {
    if (gameState.solved) return;

    if (isMultipleChoice) {
      const unanswered = gameState.flagChoices
        .map((c, i) => (c.selected === null ? i : -1))
        .filter((i) => i >= 0);
      if (unanswered.length === 0) return;
      const idx = unanswered[Math.floor(Math.random() * unanswered.length)];
      handleChoice(idx, gameState.flagChoices[idx].correctAnswer, true);
    } else {
      // Reveal a flag in the encoded display
      const flagIndices = gameState.encoded
        .map((seg, i) => (seg.type === 'flag' ? i : -1))
        .filter((i) => i >= 0 && !gameState.revealedFlags.has(i));

      if (flagIndices.length === 0) return;
      const idx = flagIndices[Math.floor(Math.random() * flagIndices.length)];
      const newRevealed = new Set(gameState.revealedFlags);
      newRevealed.add(idx);
      setGameState({
        ...gameState,
        hintsUsed: gameState.hintsUsed + 1,
        revealedFlags: newRevealed,
      });
    }
  };

  const nextRound = () => {
    setRoundIndex((r) => r + 1);
  };

  const newSentences = () => {
    const curated = curatedSentences.filter((s) => s.difficulty === difficulty);
    const generated = generateRound(difficulty, 10);
    setSentences(shuffleArray([...curated, ...generated]));
    setRoundIndex(0);
  };

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${secs}.${tenths}s`;
  };

  // Word-by-word comparison for hard mode
  const guessWords = gameState.guess.trim().split(/\s+/).filter(Boolean);
  const answerWords = gameState.sentence.text.trim().split(/\s+/);

  return (
    <div className="decode-game">
      {/* Difficulty selector & stats */}
      <div className="game-header">
        <div className="difficulty-selector">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`diff-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => {
                setDifficulty(d);
                setScore(0);
                setStreak(0);
              }}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="game-stats">
          <span>⏱ {formatTime(gameState.elapsed)}</span>
          <span>🏆 {score}</span>
          <span>🔥 {streak}</span>
        </div>
      </div>

      {/* Mode indicator */}
      <div className="mode-indicator">
        {isMultipleChoice
          ? '🎯 Select the correct country for each flag'
          : '⌨️ Type the full decoded sentence'}
      </div>

      {/* Encoded sentence display */}
      <div className="encoded-sentence">
        <p className="label">Decode this sentence:</p>
        <div className="encoded-text">
          {gameState.encoded.map((seg, i) => {
            if (seg.type !== 'flag') return <span key={i}>{seg.text}</span>;

            // Check if this flag has been answered via multiple choice
            const choice = gameState.flagChoices.find((c) => c.segmentIndex === i);
            const answered = choice?.selected != null;
            const hintRevealed = gameState.revealedFlags.has(i);

            if (answered) {
              const correct = choice!.selected === choice!.correctAnswer;
              return (
                <span key={i} className={`flag-resolved ${correct ? 'correct' : 'wrong'}`}>
                  {seg.original}
                  {' '}<span className="flag-inline">({seg.flag})</span>
                </span>
              );
            }

            if (hintRevealed) {
              return (
                <span key={i} className="flag-resolved hint">
                  {seg.original} <span className="flag-inline">({seg.flag})</span>
                </span>
              );
            }

            return <span key={i} className="flag-token">{seg.flag}</span>;
          })}
        </div>
      </div>

      {/* Multiple choice (easy/medium) */}
      {isMultipleChoice && (
        <div className="choices-container">
          {gameState.flagChoices.map((choice, ci) => (
            <div key={ci} className="flag-question">
              <span className="flag-label">{choice.flag} →</span>
              <div className="choice-options">
                {choice.options.map((option) => {
                  const isSelected = choice.selected === option;
                  const isCorrect = option === choice.correctAnswer;
                  const showResult = choice.selected !== null;

                  let className = 'choice-btn';
                  if (showResult && isSelected && isCorrect) className += ' correct';
                  if (showResult && isSelected && !isCorrect) className += ' wrong';
                  if (showResult && !isSelected && isCorrect) className += ' reveal-correct';

                  return (
                    <button
                      key={option}
                      className={className}
                      onClick={() => handleChoice(ci, option)}
                      disabled={choice.selected !== null}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text input (hard mode) */}
      {!isMultipleChoice && (
        <>
          <textarea
            ref={inputRef}
            className="input decode-input"
            placeholder="Type the decoded sentence..."
            value={gameState.guess}
            onChange={(e) => handleTextInput(e.target.value)}
            rows={3}
            disabled={gameState.solved}
          />

          {guessWords.length > 0 && (
            <div className="word-feedback">
              {guessWords.map((word, i) => {
                if (i >= answerWords.length) {
                  return <span key={i} className="word-wrong">{word}</span>;
                }
                const correct = word.toLowerCase() === answerWords[i].toLowerCase();
                if (correct) {
                  return <span key={i} className="word-correct">{word}</span>;
                }
                const wrongForm = checkWrongForm(word, answerWords[i]);
                if (wrongForm) {
                  const tip = wrongForm === 'demonym'
                    ? 'Ensure you are using the correct demonym'
                    : 'Ensure you are using the correct country name';
                  return (
                    <span key={i} className="word-close" onClick={(e) => e.currentTarget.classList.toggle('tip-open')}>
                      {word}<span className="word-tip">{tip}</span>
                    </span>
                  );
                }
                return <span key={i} className="word-wrong">{word}</span>;
              })}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="game-actions">
        {!gameState.solved && (
          <button className="hint-btn" onClick={useHint}>
            💡 Hint (−3 pts)
          </button>
        )}
        {gameState.solved && (() => {
          const correctCount = gameState.flagChoices.filter((c) => c.selected === c.correctAnswer && !c.hinted).length;
          const total = gameState.flagChoices.length;
          const perfect = total === 0 ? gameState.hintsUsed === 0 : correctCount === total;
          return (
            <div className={`success-msg ${perfect ? '' : 'partial'}`}>
              <span className="confetti">{perfect ? '🎉' : '😅'}</span>
              {perfect
                ? ` Decoded in ${formatTime(gameState.elapsed)}!`
                : ` ${correctCount}/${total} correct — ${formatTime(gameState.elapsed)}`}
              <button className="next-btn" onClick={nextRound}>
                Next →
              </button>
            </div>
          );
        })()}
        <button className="hint-btn" onClick={newSentences} title="Generate fresh sentences">
          🔄 New sentences
        </button>
      </div>
    </div>
  );
}
