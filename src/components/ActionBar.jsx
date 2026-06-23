import React, { useState, useMemo } from 'react';
import extractKeyphrases, { stripHtml } from '../utils/extractKeyphrases';

function extractKeywords(content) {
  const kps = extractKeyphrases(content);
  return kps.slice(0, 8).map(k => ({ word: k.phrase, freq: Math.round(k.score * 10) }));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isInsideCodeBlock(content, index) {
  const before = content.slice(0, index);
  const opens = (before.match(/<pre>/gi) || []).length;
  const closes = (before.match(/<\/pre>/gi) || []).length;
  return opens > closes;
}

function isInsideQuotes(sentence, phrase) {
  const idx = sentence.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx === -1) return false;
  const before = sentence.slice(0, idx);
  const after = sentence.slice(idx + phrase.length);
  const quoteCount = (before.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) return true;
  if (/(['\u2018\u2019])/.test(before) && !/(['\u2018\u2019])/.test(after)) return true;
  return false;
}

function generateFlashcards(content) {
  const text = stripHtml(content);
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [];
  const kps = extractKeyphrases(content);

  const cards = [];
  const usedPhrases = new Set();

  for (const kp of kps) {
    if (cards.length >= 5) break;
    if (usedPhrases.has(kp.phrase.toLowerCase())) continue;

    const phrase = kp.phrase;
    const phraseLower = phrase.toLowerCase();
    const sentence = sentences.find(s => {
      const sLower = s.toLowerCase().trim();
      const idx = sLower.indexOf(phraseLower);
      if (idx === -1) return false;
      if (isInsideQuotes(s, phrase)) return false;
      return sLower.indexOf(phraseLower) === sLower.lastIndexOf(phraseLower);
    });
    if (!sentence) continue;

    const pattern = phrase.split(/\s+/).map(w => `\\b${escapeRegex(w)}\\b`).join('\\s+');
    const re = new RegExp(pattern, 'gi');
    const blanked = sentence.replace(re, '______');
    if (blanked === sentence) continue;

    usedPhrases.add(phraseLower);
    cards.push({ front: blanked.trim(), back: phrase });
  }

  return cards;
}

function generateSummary(content) {
  const text = stripHtml(content);
  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [];
  if (sentences.length === 0) return '';
  const kps = extractKeyphrases(content);
  const kwSet = new Set(kps.map(k => k.phrase.toLowerCase()));
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().split(/\W+/).filter(Boolean);
    const matchCount = words.filter(w => kwSet.has(w)).length;
    const posBoost = 1 + Math.max(0, 1 - i / sentences.length) * 0.3;
    const isHeading = words.length <= 12 && words.filter(w => /^[A-Z]/.test(w)).length >= words.length * 0.6;
    const headingPenalty = isHeading ? 0.3 : 1;
    return { text: s.trim(), score: matchCount * posBoost * headingPenalty };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.text.slice(0, 200) || '';
}

function extractHeadings(content) {
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (text) {
      headings.push({ level: parseInt(match[1]), text, index: headings.length });
    }
  }
  return headings;
}

function countReadTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return { words, minutes };
}

