// Universal structural constraints for AI-generated exam content.
// These correct four patterns where machine-generated text diverges from
// authentic high-tier assessment material (HKDSE Part B2 and equivalent).

export const STRUCTURAL_CONSTRAINTS = `[STRUCTURAL CONSTRAINT]: Do NOT construct clean binary oppositions. Establish a thesis, present a radical subversion, then fail to cleanly resolve the tension. In multi-text sets, ensure texts do NOT share a one-to-one thematic relationship — their intersection must be oblique and asymmetrical.

[LEXICAL PROFILE — MATERIALITY CONSTRAINT]: Do NOT use abstract conceptual crutches (capitalism, alienation, modernization, nostalgia, efficiency) to explain meaning directly to the reader. Replace all thematic summaries with hyper-specific, localized, domain-specific, or mechanical nouns. Describe exact physical tools, materials, technical processes, objects, or sensory conditions. Force the reader to deduce conceptual themes entirely from concrete details. Maintain a balanced 50/50 ratio between abstractions and concrete, tactile nouns. Use professional jargon and regional idioms not deducible from general academic vocabulary.

[TONE CONSTRAINT — DESTRUCTION OF THE SILVER PLATTER]: Do NOT act as the text's own literary critic. Erase all inline commentary, psychological hand-holding, and explicit subtext explanations. Never name a character's underlying emotion — show it through inconsistent actions, defensive statements, or environmental ironies. Present conflicting actions, contradictory dialogue, and situational ironies exactly as they happen, without commentary. The text must remain raw so exam setters can write high-discrimination inference questions.

[SYNTACTIC CONSTRAINT — DEFAMILIARIZATION]: Maximize structural asymmetry to mimic the uneven, non-linear nature of real human writing. Avoid consecutive sentences with identical clause arrangements. Interleave hyper-dense multi-clause sentences (35-55 words) with abrupt single-clause declarations or conversational fragments. Insert parenthetical qualifiers between subject and main verb to create structural speedbumps. Use high-friction punctuation (em-dashes, colons, semicolons) to forcefully separate core subjects from their predicates — testing the reader's grammatical tracking under time pressure.

[ENDING CONSTRAINT — ANTI-SUMMARY PROTOCOL]: Absolutely ban all neat resolutions, moral lessons, or overarching summaries at the end. No beautifully balanced philosophical conclusions. The final paragraph must terminate abruptly on a concrete image, an ongoing real-world logistical problem, an unresolved tension, or a cold slice of reality. Leave ironies and contradictions completely open-ended for assessment items to exploit.`;

export const ARGUMENTATION_FLOW = `[ARGUMENTATION FLOW]: Every text block must present an unaligned internal perspective or anomalous data point that disrupts the dominant narrative frame. Introduce ambiguity, unresolved tension, or a third perspective that complicates the central argument.`;

export const WORD_COUNT_TARGETS = {
  B1: { label: 'Part B1 — Easier', min: 600, max: 1000, textCount: '2-4' },
  A:  { label: 'Part A — Compulsory', min: 900, max: 1200, textCount: '1-2' },
  B2: { label: 'Part B2 — Harder', min: 1000, max: 1200, textCount: '1-2' },
};

export const TEXT_TYPE_REQUIREMENTS = {
  B1: { types: ['news report', 'blog post', 'webpage/guide', 'forum post', 'letter to editor', 'advertisement'], description: 'Simple, accessible text types — short paragraphs, straightforward vocabulary' },
  A:  { types: ['news report', 'feature article', 'letter to editor', 'interview transcript', 'informational text'], description: 'Mixed text types with progressive difficulty — some inference required' },
  B2: { types: ['opinion piece/editorial', 'literary excerpt', 'academic text', 'feature article', 'argumentative essay'], description: 'Dense, complex texts — figurative language, multiple perspectives, cognitive ambivalence' },
};
