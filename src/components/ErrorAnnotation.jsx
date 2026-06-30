import React from 'react';

const BLOCK_RE = /<\/(p|div|h[1-6]|blockquote|li|pre|tr|hr)>/gi;

function htmlToPlaintext(html) {
  if (!html) return '';
  const withBreaks = html
    .replace(BLOCK_RE, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return withBreaks;
}

export default function ErrorAnnotation({ essayHTML, inlineAnnotations }) {
  if (!inlineAnnotations?.length) return null;

  const plainText = htmlToPlaintext(essayHTML);
  let result = plainText;
  const markers = [];

  inlineAnnotations.forEach((ann, i) => {
    const escaped = ann.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'g');
    result = result.replace(regex, (match) => {
      markers.push({ ...ann, _index: i });
      return '\uFFFC';
    });
  });

  let idx = 0;
  const parts = result.split('\uFFFC');

  return (
    <div className="writing__annotated-essay">
      <h3 className="writing__annotated-essay-header">Your Essay with Annotations</h3>
      <div className="writing__annotated-essay-body" style={{ whiteSpace: 'pre-wrap' }}>
        {parts.map((part, i) => {
          const marker = markers[idx];
          idx++;
          return (
            <React.Fragment key={i}>
              {part}
              {marker && (
                <span className={`writing__annotation writing__annotation--${marker.type}`}
                  title={`${marker.type}: '${marker.text}' \u2192 '${marker.replacement}'`}
                >
                  {marker.text}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
