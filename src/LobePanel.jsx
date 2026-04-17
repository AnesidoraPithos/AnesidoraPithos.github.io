import { graphData } from './graphData';

const LOBE_DISPLAY = {
  frontal:  { label: 'Prefrontal Cortex', sublabel: 'Projects & Planning' },
  temporal: { label: 'Temporal Lobes',    sublabel: 'Language & Memory'   },
  parietal: { label: 'Parietal Cortex',   sublabel: 'Spatial Reasoning'   },
  occipital:{ label: 'Occipital Lobe',    sublabel: 'Visual Work'          },
  center:   { label: 'Cerebellum / Core', sublabel: 'Core & Skills'        },
};

export default function LobePanel({ lobeKey, onNodeSelect }) {
  const cfg = lobeKey ? LOBE_DISPLAY[lobeKey] : null;
  const nodes = lobeKey
    ? graphData.nodes.filter(n => n.lobe === lobeKey && n.id !== 'mind')
    : [];

  return (
    <aside className={`lobe-panel${lobeKey ? ' lobe-panel--visible' : ''}`}>
      {cfg && (
        <>
          <div className="lobe-panel__header">
            <p className="lobe-panel__sublabel">{cfg.sublabel}</p>
            <h2 className="lobe-panel__title">{cfg.label}</h2>
          </div>
          <ul className="lobe-panel__node-list">
            {nodes.map(node => (
              <li key={node.id}>
                <button
                  className="lobe-panel__node-card"
                  onClick={() => onNodeSelect(node)}
                >
                  <span className="lobe-panel__node-card__dot" data-group={node.group} />
                  <span className="lobe-panel__node-card__name">{node.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
