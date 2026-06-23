import { useMemo } from 'react';

function stringToColor(str) {
  const PALETTE = [
    { h: 0, s: 70, l: 55 },
    { h: 210, s: 65, l: 55 },
    { h: 340, s: 65, l: 55 },
    { h: 45, s: 75, l: 55 },
    { h: 160, s: 60, l: 45 },
    { h: 280, s: 55, l: 55 },
    { h: 20, s: 70, l: 55 },
    { h: 190, s: 65, l: 50 },
    { h: 120, s: 55, l: 45 },
    { h: 320, s: 60, l: 55 },
    { h: 30, s: 70, l: 50 },
    { h: 200, s: 70, l: 55 },
    { h: 350, s: 60, l: 55 },
    { h: 100, s: 55, l: 45 },
    { h: 260, s: 60, l: 55 },
    { h: 10, s: 65, l: 55 },
    { h: 180, s: 55, l: 45 },
    { h: 50, s: 70, l: 50 },
    { h: 300, s: 55, l: 55 },
    { h: 140, s: 60, l: 45 },
    { h: 230, s: 60, l: 55 },
    { h: 70, s: 55, l: 50 },
    { h: 330, s: 65, l: 55 },
    { h: 150, s: 55, l: 45 },
    { h: 270, s: 60, l: 55 },
  ];
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  hash = Math.abs(hash);
  const c = PALETTE[hash % PALETTE.length];
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function getNoteColor(note, index) {
  if (note.color) return note.color;
  const hue = 230 + ((index * 29 + 11) % 25);
  const sat = 40 + ((index * 13 + 7) % 15);
  const light = 60 + ((index * 7 + 3) % 15);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export default function useGraphData(notes) {
  const stableKey = useMemo(() =>
    notes.map(n => `${n.id}:${(n.tags || []).join(',')}:${n.title || ''}`).join('|'),
    [notes]);
  return useMemo(() => {
    const tagMap = {};
    const nodes = [];
    const links = [];

    notes.forEach((note, index) => {
      const noteId = `note:${note.id}`;

      const noteColor = getNoteColor(note, index);

      const contentLen = (note.content || '').length;
      let noteVal;
      if (contentLen < 10) noteVal = 3;
      else if (contentLen < 50) noteVal = 5;
      else if (contentLen < 200) noteVal = 7;
      else if (contentLen < 500) noteVal = 9;
      else noteVal = 12;

      nodes.push({
        id: noteId,
        type: 'note',
        label: note.title || 'Untitled',
        val: noteVal,
        color: noteColor,
        note,
      });

      (note.tags || []).forEach(tag => {
        if (!tagMap[tag]) {
          tagMap[tag] = {
            id: `tag:${tag}`,
            type: 'tag',
            label: tag,
            val: 0,
            notes: [],
            color: stringToColor(tag),
          };
        }
        tagMap[tag].notes.push(noteId);
        tagMap[tag].val += 1;
        links.push({
          source: noteId,
          target: `tag:${tag}`,
        });
      });
    });

    Object.values(tagMap).forEach(tagData => {
      nodes.push({
        id: tagData.id,
        type: 'tag',
        label: `#${tagData.label}`,
        val: Math.min(40, tagData.val * 4 + 3),
        color: tagData.color,
        tagData,
      });
    });

    return { nodes, links };
  }, [stableKey]);
}
