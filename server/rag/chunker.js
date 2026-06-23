export function chunkText(text, maxWords = 500) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const chunks = [];
  let current = '';
  let index = 0;

  for (const para of paragraphs) {
    const wordCount = para.split(/\s+/).length;
    const currentWords = current ? current.split(/\s+/).length : 0;

    if (currentWords + wordCount > maxWords && current) {
      chunks.push({ index, text: current.trim() });
      index++;
      current = '';
    }

    // Handle single paragraph exceeding maxWords
    if (wordCount > maxWords) {
      const sentences = para.match(/[^.!?\n]+[.!?]+/g) || [para];
      let sentenceGroup = '';
      for (const sent of sentences) {
        const sgWords = sentenceGroup.split(/\s+/).filter(Boolean).length;
        const sentWords = sent.split(/\s+/).filter(Boolean).length;
        if (sgWords + sentWords > maxWords && sentenceGroup) {
          chunks.push({ index, text: sentenceGroup.trim() });
          index++;
          sentenceGroup = sent;
        } else {
          sentenceGroup += (sentenceGroup ? ' ' : '') + sent;
        }
      }
      if (sentenceGroup.trim()) {
        current = sentenceGroup.trim();
      }
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim()) {
    chunks.push({ index, text: current.trim() });
  }

  return chunks;
}
