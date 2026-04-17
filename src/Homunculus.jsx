// ─── Sensory-Motor Homunculus Easter Egg ─────────────────────────────────────
import { useState } from 'react';
import { graphData } from './graphData';

const BODY_PARTS = [
  {
    id: 'head',
    label: 'Cortex',
    note: 'BCI: Digital Twin — cartographing the self',
    nodeId: 'bci',
    cx: 150, cy: 64, r: 44,
  },
  {
    id: 'mouth',
    label: 'Mouth',
    note: 'Large Language Models — language as compressed thought',
    nodeId: 'llm',
    cx: 150, cy: 90, rx: 28, ry: 13,
    type: 'ellipse',
  },
  {
    id: 'eyes',
    label: 'Eyes',
    note: 'Mechanistic Interpretability — seeing inside the black box',
    nodeId: 'interpretability',
    parts: [
      { cx: 132, cy: 54, rx: 9, ry: 7 },
      { cx: 168, cy: 54, rx: 9, ry: 7 },
    ],
    type: 'eyes',
  },
  {
    id: 'lhand',
    label: 'Left Hand',
    note: 'Structural Synthesis — making the invisible tangible',
    nodeId: 'cosplay',
    cx: 44, cy: 148, rx: 34, ry: 30,
    type: 'ellipse',
  },
  {
    id: 'rhand',
    label: 'Right Hand',
    note: 'Game Development — building interactive worlds',
    nodeId: 'gamedev',
    cx: 256, cy: 148, rx: 34, ry: 30,
    type: 'ellipse',
  },
  {
    id: 'trunk',
    label: 'Trunk',
    note: 'Cognitive Architecture — the load-bearing structure of mind',
    nodeId: 'cognitive-architecture',
    x: 113, y: 158, w: 74, h: 68, rx: 13,
    type: 'rect',
  },
  {
    id: 'feet',
    label: 'Feet',
    note: 'Little Druids — grounded in the soil, tending small things',
    nodeId: 'druids',
    parts: [
      { cx: 130, cy: 300, rx: 24, ry: 12 },
      { cx: 170, cy: 300, rx: 24, ry: 12 },
    ],
    type: 'feet',
  },
];

// Static positions for label lines (from body part to label text)
const LABELS = [
  { id: 'head',   x1: 194, y1: 38, x2: 220, y2: 22,  lx: 222, ly: 19,  text: 'Cortex → BCI',        side: 'right' },
  { id: 'mouth',  x1: 122, y1: 90, x2: 88,  y2: 96,  lx: 6,   ly: 94,  text: 'Mouth → Language',    side: 'left'  },
  { id: 'eyes',   x1: 120, y1: 50, x2: 86,  y2: 36,  lx: 4,   ly: 34,  text: 'Eyes → Interpretability', side: 'left' },
  { id: 'lhand',  x1: 18,  y1: 165, x2: 4,  y2: 182, lx: 4,   ly: 180, text: '← Cosplay',           side: 'left'  },
  { id: 'rhand',  x1: 282, y1: 165, x2: 296,y2: 182, lx: 298, ly: 180, text: 'Gamedev →',            side: 'right' },
  { id: 'trunk',  x1: 187, y1: 192, x2: 218,y2: 198, lx: 220, ly: 196, text: 'Architecture',         side: 'right' },
  { id: 'feet',   x1: 150, y1: 312, x2: 150,y2: 328, lx: 110, ly: 338, text: 'Druids',               side: 'center'},
];

