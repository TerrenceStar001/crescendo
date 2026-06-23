import corpusIndex from './corpusIndex';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very',
]);

export function getMaxTags(textLength) {
  if (textLength < 50) return 3;
  if (textLength < 200) return 5;
  if (textLength < 500) return 8;
  if (textLength < 1500) return 12;
  if (textLength < 5000) return 20;
  if (textLength < 10000) return 30;
  return 50;
}

export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractTitle(html) {
  const text = stripHtml(html).trim();
  if (!text) return 'Untitled';
  const sentences = text.split(/[.!?\n\r]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length === 0) return 'Untitled';
  const first = sentences[0];
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length <= 14) return capitalize(first);
  const trimmed = words.slice(0, 13).join(' ');
  if (trimmed.endsWith(',')) return capitalize(trimmed.slice(0, -1));
  if (words[13] && /^[a-z]/.test(words[13])) return capitalize(trimmed);
  return capitalize(trimmed);
}

export function extractTags(html) {
  try {
    const result = corpusIndex.analyze(html, []);
    return result.tags || [];
  } catch {
    return [];
  }
}
