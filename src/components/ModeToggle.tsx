interface ModeToggleProps {
  mode: 'encode' | 'daily' | 'practice';
  onChange: (mode: 'encode' | 'daily' | 'practice') => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${mode === 'encode' ? 'active' : ''}`}
        onClick={() => onChange('encode')}
      >
        ✏️ Encode
      </button>
      <button
        className={`mode-btn ${mode === 'daily' ? 'active' : ''}`}
        onClick={() => onChange('daily')}
      >
        📅 Daily
      </button>
      <button
        className={`mode-btn ${mode === 'practice' ? 'active' : ''}`}
        onClick={() => onChange('practice')}
      >
        🎮 Practice
      </button>
    </div>
  );
}
