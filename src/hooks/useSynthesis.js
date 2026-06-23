import { useMemo } from 'react';
import extractKeyphrases from '../utils/extractKeyphrases';

function tagOverlap(tagsA, tagsB) {
  if (!tagsA?.length || !tagsB?.length) return { score: 0, shared: [] };
  const setA = new Set(tagsA);
  const setB = new Set(tagsB);
  const shared = tagsA.filter(t => setB.has(t));
  const union = new Set([...tagsA, ...tagsB]).size;
  return { score: union > 0 ? shared.length / union : 0, shared };
}

function computeIDFCosineSimilarity(kwA, kwB, idf) {
  if (!kwA?.length || !kwB?.length) return { overlap: 0, score: 0 };
  const setB = new Set(kwB.map(k => k.toLowerCase()));
  const shared = kwA.filter(k => setB.has(k.toLowerCase()));
  if (shared.length < 2) return { overlap: shared.length, score: 0 };

  let dot = 0, magA = 0, magB = 0;
  const allPhrases = [...new Set([...kwA.map(k => k.toLowerCase()), ...kwB.map(k => k.toLowerCase())])];
  for (const phrase of allPhrases) {
    const w = idf[phrase] || 1;
    const inA = kwA.some(k => k.toLowerCase() === phrase) ? w : 0;
    const inB = kwB.some(k => k.toLowerCase() === phrase) ? w : 0;
    dot += inA * inB;
    magA += inA * inA;
    magB += inB * inB;
  }
  const score = magA > 0 && magB > 0 ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
  return { overlap: shared.length, score };
}

export default function useSynthesis(notes) {
  return useMemo(() => {
    if (notes.length < 2) return { suggestions: [], loading: false, strong: 0, weak: 0, total: 0 };

    const notePhrases = {};
    const docFreq = {};
    notes.forEach(n => {
      const phrases = extractKeyphrases(n.content || '', { docFreq: {}, totalDocs: 0 });
      const unique = [...new Set(phrases.map(p => p.phrase.toLowerCase()))];
      notePhrases[n.id] = unique;
      unique.forEach(p => { docFreq[p] = (docFreq[p] || 0) + 1; });
    });

    const totalDocs = notes.length;
    const idf = {};
    for (const [phrase, df] of Object.entries(docFreq)) {
      idf[phrase] = Math.log(totalDocs / (1 + df)) + 1;
    }

    const suggestions = [];
    const seen = new Set();
    let strong = 0, weak = 0;

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i];
        const b = notes[j];
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const tagResult = tagOverlap(a.tags, b.tags);
        const kwResult = computeIDFCosineSimilarity(notePhrases[a.id], notePhrases[b.id], idf);

        const tA = new Date(a.createdAt || a.updatedAt).getTime();
        const tB = new Date(b.createdAt || b.updatedAt).getTime();
        const uA = new Date(a.updatedAt).getTime();
        const uB = new Date(b.updatedAt).getTime();
        const createdGap = Math.abs(tA - tB) / (1000 * 60 * 60 * 24);
        const updatedGap = Math.abs(uA - uB) / (1000 * 60 * 60 * 24);
        const minGap = Math.min(createdGap, updatedGap);
        const temporalScore = Math.max(0, 1 - minGap / 365);

        const hasTagOverlap = tagResult.shared.length > 0;
        const hasKwOverlap = kwResult.overlap >= 2;
        if (!hasTagOverlap && !hasKwOverlap) continue;

        const combined = tagResult.score * 0.5 + kwResult.score * 0.35 + temporalScore * 0.15;

        if (combined >= 0.2) {
          const isStrong = combined >= 0.45;
          if (isStrong) strong++; else weak++;
          const reasons = [];
          if (tagResult.shared.length > 0) {
            reasons.push({ type: 'tag', label: `Shared tag: ${tagResult.shared[0]}`, icon: '🏷' });
          }
          if (kwResult.overlap > 0) {
            reasons.push({ type: 'keyword', label: `${kwResult.overlap} shared keyword${kwResult.overlap > 1 ? 's' : ''}`, icon: '🔑' });
          }
          if (temporalScore > 0.5) {
            const days = Math.round(minGap);
            reasons.push({ type: 'temporal', label: `${days} day${days !== 1 ? 's' : ''} apart`, icon: '📅' });
          }

          suggestions.push({
            source: a.id,
            target: b.id,
            sourceTitle: a.title || 'Untitled',
            targetTitle: b.title || 'Untitled',
            strength: Math.round(combined * 100),
            type: isStrong ? 'strong' : 'weak',
            reasons,
          });
        }
      }
    }

    suggestions.sort((a, b) => b.strength - a.strength);
    return { suggestions, loading: false, strong, weak, total: suggestions.length };
  }, [notes]);
}
