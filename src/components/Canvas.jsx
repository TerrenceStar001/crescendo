import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import FloatingToolbar from './FloatingToolbar';

const MD_PATTERNS = [
  { re: /^#\s(.+)/, cmd: 'heading2' },
  { re: /^##\s(.+)/, cmd: 'heading3' },
  { re: /^\*\s(.+)/, cmd: 'bullet' },
  { re: /^-\s\[\s\]\s(.+)/, cmd: 'checklist' },
  { re: /^>\s(.+)/, cmd: 'blockquote' },
  { re: /^```(\w*)/, cmd: 'codeblock' },
  { re: /^---/, cmd: 'hr' },
];

const Canvas = React.memo(forwardRef(function Canvas({ value, onChange, onFormat }, ref) {
  const innerRef = useRef(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  const skipNextRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => innerRef.current?.focus(),
    getElement: () => innerRef.current,
  }));

  useEffect(() => {
    if (innerRef.current && document.activeElement !== innerRef.current) {
      const v = value ?? '';
      if (innerRef.current.innerHTML !== v) {
        innerRef.current.innerHTML = v;
      }
    }
  }, [value]);

  useEffect(() => {
    const checkSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !innerRef.current) {
        setToolbarPos(null);
        return;
      }
      if (!innerRef.current.contains(sel.anchorNode) && !innerRef.current.contains(sel.focusNode)) {
        setToolbarPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        setToolbarPos(null);
        return;
      }
      setToolbarPos({
        top: rect.top - 44,
        left: rect.left + rect.width / 2,
      });
    };
    document.addEventListener('selectionchange', checkSelection);
    document.addEventListener('mouseup', checkSelection);
    return () => {
      document.removeEventListener('selectionchange', checkSelection);
      document.removeEventListener('mouseup', checkSelection);
    };
  }, []);

  function getCurrentBlock() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const node = sel.getRangeAt(0).startContainer;
    let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (block && block !== innerRef.current && block.parentElement !== innerRef.current) {
      block = block.parentElement;
    }
    return block === innerRef.current ? null : block;
  }

  function convertMarkdownShortcuts() {
    const el = innerRef.current;
    if (!el) return false;
    const block = getCurrentBlock();
    if (!block) return false;
    const text = block.textContent || '';
    for (const p of MD_PATTERNS) {
      const m = text.match(p.re);
      if (!m) continue;
      const rest = m[1];

      if (p.cmd === 'heading2' || p.cmd === 'heading3' || p.cmd === 'blockquote') {
        const tag = p.cmd === 'heading2' ? 'h2' : p.cmd === 'heading3' ? 'h3' : 'blockquote';
        block.textContent = rest;
        document.execCommand('formatBlock', false, `<${tag}>`);
        return true;
      }

      if (p.cmd === 'bullet') {
        block.textContent = rest;
        document.execCommand('insertUnorderedList', false, null);
        return true;
      }

      if (p.cmd === 'checklist') {
        block.textContent = rest;
        document.execCommand('insertUnorderedList', false, null);
        const li = el.querySelector('li:last-child');
        if (li) {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'canvas__checkbox';
          li.insertBefore(cb, li.firstChild);
        }
        return true;
      }

      if (p.cmd === 'codeblock') {
        block.textContent = '';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = rest || 'code';
        pre.appendChild(code);
        block.parentNode.replaceChild(pre, block);
        return true;
      }

      if (p.cmd === 'hr') {
        block.textContent = '';
        const hr = document.createElement('hr');
        block.parentNode.replaceChild(hr, block);
        return true;
      }
    }
    return false;
  }

  function handleInput(e) {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (convertMarkdownShortcuts()) {
      skipNextRef.current = true;
    }
    onChange(e.currentTarget.innerHTML);
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const hasHtml = e.clipboardData.types.includes('text/html');
    if (hasHtml) {
      document.execCommand('insertText', false, text);
      return;
    }
    const lines = text.split('\n');
    if (lines.length >= 2 && (lines[0].startsWith('#') || lines[0].startsWith('-') || lines[0].match(/^\d+\./))) {
      const html = lines.map(line => {
        if (line.startsWith('# ')) return `<h2>${line.slice(2)}</h2>`;
        if (line.startsWith('## ')) return `<h3>${line.slice(3)}</h3>`;
        if (line.match(/^- /)) return `<li>${line.slice(2)}</li>`;
        if (line.match(/^\d+\. /)) return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`;
        if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      }).join('');
      document.execCommand('insertHTML', false, `<div>${html}</div>`);
    } else {
      document.execCommand('insertText', false, text);
    }
  }

  return (
    <>
      <FloatingToolbar
        position={toolbarPos}
        onFormat={onFormat}
        onClose={() => setToolbarPos(null)}
      />
      <div className="canvas-wrap">
        <div
          ref={innerRef}
          className="canvas"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
        />
      </div>
    </>
  );
}));

export default Canvas;
