// ─── NodeGraph: 2D ego-network SVG overlay ───────────────────────────────────
import { graphData } from './graphData';

const GROUP_COLORS = ['#E8B86D', '#B04040', '#2E7BA8', '#5C8C6A'];

export default function NodeGraph({ node, onNodeSelect }) {
  if (!node) return null;

  // Collect direct neighbors from link list
  const neighbors = graphData.links
    .reduce((acc, l) => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      if (sid === node.id) {
        const n = graphData.nodes.find(x => x.id === tid);
        if (n && n.id !== 'mind') acc.push(n);
      } else if (tid === node.id) {
        const n = graphData.nodes.find(x => x.id === sid);
        if (n && n.id !== 'mind') acc.push(n);
      }
      return acc;
    }, [])
    .slice(0, 8); // cap at 8 neighbors to keep layout readable

  const W = 280, H = 240, CX = W / 2, CY = H / 2 + 8, R = 88;
  const truncate = (s, n) => s.length > n ? s.slice(0, n) + '…' : s;

  const positions = neighbors.map((n, i) => {
    const angle = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
    return { ...n, cx: CX + Math.cos(angle) * R, cy: CY + Math.sin(angle) * R };
  });

  return (
    <div className="node-graph">
      <p className="node-graph__label">related nodes</p>
      <svg width={W} height={H} role="img">
        {/* Edges */}
        {positions.map(p => (
          <line key={p.id}
            x1={CX} y1={CY} x2={p.cx} y2={p.cy}
            stroke="rgba(232,184,109,0.15)" strokeWidth="1"
          />
        ))}
        {/* Neighbor nodes */}
        {positions.map(p => (
          <g key={p.id} className="node-graph__neighbor" onClick={() => onNodeSelect(p)}>
            <circle cx={p.cx} cy={p.cy} r={10}
              fill={GROUP_COLORS[p.group ?? 0]}
              opacity={0.85}
            />
            <text x={p.cx} y={p.cy + 20} textAnchor="middle"
              fontSize="7.5" fontFamily="Cormorant Garamond, Georgia, serif"
              fill="rgba(240,220,170,0.75)">
              {truncate(p.name, 15)}
            </text>
          </g>
        ))}
        {/* Center (selected) node */}
        <circle cx={CX} cy={CY} r={15}
          fill={GROUP_COLORS[node.group ?? 0]}
          opacity={0.95}
        />
        <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize="6.5" fontFamily="Inter, sans-serif"
          fill="#050408" fontWeight="500">
          {truncate(node.name, 12)}
        </text>
      </svg>
    </div>
  );
}
