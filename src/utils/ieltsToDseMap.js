// IELTS → HKEAA conversion mapping table with localStorage persistence.
// Provides calibrated IELTS band → HKEAA Content/Organisation/Language conversion.
//
// Source: HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf)
//        + HKEAA examiner reports (2021-2025 briefing sessions)

const STORAGE_KEY = 'crescendo-ielts-dse-map';

// Default conversion table — IELTS band → HKEAA score mapping
// Each sub-object maps an IELTS band score (key) to an HKEAA score (value, 0-7).
// Values derived from HKEAA level descriptors anchor bands (1, 3, 5, 7)
// with interpolated values for intermediate bands.
const DEFAULT_IELTS_DSE_MAP = {
  ta: { 9: 7, 8: 7, 7.5: 6, 7: 6, 6.5: 5, 6: 5, 5.5: 4, 5: 3, 4.5: 2, 4: 1, 3: 1, 2: 1, 1: 1 },
  cc: { 9: 7, 8: 7, 7.5: 6, 7: 6, 6.5: 5, 6: 5, 5.5: 4, 5: 3, 4.5: 2, 4: 1, 3: 1, 2: 1, 1: 1 },
  lr: { 9: 7, 8: 7, 7.5: 6, 7: 6, 6.5: 5, 6: 5, 5.5: 4, 5: 3, 4.5: 2, 4: 1, 3: 1, 2: 1, 1: 1 },
  gra: { 9: 7, 8: 7, 7.5: 6, 7: 6, 6.5: 5, 6: 5, 5.5: 4, 5: 3, 4.5: 2, 4: 1, 3: 1, 2: 1, 1: 1 },
};

/**
 * Retrieve the IELTS→HKEAA conversion map from localStorage.
 * Falls back to DEFAULT_IELTS_DSE_MAP on parse failure or missing key.
 * @returns {{ ta: object, cc: object, lr: object, gra: object }}
 */
export function getIeltsToDseMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate structure — must have all four sub-objects
      if (parsed.ta && parsed.cc && parsed.lr && parsed.gra) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_IELTS_DSE_MAP;
}

/**
 * Store a custom IELTS→HKEAA conversion map to localStorage.
 * @param {{ ta: object, cc: object, lr: object, gra: object }} map
 */
export function storeIeltsToDseMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Convert IELTS band scores to HKEAA Content/Organisation/Language scores.
 *
 * @param {{ ta: number, cc: number, lr: number, gra: number }} ieltsScores
 *   IELTS band scores per dimension (e.g., { ta: 7, cc: 6.5, lr: 6, gra: 6.5 })
 * @param {{ ta: object, cc: object, lr: object, gra: object }} [customMap]
 *   Optional override map; defaults to getIeltsToDseMap()
 * @returns {{ content: number, organization: number, language: number }}
 *   HKEAA scores 0-7
 */
export function convertToHkeaa(ieltsScores, customMap) {
  const map = customMap || getIeltsToDseMap();

  function lookup(score, dimension) {
    const thresholds = map[dimension];
    if (!thresholds) return 1;

    // Round down to nearest 0.5 increment
    let floored = Math.floor(score * 2) / 2;
    // Clamp to valid range
    floored = Math.max(1, Math.min(9, floored));

    // Try exact match first, then step down by 0.5
    if (thresholds[floored] !== undefined) return thresholds[floored];
    for (let step = floored - 0.5; step >= 1; step -= 0.5) {
      if (thresholds[step] !== undefined) return thresholds[step];
    }
    // Should not reach here if map is complete
    return 1;
  }

  const content = lookup(ieltsScores.ta, 'ta');
  const organization = lookup(ieltsScores.cc, 'cc');
  const lrScore = lookup(ieltsScores.lr, 'lr');
  const graScore = lookup(ieltsScores.gra, 'gra');
  const language = Math.round((lrScore + graScore) / 2);

  return { content, organization, language };
}
