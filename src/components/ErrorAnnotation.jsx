import React from 'react';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
}

export default function ErrorAnnotation({ essayHTML, inlineAnnotations }) {
  if (!inlineAnnotations?.length) return null;

  const plainText = stripHtml(essayHTML);
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
      <div className="writing__annotated-essay-body">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {markers[idx] && (
              <span className={`writing__annotation writing__annotation--${markers[idx].type}`}
                title={`${markers[idx].type}: '${markers[idx].text}' \u2192 '${markers[idx].replacement}'`}
              >
                {markers[idx].text}
              </span>
            )}
            {idx++}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
