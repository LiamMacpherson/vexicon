import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { generateDailySentences, type GameSentence } from '../data/sentences';
import { countries, checkWrongForm } from '../data/countries';
import { replaceWithFlags, type Segment } from '../utils/replaceWithFlags';

type Difficulty = 'easy' | 'medium' | 'hard';
const STAGES: Difficulty[] = ['easy', 'medium', 'hard'];
const STAGE_LABELS: Record<Difficulty, string> = {
  easy: '🟢 Easy',
  medium: '🟡 Medium',
  hard: '🔴 Hard',
};

interface FlagChoice {
  segmentIndex: number;
  flag: string;
  original: string;
  options: string[];
  correctAnswer: string;
  selected: string | null;
  hinted: boolean;
}

interface RoundState {
  sentence: GameSentence;
  encoded: Segment[];
  guess: string;
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

function findCountryName(original: string): string {
  const lower = original.toLowerCase();
  for (const c of countries) {
    if (c.name.toLowerCase() === lower) return c.name;
    if (c.demonyms.some((d) => d.toLowerCase() === lower)) return c.name;
    if (c.aliases.some((a) => a.toLowerCase() === lower)) return c.name;
  }
  return original;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyChallenge() {
  const today = getTodayString();
  const daily = useMemo(() => generateDailySentences(today), [today]);

  const [stageIndex, setStageIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [stageResults, setStageResults] = useState<Record<Difficulty, { score: number; time: number; perfect: boolean }>>({
    easy: { score: 0, time: 0, perfect: false },
    medium: { score: 0, time: 0, perfect: false },
    hard: { score: 0, time: 0, perfect: false },
  });
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [dailyComplete, setDailyComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stageAnswers, setStageAnswers] = useState<Record<Difficulty, { encoded: Segment[]; flagChoices: FlagChoice[]; sentence: GameSentence }[]>>({
    easy: [], medium: [], hard: [],
  });
  const [expandedStage, setExpandedStage] = useState<Difficulty | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentStage = STAGES[stageIndex];
  const stageSentences = daily[currentStage];
  const isMultipleChoice = currentStage !== 'hard';

  const initRound = useCallback(() => {
    if (roundIndex >= stageSentences.length) return;
    const sentence = stageSentences[roundIndex];
    const encoded = replaceWithFlags(sentence.text);

    const flagChoices: FlagChoice[] = [];
    if (isMultipleChoice) {
      encoded.forEach((seg, i) => {
        if (seg.type === 'flag') {
          const countryName = findCountryName(seg.original);
          const distractorCount = currentStage === 'easy' ? 2 : 3;
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

    setRoundState({
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
  }, [stageSentences, roundIndex, isMultipleChoice, currentStage]);

  useEffect(() => {
    initRound();
  }, [initRound]);

  // Timer
  useEffect(() => {
    if (roundState && !roundState.solved) {
      timerRef.current = setInterval(() => {
        setRoundState((prev) =>
          prev ? { ...prev, elapsed: Date.now() - prev.startTime } : prev
        );
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [roundState?.solved, roundState?.startTime]);

  const totalScore = stageResults.easy.score + stageResults.medium.score + stageResults.hard.score;
  const totalTime = stageResults.easy.time + stageResults.medium.time + stageResults.hard.time;

  const buildShareText = (): string => {
    const scoreBar = (score: number) => {
      const filled = Math.round(score);
      return '🟩'.repeat(Math.min(filled, 10)) + '⬛'.repeat(Math.max(10 - filled, 0));
    };
    const lines = [
      `🏳️ Vexicon Daily — ${today}`,
      ``,
      `🟢 Easy   ${scoreBar(stageResults.easy.score)} ${stageResults.easy.score}/10  ${formatTime(stageResults.easy.time)}`,
      `🟡 Medium ${scoreBar(stageResults.medium.score)} ${stageResults.medium.score}/10  ${formatTime(stageResults.medium.time)}`,
      `🔴 Hard   ${scoreBar(stageResults.hard.score)} ${stageResults.hard.score}/10  ${formatTime(stageResults.hard.time)}`,
      ``,
      `Total: ${totalScore}/30 — ${formatTime(totalTime)}`,
    ];
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (dailyComplete) {
    return (
      <div className="daily-complete">
        <div className="daily-complete-inner">
          <span className="big-emoji">🏁</span>
          <h2>Daily Challenge Complete!</h2>
          <p className="daily-date">📅 {today}</p>

          <div className="daily-results-table">
            {STAGES.map((stage) => {
              const r = stageResults[stage];
              const answers = stageAnswers[stage];
              const isExpanded = expandedStage === stage;
              return (
                <div key={stage} className="result-row-group">
                  <div
                    className={`result-row clickable ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedStage(isExpanded ? null : stage)}
                  >
                    <span className="result-stage">
                      {isExpanded ? '▼' : '▶'} {STAGE_LABELS[stage]}
                    </span>
                    <span className="result-score">{r.score}/10</span>
                    <span className="result-time">{formatTime(r.time)}</span>
                    <span className="result-badge">{r.perfect ? '⭐' : ''}</span>
                  </div>
                  {isExpanded && answers.length > 0 && (
                    <div className="result-detail">
                      {answers.map((a, ai) => (
                        <div key={ai} className="result-sentence">
                          {a.encoded.map((seg, si) => {
                            if (seg.type !== 'flag') return <span key={si}>{seg.text}</span>;
                            const choice = a.flagChoices.find((c) => c.segmentIndex === si);
                            const userCorrect = choice ? choice.selected === choice.correctAnswer && !choice.hinted : false;
                            return (
                              <span key={si} className={`flag-resolved ${userCorrect ? 'correct' : 'wrong'}`}>
                                {seg.original}
                                {' '}<span className="flag-inline">({seg.flag})</span>
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="result-row total">
              <span className="result-stage">Total</span>
              <span className="result-score">{totalScore}/30</span>
              <span className="result-time">{formatTime(totalTime)}</span>
              <span className="result-badge"></span>
            </div>
          </div>

          <button className="share-btn" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy results'}
          </button>

          <pre className="share-preview">{buildShareText()}</pre>

          <p className="daily-comeback">Come back tomorrow for a new challenge!</p>
        </div>
      </div>
    );
  }

  if (!roundState) return null;

  const handleChoice = (choiceIdx: number, option: string, isHint = false) => {
    if (roundState.solved) return;
    const newChoices = [...roundState.flagChoices];
    newChoices[choiceIdx] = {
      ...newChoices[choiceIdx],
      selected: option,
      hinted: isHint || newChoices[choiceIdx].hinted,
    };

    const allAnswered = newChoices.every((c) => c.selected !== null);
    // Only count non-hinted correct answers for score
    const userCorrect = newChoices.filter((c) => c.selected === c.correctAnswer && !c.hinted).length;
    const totalChoices = newChoices.length;
    const hintsUsed = isHint ? roundState.hintsUsed + 1 : roundState.hintsUsed;

    const updated: RoundState = { ...roundState, flagChoices: newChoices, solved: allAnswered, hintsUsed };
    if (allAnswered) {
      updated.elapsed = Date.now() - roundState.startTime;
      const accuracy = totalChoices > 0 ? userCorrect / totalChoices : 0;
      const points = Math.max(Math.round(10 * accuracy), 0);
      const perfect = userCorrect === totalChoices && hintsUsed === 0;
      setStageResults((prev) => ({
        ...prev,
        [currentStage]: {
          score: prev[currentStage].score + points,
          time: prev[currentStage].time + updated.elapsed,
          perfect: prev[currentStage].perfect || perfect,
        },
      }));
      setStageAnswers((prev) => ({
        ...prev,
        [currentStage]: [...prev[currentStage], {
          encoded: roundState.encoded,
          flagChoices: newChoices,
          sentence: roundState.sentence,
        }],
      }));
    }
    setRoundState(updated);
  };

  const handleTextInput = (value: string) => {
    if (roundState.solved) return;
    const updated = { ...roundState, guess: value };

    const normalize = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalize(value) === normalize(roundState.sentence.text)) {
      updated.solved = true;
      updated.elapsed = Date.now() - roundState.startTime;
      const points = Math.max(10 - roundState.hintsUsed * 3, 1);
      setStageResults((prev) => ({
        ...prev,
        [currentStage]: {
          score: prev[currentStage].score + points,
          time: prev[currentStage].time + updated.elapsed,
          perfect: prev[currentStage].perfect || roundState.hintsUsed === 0,
        },
      }));
      setStageAnswers((prev) => ({
        ...prev,
        [currentStage]: [...prev[currentStage], {
          encoded: roundState.encoded,
          flagChoices: roundState.flagChoices,
          sentence: roundState.sentence,
        }],
      }));
    }

    setRoundState(updated);
  };

  const useHint = () => {
    if (roundState.solved) return;

    if (isMultipleChoice) {
      const unanswered = roundState.flagChoices
        .map((c, i) => (c.selected === null ? i : -1))
        .filter((i) => i >= 0);
      if (unanswered.length === 0) return;
      const idx = unanswered[Math.floor(Math.random() * unanswered.length)];
      handleChoice(idx, roundState.flagChoices[idx].correctAnswer, true);
    } else {
      const flagIndices = roundState.encoded
        .map((seg, i) => (seg.type === 'flag' ? i : -1))
        .filter((i) => i >= 0 && !roundState.revealedFlags.has(i));

      if (flagIndices.length === 0) return;
      const idx = flagIndices[Math.floor(Math.random() * flagIndices.length)];
      const newRevealed = new Set(roundState.revealedFlags);
      newRevealed.add(idx);
      setRoundState({
        ...roundState,
        hintsUsed: roundState.hintsUsed + 1,
        revealedFlags: newRevealed,
      });
    }
  };

  const handleNext = () => {
    const nextRound = roundIndex + 1;
    if (nextRound < stageSentences.length) {
      // More rounds in this stage
      setRoundIndex(nextRound);
    } else {
      // Stage complete
      const newCompleted = new Set(completedStages);
      newCompleted.add(stageIndex);
      setCompletedStages(newCompleted);

      const nextStage = stageIndex + 1;
      if (nextStage < STAGES.length) {
        setStageIndex(nextStage);
        setRoundIndex(0);
      } else {
        // All stages done!
        setDailyComplete(true);
      }
    }
  };

  const guessWords = roundState.guess.trim().split(/\s+/).filter(Boolean);
  const answerWords = roundState.sentence.text.trim().split(/\s+/);

  const isLastRoundOfStage = roundIndex === stageSentences.length - 1;
  const isLastStage = stageIndex === STAGES.length - 1;

  return (
    <div className="decode-game">
      {/* Daily header */}
      <div className="daily-header">
        <span className="daily-date">📅 {today}</span>
        <div className="game-stats">
          <span>⏱ {formatTime(roundState.elapsed)}</span>
          <span>🏁 {totalScore}</span>
        </div>
      </div>

      {/* Stage progress */}
      <div className="stage-progress">
        {STAGES.map((stage, idx) => {
          const isCompleted = completedStages.has(idx);
          const isCurrent = idx === stageIndex;
          const isLocked = idx > stageIndex;

          return (
            <div
              key={stage}
              className={`stage-pill ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
            >
              {isCompleted ? '✓ ' : isLocked ? '🔒 ' : ''}
              {STAGE_LABELS[stage]}
              {isCurrent && (
                <span className="round-counter">
                  {' '}({roundIndex + 1}/{stageSentences.length})
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mode indicator */}
      <div className="mode-indicator">
        {isMultipleChoice
          ? '🎯 Select the correct country for each flag'
          : '⌨️ Type the full decoded sentence'}
      </div>

      {/* Encoded sentence */}
      <div className="encoded-sentence">
        <p className="label">Decode this sentence:</p>
        <div className="encoded-text">
          {roundState.encoded.map((seg, i) => {
            if (seg.type !== 'flag') return <span key={i}>{seg.text}</span>;

            const choice = roundState.flagChoices.find((c) => c.segmentIndex === i);
            const answered = choice?.selected != null;
            const hintRevealed = roundState.revealedFlags.has(i);

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

      {/* Multiple choice */}
      {isMultipleChoice && (
        <div className="choices-container">
          {roundState.flagChoices.map((choice, ci) => (
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
            value={roundState.guess}
            onChange={(e) => handleTextInput(e.target.value)}
            rows={3}
            disabled={roundState.solved}
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
        {!roundState.solved && (
          <button className="hint-btn" onClick={useHint}>
            💡 Hint (−3 pts)
          </button>
        )}
        {roundState.solved && (() => {
          const correctCount = roundState.flagChoices.filter((c) => c.selected === c.correctAnswer && !c.hinted).length;
          const total = roundState.flagChoices.length;
          const perfect = total === 0 ? roundState.hintsUsed === 0 : correctCount === total;
          return (
            <div className={`success-msg ${perfect ? '' : 'partial'}`}>
              <span className="confetti">{perfect ? '🎉' : '😅'}</span>
              {perfect
                ? `Decoded in ${formatTime(roundState.elapsed)}!`
                : `${correctCount}/${total} correct — ${formatTime(roundState.elapsed)}`}
              <button className="next-btn" onClick={handleNext}>
                {isLastRoundOfStage
                  ? isLastStage
                    ? 'Finish! 🏁'
                    : `Next: ${STAGE_LABELS[STAGES[stageIndex + 1]]} →`
                  : 'Next →'}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${secs}.${tenths}s`;
}
