// Universal structural constraints for AI-generated exam content.
// These correct four patterns where machine-generated text diverges from
// authentic high-tier assessment material (HKDSE Part B2 and equivalent).

export const STRUCTURAL_CONSTRAINTS = `[STRUCTURAL CONSTRAINT]: Do NOT construct clean binary oppositions. Establish a thesis, present a radical subversion, then fail to cleanly resolve the tension. In multi-text sets, ALL texts MUST share the SAME TOPIC/THEME but approach it from DIFFERENT PERSPECTIVES and text types (e.g., Text 1 = news report about a council meeting, Text 2 = interview transcript with stakeholders, Text 3 = editorial). Texts MUST NOT be consecutive in narrative — Text 2 does NOT continue Text 1's story. Each text is an independent piece on the same topic.

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

// Token budget for AI generation: ~1.33x word count target to allow for HTML tags and formatting overhead
// This prevents the AI from over-generating (5000 tokens ≈ 3750 words was 3x the 1200-word target)
export function getMaxTokensForPart(part) {
  const target = WORD_COUNT_TARGETS[part] || WORD_COUNT_TARGETS.A;
  return Math.ceil(target.max * 1.66);
}

export const TEXT_TYPE_REQUIREMENTS = {
  B1: { types: ['news report', 'blog post', 'webpage/guide', 'forum post', 'letter to editor', 'advertisement'], description: 'Simple, accessible text types — short paragraphs, straightforward vocabulary' },
  A:  { types: ['news report', 'feature article', 'letter to editor', 'interview transcript', 'informational text'], description: 'Mixed text types with progressive difficulty — some inference required' },
  B2: { types: ['opinion piece/editorial', 'literary excerpt', 'academic text', 'feature article', 'argumentative essay'], description: 'Dense, complex texts — figurative language, multiple perspectives, cognitive ambivalence' },
};

export const GENRE_TEMPLATES = {
  'news report': {
    structure: 'Inverted pyramid: lead paragraph with who/what/when/where, followed by details and context. Short paragraphs (2-3 sentences). Objective tone.',
    voice: 'Journalistic — third person, attribution to named sources, dateline-style openings',
    features: 'Direct quotes from officials/residents, statistics, timeline of events'
  },
  'feature article': {
    structure: 'Narrative arc: scene-setting opening, thematic development, multiple perspectives, open-ended close.',
    voice: 'Literary-journalistic — first person or close third, sensory details, character-driven',
    features: 'Vivid scene-setting, portraits, thematic metaphors, indirect commentary'
  },
  'opinion piece/editorial': {
    structure: 'Thesis statement, supporting arguments with evidence, counterargument acknowledgment, unresolved conclusion.',
    voice: 'Argumentative but measured — uses rhetorical devices sparingly, maintains credibility',
    features: 'Explicit value judgments, policy references, appeals to shared values'
  },
  'academic text': {
    structure: 'Introduction with research context, methodology/framework, findings, limitations, implications.',
    voice: 'Formal, precise, hedged language (suggests, indicates, appears), passive constructions acceptable',
    features: 'Technical terminology, data references, citations of prior work, qualified claims'
  },
  'literary excerpt': {
    structure: 'Scene-based narrative with dialogue, internal monologue, environmental detail.',
    voice: 'Subjective, sensory-rich, character interiority, varied sentence length',
    features: 'Dialogue with dialect/colloquialisms, symbolic objects, temporal shifts'
  },
  'blog post': {
    structure: 'Conversational opening, themed sections, personal anecdotes, call-to-reflection close.',
    voice: 'First person, informal, direct address to reader, personal opinions',
    features: 'Emojis (occasional), rhetorical questions, personal experience references'
  },
  'forum post': {
    structure: 'Opinion statement, supporting reasons, engagement questions, casual sign-off.',
    voice: 'Highly informal, abbreviated, direct, opinionated, community-specific slang',
    features: 'Typos/grammar shortcuts, community references, threaded-reply style'
  },
  'letter to editor': {
    structure: 'Reference to prior article/event, opinion stance, supporting arguments, call to action.',
    voice: 'Formal but personal, civic-minded, references shared community experience',
    features: 'Salutation-style openings, formal sign-offs, reference to public discourse'
  },
  'advertisement': {
    structure: 'Headline, benefit statements, features/bullet points, call to action, disclaimers.',
    voice: 'Persuasive, benefit-focused, urgent, audience-directed',
    features: 'Bullet points, pricing, contact info, promotional language'
  },
  'webpage/guide': {
    structure: 'Topic introduction, step-by-step or categorized information, practical tips.',
    voice: 'Instructional, clear, organized, moderately formal',
    features: 'Numbered steps, categorized sections, practical advice, resource links'
  },
  'interview transcript': {
    structure: 'Brief context intro, Q&A exchanges, interviewer framing, subject responses.',
    voice: 'Conversational, alternating voices, interviewer neutrality or personality',
    features: 'Speaker labels, interruptions, filler words, non-verbal cues in brackets'
  },
  'informational text': {
    structure: 'Topic overview, categorized information, comparative data, summary implications.',
    voice: 'Objective, systematic, categorized, encyclopedic',
    features: 'Categories/subcategories, comparative tables described in text, factual statements'
  },
  'argumentative essay': {
    structure: 'Thesis, supporting arguments, counterarguments, synthesis.',
    voice: 'Academic-formal, logical progression, evidence-based',
    features: 'Transition signals, citation patterns, qualified claims'
  },
  'report': {
    structure: 'Executive summary, findings by category, data/evidence, conclusions (or lack thereof).',
    voice: 'Dry, formal, impersonal, data-driven, bureaucratic',
    features: 'Bullet points, numbered items, tables described in text, formal headings, jargon'
  }
};

export const PROMPT_ENFORCEMENT_RULES = `
[PARAGRAPH LENGTH ENFORCEMENT]: Every paragraph must be 1-3 sentences maximum. Long paragraphs (5+ sentences) are a hallucination pattern — if the AI produces them, the passage is structurally invalid. Count sentences per paragraph and reject any with more than 3.

[COLLOQUIAL DIALOGUE ENFORCEMENT]: When characters speak, their dialogue must sound like real people, not grammar textbooks. Use contractions (don't, can't, won't), sentence fragments, filler words (um, like, you know), interrupted speech, and regional expressions. Dialogue should NEVER be perfectly grammatical. At least 30% of dialogue must contain colloquialisms.

[CONCRETE NOUN ENFORCEMENT]: Replace every abstract concept with a specific physical object, action, or sensory detail. Instead of "economic hardship" write "the electricity bill stacked on the kitchen counter." Instead of "social isolation" write "three weeks without hearing another person's voice." Show, don't tell.

[MORALIZING ENDING FORBIDDEN]: The final paragraph MUST NOT contain any of these patterns: "in the end," "ultimately," "what we learned," "the lesson was," "looking back," "this story shows," "perhaps," "maybe we should." The ending must be a concrete image, an unresolved action, or a cold fact — NOT a reflection, moral, or summary.`;
