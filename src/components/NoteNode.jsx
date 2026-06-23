import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

function areEqual(prevProps, nextProps) {
  return prevProps.data.note.id === nextProps.data.note.id
    && prevProps.data.isActive === nextProps.data.isActive;
}

export default memo(function NoteNode({ data }) {
  const { note, isActive, onClick, onTagClick } = data;
  const preview = stripHtml(note.content || '').slice(0, 60);
  const tagCount = (note.tags || []).length;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timerRef = useRef(null);

  const showTooltip = useCallback(() => {
    timerRef.current = setTimeout(() => setTooltipVisible(true), 400);
  }, []);

  const hideTooltip = useCallback(() => {
    clearTimeout(timerRef.current);
    setTooltipVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const fullPreview = stripHtml(note.content || '').slice(0, 200);

  return (
    <div
      className={`flow-node${isActive ? ' flow-node--active' : ''}`}
      onClick={() => onClick?.(note.id)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{ position: 'relative', borderLeft: note.color ? `3px solid ${note.color}` : undefined }}
    >
      <Handle type="target" position={Position.Top} className="flow-node__handle" isConnectable={true} />
      <div className="flow-node__title">{note.title || 'Untitled'}</div>
      {preview && <div className="flow-node__preview">{preview}{stripHtml(note.content || '').length > 60 ? '...' : ''}</div>}
      {tagCount > 0 && (
        <div className="flow-node__tags">
          {note.tags.slice(0, 3).map(t => (
            <span
              key={t}
              className="flow-node__tag"
              onClick={e => { e.stopPropagation(); onTagClick?.(t); }}
            >
              {t}
            </span>
          ))}
          {tagCount > 3 && <span className="flow-node__tag-more">+{tagCount - 3}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="flow-node__handle" isConnectable={true} />

      {tooltipVisible && fullPreview && (
        <div className="flow-node__tooltip">
          <div className="flow-node__tooltip-title">{note.title || 'Untitled'}</div>
          <div className="flow-node__tooltip-preview">
            {fullPreview}{stripHtml(note.content || '').length > 200 ? '...' : ''}
          </div>
          {tagCount > 0 && (
            <div className="flow-node__tooltip-tags">
              {note.tags.slice(0, 6).map(t => (
                <span key={t} className="flow-node__tooltip-tag">{t}</span>
              ))}
              {tagCount > 6 && <span className="flow-node__tooltip-tag">+{tagCount - 6} more</span>}
            </div>
          )}
          <div className="flow-node__tooltip-hint">Click to open</div>
        </div>
      )}
    </div>
  );
}, areEqual);