// ─── Stream-of-Consciousness Journal ─────────────────────────────────────────
import { useState, useEffect } from 'react';

const THOUGHTS = [
  "The brain is not a computer. It is a river that thinks it is a mountain.",
  "Every neuron that fires is a vote. Consciousness is the electoral college.",
  "Memory is not storage. It is reconstruction — each recall a subtle forgery.",
  "Intelligence emerged from evolution's brute search. Alignment asks us to do better by design.",
  "The prefrontal cortex is the most recently evolved part of you. It is also the first to fail under stress.",
  "A language model predicts the next token. A mind predicts the next consequence.",
  "Synaptic plasticity is the physical embodiment of: you are not the same person you were yesterday.",
  "The hippocampus doesn't store memories — it stores the indices to reconstruct them.",
  "What is attention, really? The allocation of finite processing to infinite input.",
  "Every model of the mind is a metaphor. The map eating the territory.",
  "BCI is not about controlling machines with thought. It's about understanding what thought is.",
  "O(n!) problems aren't unsolved — they're waiting for the right abstraction.",
  "Consciousness might be what information processing feels like from the inside.",
  "The gap between neurons is not empty — it is the site of all learning.",
  "Dopamine is not pleasure. It is prediction error. The brain lives in the delta.",
  "Seven items. That's all working memory can hold before the palace collapses.",
  "The adversary reveals what the defender refused to imagine.",
];

export default function Journal({ onClose }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = THOUGHTS[idx];

  // Reset typewriter on thought change
  useEffect(() => {
    setDisplayed('');
    setCharIdx(0);
  }, [idx]);

  // Typewriter tick
  useEffect(() => {
    if (paused) return;
    if (charIdx >= current.length) {
      const t = setTimeout(() => setIdx(i => (i + 1) % THOUGHTS.length), 4200);
      return () => clearTimeout(t);
    }
    const delay = current[charIdx] === '.' || current[charIdx] === '—' ? 90 : 26;
    const t = setTimeout(() => {
      setDisplayed(current.slice(0, charIdx + 1));
      setCharIdx(c => c + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, current, paused]);

  return (
    <div className="journal-overlay" onClick={onClose}>
      <div className="journal" onClick={e => e.stopPropagation()}>
        <div className="journal__header">
          <span className="journal__sublabel">stream of consciousness</span>
          <button className="journal__close" onClick={onClose}>✕</button>
        </div>
        <div className="journal__body">
          <p className="journal__text">
            {displayed}
            <span className="journal__cursor" aria-hidden="true">▌</span>
          </p>
        </div>
        <div className="journal__footer">
          <button className="journal__nav" onClick={() => setIdx(i => (i - 1 + THOUGHTS.length) % THOUGHTS.length)}>←</button>
          <span className="journal__progress">{idx + 1} / {THOUGHTS.length}</span>
          <button className="journal__nav" onClick={() => setIdx(i => (i + 1) % THOUGHTS.length)}>→</button>
          <button className="journal__pause" onClick={() => setPaused(p => !p)}>
            {paused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
    </div>
  );
}
