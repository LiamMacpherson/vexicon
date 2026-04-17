import { useState } from 'react'
import { replaceWithFlags, type Segment } from './utils/replaceWithFlags'
import ModeToggle from './components/ModeToggle'
import DecodeGame from './components/DecodeGame'
import DailyChallenge from './components/DailyChallenge'
import './App.css'

function App() {
  const [mode, setMode] = useState<'encode' | 'daily' | 'practice'>('encode')
  const [text, setText] = useState('')
  const segments: Segment[] = text ? replaceWithFlags(text) : []

  const subtitle = {
    encode: 'Type a sentence — country names and demonyms become flag emojis',
    daily: 'Today\'s challenge — progress through Easy, Medium, and Hard',
    practice: 'Practice decoding flags at your own pace',
  }[mode]

  return (
    <div className="app">
      <header className="header">
        <h1>🏳️ Vexicon</h1>
        <p className="subtitle">{subtitle}</p>
      </header>

      <ModeToggle mode={mode} onChange={setMode} />

      {mode === 'encode' && (
        <>
          <textarea
            className="input"
            placeholder="Try: I love France and the Brazilian people..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />

          <div className="output" aria-live="polite">
            {segments.length === 0 && (
              <span className="placeholder">Your flagified text will appear here…</span>
            )}
            {segments.map((seg, i) =>
              seg.type === 'flag' ? (
                <span key={i} className="flag-token" title={seg.original}>
                  {seg.flag}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </div>
        </>
      )}

      {mode === 'daily' && <DailyChallenge />}
      {mode === 'practice' && <DecodeGame />}
    </div>
  )
}

export default App
