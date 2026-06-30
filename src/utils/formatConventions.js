// Part A writing format conventions for HKDSE Paper 2 Writing.
// Provides per-text-type structural rules, deterministic element checking,
// and prompt-building for AI evaluation of register/tone.

export const PART_A_FORMAT_RULES = {
  letter: {
    requiredElements: ['salutation', 'opening_purpose', 'body_points', 'closing_formula', 'signature'],
    register: 'formal or semi-formal',
    wordRange: '140-180',
    commonErrors: ['missing closing formula', 'wrong salutation for recipient relationship', 'informal contractions in formal letter']
  },
  email: {
    requiredElements: ['subject_line', 'salutation', 'body', 'sign_off'],
    register: 'semi-formal or informal (depends on recipient)',
    wordRange: '120-160',
    commonErrors: ['missing subject line', 'overly formal register', 'no clear sign-off']
  },
  proposal: {
    requiredElements: ['title', 'introduction', 'body_with_headings', 'conclusion'],
    register: 'formal',
    wordRange: '180-220',
    commonErrors: ['prose format instead of headed sections', 'informal tone', 'missing introduction']
  },
  speech: {
    requiredElements: ['opening_greeting', 'body', 'concluding_remarks'],
    register: 'formal to semi-formal (audience-dependent)',
    wordRange: '180-220',
    commonErrors: ['no audience address', 'essay-style instead of spoken register', 'no concluding remarks']
  },
  article: {
    requiredElements: ['headline', 'opening_hook', 'body', 'conclusion'],
    register: 'semi-formal to formal (publication-dependent)',
    wordRange: '180-250',
    commonErrors: ['missing headline', 'essay tone instead of journalistic', 'no byline or author reference']
  },
  report: {
    requiredElements: ['title', 'introduction', 'findings', 'conclusion'],
    register: 'formal',
    wordRange: '180-250',
    commonErrors: ['missing section headings', 'narrative tone instead of analytical', 'no recommendations']
  },
  blog: {
    requiredElements: ['title', 'opening_hook', 'body', 'conclusion'],
    register: 'informal to semi-formal',
    wordRange: '200-300',
    commonErrors: ['overly formal register', 'no personal voice', 'missing engaging opening']
  },
  'blog comment': {
    requiredElements: ['body', 'sign_off'],
    register: 'informal to semi-formal',
    wordRange: '80-150',
    commonErrors: ['overly formal register', 'no engagement with original post']
  },
   'questionnaire response': {
    requiredElements: ['introductory_statement', 'numbered_responses', 'closing'],
    register: 'semi-formal',
    wordRange: '120-180',
    commonErrors: ['unstructured responses', 'missing introductory context']
   },
   review: {
    requiredElements: ['title', 'introduction', 'body_evaluation', 'conclusion'],
    register: 'semi-formal to formal',
    wordRange: '200-450',
    commonErrors: [
      'no title or byline',
      'narrative tone instead of evaluative',
      'missing personal evaluation/verdict',
      'descriptive summary without critical analysis'
    ]
   },
   blog: {
    requiredElements: ['title', 'opening_hook', 'body', 'conclusion'],
    register: 'informal to semi-formal',
    wordRange: '200-400',
    commonErrors: [
      'overly formal register',
      'no personal voice',
      'missing engaging opening'
    ]
   },
   general: {
    requiredElements: [],
    register: 'varies',
    wordRange: 'varies',
    commonErrors: []
   },
};

/**
 * Deterministic structural element validator for Part A text types.
 * Uses simple text pattern matching to check required format elements.
 *
 * @param {string} text - Essay text (plain or HTML)
 * @param {string} textType - Text type slug from PART_A_FORMAT_RULES
 * @returns {{ valid: boolean, checks: object, issues: string[] }}
 */
export function checkRequiredElements(text, textType) {
  const rules = PART_A_FORMAT_RULES[textType];
  if (!rules) return { valid: true, checks: {}, issues: [] };

  const plain = (text || '').replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
  const lower = plain.toLowerCase();
  const checks = {};
  const issues = [];

  // Check salutation (Dear, To whom, Hello, Hi there, Good morning/afternoon/evening)
  if (rules.requiredElements.includes('salutation')) {
    checks.hasSalutation = /dear\s|to\s+whom|hello|hi\s+there|good\s+(morning|afternoon|evening)/i.test(lower.slice(0, 100));
    if (!checks.hasSalutation) issues.push('Missing salutation');
  }

  // Check closing formula or sign-off (Yours sincerely/faithfully, Regards, Cheers, Thanks)
  if (rules.requiredElements.includes('closing_formula') || rules.requiredElements.includes('sign_off')) {
    checks.hasClosing = /yours\s+(sincerely|faithfully|truly)|(best\s+|kind\s+)?regards|sincerely|cheers|thanks?\s+(again|for)/i.test(plain.slice(-200));
    if (!checks.hasClosing) issues.push('Missing closing formula or sign-off');
  }

  // Check signature (word + word pattern at end of text)
  if (rules.requiredElements.includes('signature')) {
    checks.hasSignature = /[a-z]+\s+[a-z]+[,.]?\s*$/i.test(plain.trim());
    if (!checks.hasSignature) issues.push('Missing signature/name');
  }

  // Check subject line (Subject: or Re: in first 200 chars)
  if (rules.requiredElements.includes('subject_line')) {
    checks.hasSubject = /subject\s*:|re\s*:/i.test(lower.slice(0, 200));
    if (!checks.hasSubject) issues.push('Missing subject line');
  }

  // Check title (first line has meaningful content)
  if (rules.requiredElements.includes('title')) {
    checks.hasTitle = plain.split('\n')[0]?.trim().length > 3;
    if (!checks.hasTitle) issues.push('Missing title or heading');
  }

  return { valid: issues.length === 0, checks, issues };
}

/**
 * Build a format-check prompt section for the AI correction prompt.
 * The AI evaluates register/tone/usage quality; code checks structural elements.
 *
 * @param {string} textType - Text type slug
 * @returns {string} Prompt section string, or '' for unknown types
 */
export function buildFormatPromptSection(textType) {
  const rules = PART_A_FORMAT_RULES[textType];
  if (!rules) return '';
  return `FORMAT CHECK (Part A — ${textType}):
Required structural elements: ${rules.requiredElements.join(', ')}.
Expected register: ${rules.register}.
Common errors to flag: ${rules.commonErrors.join('; ')}.
AI should evaluate if the register and tone are appropriate for this text type.
Code-based validation checks structural elements separately; your task is to evaluate register, tone, and how well format elements are USED (not just whether they exist).`;
}
