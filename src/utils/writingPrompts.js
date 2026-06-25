import allPrompts from '../assets/writing-prompts.json';

const USED_PROMPTS_KEY = 'crescendo-used-writing-prompts';

export function getWritingPrompts() {
  return allPrompts;
}

export function getPromptsByPart(part) {
  return allPrompts.filter(p => p.part === part);
}

export function getPromptsByType(type, part) {
  return allPrompts.filter(p => p.type === type && (!part || p.part === part));
}

export function shufflePrompts(prompts, count) {
  const arr = [...prompts];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return count ? arr.slice(0, count) : arr;
}

function readUsedIds() {
  try {
    const raw = localStorage.getItem(USED_PROMPTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function writeUsedIds(set) {
  try {
    localStorage.setItem(USED_PROMPTS_KEY, JSON.stringify([...set]));
  } catch { /* silent */ }
}

export function getUsedPromptIds() {
  return readUsedIds();
}

export function markPromptUsed(id) {
  const set = readUsedIds();
  set.add(id);
  writeUsedIds(set);
}

export function clearUsedPrompts() {
  try {
    localStorage.removeItem(USED_PROMPTS_KEY);
  } catch { /* silent */ }
}

export function getAvailablePrompts(part, count, excludeIds) {
  const used = readUsedIds();
  const available = getPromptsByPart(part).filter(p => !used.has(p.id));
  const exclude = excludeIds || [];
  const filtered = available.filter(p => !exclude.includes(p.id));
  return shufflePrompts(filtered, count);
}
