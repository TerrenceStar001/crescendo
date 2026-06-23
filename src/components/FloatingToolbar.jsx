import React, { useEffect, useRef } from 'react';

const FORMATS = [
  { cmd: 'bold', label: 'B', icon: <strong>B</strong> },
  { cmd: 'italic', label: 'I', icon: <em>I</em> },
  { cmd: 'underline', label: 'U', icon: <u>U</u> },
  { cmd: 'insertUnorderedList', label: '•', icon: '•' },
  { cmd: 'insertOrderedList', label: '1.', icon: '1.' },
  { type: 'sep' },
  { cmd: 'heading2', label: 'H2', icon: 'H2' },
  { cmd: 'heading3', label: 'H3', icon: 'H3' },
  { cmd: 'blockquote', label: '❝', icon: '❝' },
  { cmd: 'code', label: '<>', icon: '<>' },
];

const FloatingToolbar = React.memo(function FloatingToolbar({ position, onFormat, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !position) return;
    const rect = el.getBoundingClientRect();
    const overflowRight = position.left + rect.width / 2 + rect.width / 2 - window.innerWidth;
    if (overflowRight > 0) {
      el.style.left = `${position.left - rect.width / 2 - overflowRight - 8}px`;
    }
  }, [position]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="floating-toolbar"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {FORMATS.map((f, i) => {
        if (f.type === 'sep') {
          return <span key={i} className="floating-toolbar__sep" />;
        }
        return (
          <button
            key={f.cmd}
            className="floating-toolbar__btn"
            onMouseDown={(e) => {
              e.preventDefault();
              onFormat(f.cmd);
              onClose();
            }}
            title={f.cmd}
            aria-label={f.cmd}
          >
            {f.icon}
          </button>
        );
      })}
    </div>
  );
});

export default FloatingToolbar;