export default function ActionBar({ content, onOpenVoid, wordCount, onToggleFocus, isFocusMode }) {
  const [showExtract, setShowExtract] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const hasContent = (stripHtml(content || '').length > 200);

  const keywords = useMemo(() => hasContent ? extractKeywords(content) : [], [content]);
  const flashcards = useMemo(() => hasContent ? generateFlashcards(content) : [], [content]);
  const headings = useMemo(() => hasContent ? extractHeadings(content) : [], [content]);
  const summary = useMemo(() => hasContent ? generateSummary(content) : '', [content]);

  const readTime = useMemo(() => hasContent ? countReadTime(stripHtml(content)) : { words: 0, minutes: 0 }, [content]);

  if (!hasContent) return null;

  function handleOutlineClick(heading) {
    setShowOutline(false);
    const editor = document.querySelector('.canvas');
    if (!editor) return;
    const html = editor.innerHTML;
    const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
    let match;
    let idx = 0;
    while ((match = headingRegex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text === heading.text) {
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          sel.removeAllRanges();
          const h2Index = match.index;
          const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
          let charCount = 0;
          let node;
          while ((node = walker.nextNode())) {
            const nextCharCount = charCount + node.textContent.length;
            if (nextCharCount > h2Index) {
              range.setStart(node, h2Index - charCount);
              range.collapse(true);
              sel.addRange(range);
              node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              break;
            }
            charCount = nextCharCount;
          }
        } catch {}
        break;
      }
      idx++;
    }
  }

  return (
    <div className="action-bar">
      <div className="action-bar__buttons">
        <span className="action-bar__stat" title={`${readTime.words} words`}>
          {wordCount ?? readTime.words} words · ~{readTime.minutes} min read
        </span>
        <span className="action-bar__sep" />
        {headings.length >= 2 && (
          <>
            <button
              className={`action-bar__btn${showOutline ? ' action-bar__btn--active' : ''}`}
              onClick={() => setShowOutline(s => !s)}
              title="Show document outline"
            >
              📑 Outline ({headings.length})
            </button>
            <span className="action-bar__sep" />
          </>
        )}
        <button
          className={`action-bar__btn${isFocusMode ? ' action-bar__btn--active' : ''}`}
          onClick={onToggleFocus}
          title={isFocusMode ? 'Exit focus mode' : 'Focus reading mode'}
        >
          {isFocusMode ? '⊟ Exit Focus' : '⊞ Focus'}
        </button>
        <span className="action-bar__sep" />
        <button
          className={`action-bar__btn${showSummary ? ' action-bar__btn--active' : ''}`}
          onClick={() => setShowSummary(s => !s)}
          title="AI-generated summary of this note"
        >
          📄 Summary
        </button>
        <button
          className="action-bar__btn"
          onClick={() => setShowExtract(s => !s)}
          title="Extract key concepts from this note"
        >
          📇 Extract Concepts
        </button>
        <button
          className="action-bar__btn"
          onClick={() => setShowFlashcards(s => !s)}
          title="Generate flashcards from this note"
        >
          🧠 Flashcards ({flashcards.length})
        </button>
        <button
          className="action-bar__btn"
          onClick={onOpenVoid}
          title="Quiz yourself on this note"
        >
          ❓ Quiz Me
        </button>
      </div>

      {showOutline && headings.length > 0 && (
        <div className="action-bar__panel">
          <div className="action-bar__panel-header">
            <span>Document Outline</span>
            <button className="action-bar__panel-close" onClick={() => setShowOutline(false)}>✕</button>
          </div>
          <div className="action-bar__outline">
            {headings.map((h, i) => (
              <button
                key={i}
                className="action-bar__outline-item"
                style={{ paddingLeft: `${(h.level - 1) * 16 + 8}px` }}
                onClick={() => handleOutlineClick(h)}
              >
                {h.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSummary && summary && (
        <div className="action-bar__panel">
          <div className="action-bar__panel-header">
            <span>AI Summary</span>
            <button className="action-bar__panel-close" onClick={() => setShowSummary(false)}>✕</button>
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {summary}
          </p>
        </div>
      )}

      {showExtract && keywords.length > 0 && (
        <div className="action-bar__panel">
          <div className="action-bar__panel-header">
            <span>Key Concepts</span>
            <button className="action-bar__panel-close" onClick={() => setShowExtract(false)}>✕</button>
          </div>
          <div className="action-bar__concepts">
            {keywords.map(k => (
              <span key={k.word} className="action-bar__concept">
                {k.word}
                <span className="action-bar__concept-freq">{k.freq}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {showFlashcards && flashcards.length > 0 && (
        <div className="action-bar__panel">
          <div className="action-bar__panel-header">
            <span>Flashcards</span>
            <button className="action-bar__panel-close" onClick={() => setShowFlashcards(false)}>✕</button>
          </div>
          <div className="action-bar__flashcards">
            {flashcards.map((card, i) => (
              <div key={i} className="action-bar__flashcard">
                <span className="action-bar__flashcard-front">{card.front}</span>
                <span className="action-bar__flashcard-back">{card.back}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
