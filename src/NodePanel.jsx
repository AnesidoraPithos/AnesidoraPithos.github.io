export default function NodePanel({ node }) {
  const visible = !!node;

  return (
    <aside className={`node-panel${visible ? ' node-panel--visible' : ''}`}>
      {node && (
        <>
          <div className="node-panel__badge" data-group={node.group} />
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
        </>
      )}
    </aside>
  );
}