export default function Homunculus({ onClose, onNodeSelect }) {
  const [hovered, setHovered] = useState(null);

  const handlePartClick = (part) => {
    const node = graphData.nodes.find(n => n.id === part.nodeId);
    if (node) { onNodeSelect(node); onClose(); }
  };

  const hoveredPart = BODY_PARTS.find(p => p.id === hovered);

  return (
    <div className="homunculus-overlay" onClick={onClose}>
      <div className="homunculus-panel" onClick={e => e.stopPropagation()}>
        <div className="homunculus-header">
          <div>
            <p className="homunculus-sublabel">sensory-motor cortex mapping</p>
            <h2 className="homunculus-title">Homunculus</h2>
          </div>
          <button className="homunculus-close" onClick={onClose}>✕</button>
        </div>

        <div className="homunculus-body">
          {/* SVG figure */}
          <svg className="homunculus-svg" viewBox="0 0 300 350" width="300" height="350">
            {/* Annotation lines */}
            {LABELS.map(l => (
              <g key={l.id} className={`hom-label${hovered === l.id ? ' hom-label--active' : ''}`}>
                <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke="rgba(232,184,109,0.25)" strokeWidth="0.8" />
                <text x={l.lx} y={l.ly}
                  fontSize="7" fontFamily="Inter, sans-serif"
                  fill="rgba(232,184,109,0.45)"
                  textAnchor={l.side === 'right' ? 'start' : l.side === 'center' ? 'middle' : 'start'}>
                  {l.text}
                </text>
              </g>
            ))}

            {/* Neck */}
            <rect x={137} y={109} width={26} height={22} rx={6}
              className="hom-part" fill="rgba(192,112,104,0.3)" stroke="rgba(232,184,109,0.2)" strokeWidth="1" />

            {/* Shoulder bar */}
            <rect x={77} y={133} width={146} height={14} rx={7}
              className="hom-part" fill="rgba(192,112,104,0.3)" stroke="rgba(232,184,109,0.2)" strokeWidth="1" />

            {/* Arms */}
            <rect x={77} y={133} width={56} height={12} rx={6}
              className="hom-part" fill="rgba(192,112,104,0.25)" />
            <rect x={167} y={133} width={56} height={12} rx={6}
              className="hom-part" fill="rgba(192,112,104,0.25)" />

            {/* Legs */}
            <rect x={117} y={228} width={24} height={68} rx={10}
              className="hom-part" fill="rgba(192,112,104,0.3)" stroke="rgba(232,184,109,0.2)" strokeWidth="1" />
            <rect x={159} y={228} width={24} height={68} rx={10}
              className="hom-part" fill="rgba(192,112,104,0.3)" stroke="rgba(232,184,109,0.2)" strokeWidth="1" />

            {/* ── Clickable body parts ── */}

            {/* Left hand (big) */}
            {BODY_PARTS.filter(p => p.type === 'ellipse' && p.id === 'lhand').map(p => (
              <ellipse key={p.id} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                className={`hom-part hom-interactive${hovered === p.id ? ' hom-part--hovered' : ''}`}
                onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => handlePartClick(p)} />
            ))}

            {/* Right hand (big) */}
            {BODY_PARTS.filter(p => p.type === 'ellipse' && p.id === 'rhand').map(p => (
              <ellipse key={p.id} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                className={`hom-part hom-interactive${hovered === p.id ? ' hom-part--hovered' : ''}`}
                onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => handlePartClick(p)} />
            ))}

            {/* Trunk */}
            {BODY_PARTS.filter(p => p.type === 'rect').map(p => (
              <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx}
                className={`hom-part hom-interactive${hovered === p.id ? ' hom-part--hovered' : ''}`}
                onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => handlePartClick(p)} />
            ))}

            {/* Feet */}
            {BODY_PARTS.filter(p => p.type === 'feet').map(p =>
              p.parts.map((fp, fi) => (
                <ellipse key={`${p.id}-${fi}`} cx={fp.cx} cy={fp.cy} rx={fp.rx} ry={fp.ry}
                  className={`hom-part hom-interactive${hovered === p.id ? ' hom-part--hovered' : ''}`}
                  onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                  onClick={() => handlePartClick(p)} />
              ))
            )}

            {/* Head (drawn on top for layering) */}
            {BODY_PARTS.filter(p => p.id === 'head').map(p => (
              <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r}
                className={`hom-part hom-interactive${hovered === p.id ? ' hom-part--hovered' : ''}`}
                onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => handlePartClick(p)} />
            ))}

            {/* Eyes */}
            {BODY_PARTS.filter(p => p.type === 'eyes').map(p =>
              p.parts.map((ep, ei) => (
                <ellipse key={`${p.id}-${ei}`} cx={ep.cx} cy={ep.cy} rx={ep.rx} ry={ep.ry}
                  className={`hom-part hom-interactive hom-eyes${hovered === p.id ? ' hom-part--hovered' : ''}`}
                  onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                  onClick={() => handlePartClick(p)} />
              ))
            )}

            {/* Mouth (big — cortical overrepresentation) */}
            {BODY_PARTS.filter(p => p.type === 'ellipse' && p.id === 'mouth').map(p => (
              <ellipse key={p.id} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                className={`hom-part hom-interactive hom-mouth${hovered === p.id ? ' hom-part--hovered' : ''}`}
                onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => handlePartClick(p)} />
            ))}
          </svg>

          {/* Tooltip card */}
          <div className={`homunculus-tooltip${hoveredPart ? ' homunculus-tooltip--visible' : ''}`}>
            {hoveredPart && (
              <>
                <p className="homunculus-tooltip__label">{hoveredPart.label}</p>
                <p className="homunculus-tooltip__note">{hoveredPart.note}</p>
                <p className="homunculus-tooltip__cta">click to explore →</p>
              </>
            )}
          </div>
        </div>

        <p className="homunculus-footer">
          each region's size reflects its cortical representation — the homunculus is proportioned by neural real estate, not physical anatomy.
        </p>
      </div>
    </div>
  );
}
