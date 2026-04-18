// ─── Working Memory Tray (Miller's Law: 7 ± 2 slots) ─────────────────────────
const SLOT_COUNT = 7;
const DOT_COLORS = ['#E8B86D', '#B04040', '#2E7BA8', '#5C8C6A'];

export default function WorkingMemoryTray({ items, onRemove, onSelect, overloaded, isDragTarget }) {
  return (
    <div className={['wm-tray', overloaded ? 'wm-tray--overloaded' : '', isDragTarget ? 'wm-tray--drag-target' : ''].filter(Boolean).join(' ')}>
      <span className="wm-tray__header">
        <span className="wm-tray__title">working memory</span>
        <span className="wm-tray__count">{items.length}<span className="wm-tray__denom">/{SLOT_COUNT}</span></span>
      </span>
      <div className="wm-tray__slots">
        {Array.from({ length: SLOT_COUNT }, (_, i) => {
          const item = items[i];
          return (
            <div key={i} className={`wm-tray__slot${item ? ' wm-tray__slot--filled' : ''}`}>
              {item ? (
                <button
                  className="wm-tray__item"
                  onClick={() => onSelect(item)}
                  title={item.name}
                >
                  <span
                    className="wm-tray__dot"
                    style={{ background: DOT_COLORS[item.group ?? 0] }}
                  />
                  <span className="wm-tray__name">
                    {item.name.length > 16 ? item.name.slice(0, 16) + '…' : item.name}
                  </span>
                  <button
                    className="wm-tray__remove"
                    onClick={e => { e.stopPropagation(); onRemove(i); }}
                    title="remove"
                  >×</button>
                </button>
              ) : (
                <div className="wm-tray__empty" />
              )}
            </div>
          );
        })}
      </div>
      {overloaded && (
        <p className="wm-tray__overload">
          — cognitive overload —
        </p>
      )}
    </div>
  );
}
