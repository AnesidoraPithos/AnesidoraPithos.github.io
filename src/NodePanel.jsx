import NodeGraph from './NodeGraph';

export default function NodePanel({ node, onAddToTray, onNodeSelect, onClose }) {
  const visible = !!node;

  return (
    <aside className={`node-panel${visible ? ' node-panel--visible' : ''}`}>
      {node && (
        <>
          {/* Header row: badge + complexity + tray button + close */}
          <div className="node-panel__header-row">
            <div className="node-panel__badge" data-group={node.group} />
            {node.complexity && (
              <span className="node-panel__complexity">{node.complexity}</span>
            )}
            {onAddToTray && (
              <button
                className="node-panel__tray-icon"
                onClick={() => onAddToTray(node)}
                title="Add to working memory"
              >⊕</button>
            )}
            {onClose && (
              <button
                className="node-panel__close"
                onClick={onClose}
                title="Close (Esc)"
              >×</button>
            )}
          </div>

          <h2 className="node-panel__title">{node.name}</h2>

          <p className="node-panel__desc">
            {node.description ?? 'No description available.'}
          </p>

          {node.link && (
            <a
              className="node-panel__link"
              href={node.link}
              target="_blank"
              rel="noreferrer"
            >
              {node.linkLabel ?? 'Open Link'}&nbsp;↗
            </a>
          )}

          {/* Ego network mini-graph */}
          <NodeGraph node={node} onNodeSelect={onNodeSelect} />
        </>
      )}
    </aside>
  );
}
