// HKEAA Writing level descriptors encoded as structured JS constants.
// Source: HKEAA Level Descriptors for Writing (LevelDescriptors-ENG-Writing.pdf)
//
// These serve as source data for designing the IELTS→HKEAA conversion table
// and as structured reference for potential future UI (e.g., "What does a
// Content score of 5 mean?" tooltips).
// NOTE: The correction prompt uses IELTS descriptors, NOT these HKEAA descriptors.

// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
export const CONTENT_DESCRIPTORS = {
  7: "Fully satisfies all task requirements; ideas are highly relevant, well-developed, and sustained throughout; audience and purpose clearly addressed",
  6: "Satisfies task requirements well; ideas are relevant, developed with some specific evidence; audience and purpose clearly maintained",
  5: "Satisfies most task requirements; ideas are generally relevant and adequately developed; audience and purpose mostly clear",
  4: "Addresses most task requirements; ideas are relevant but development is uneven; audience awareness present but inconsistent",
  3: "Partially addresses task requirements; ideas are relevant but underdeveloped or occasionally irrelevant; audience awareness inconsistent",
  2: "Barely addresses task requirements; ideas are largely irrelevant or minimally developed; little awareness of audience or purpose",
  1: "Fails to address task requirements; ideas irrelevant or entirely undeveloped; no awareness of audience or purpose",
};

// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
export const ORGANISATION_DESCRIPTORS = {
  7: "Highly coherent and well-organised; effective use of paragraphing; seamless transitions and cohesive devices throughout",
  6: "Well-organised and coherent; clear paragraphing; good use of cohesive devices with some variety",
  5: "Generally well-organised; clear paragraphing; adequate use of cohesive devices, though some may be mechanical",
  4: "Organised but with some lapses in coherence; paragraphing present but not always effective; basic cohesive devices used",
  3: "Some organisation evident but inconsistent; limited paragraphing; basic or mechanical cohesive devices",
  2: "Little sense of organisation; minimal or no paragraphing; few or inappropriate cohesive devices",
  1: "No discernible organisation; no paragraphing; no effective cohesive devices",
};

// Source: HKEAA LevelDescriptors-ENG-Writing.pdf
export const LANGUAGE_DESCRIPTORS = {
  7: "Wide range of vocabulary and grammatical structures used accurately and appropriately; occasional minor slips do not impede communication",
  6: "Good range of vocabulary and grammatical structures; mostly accurate with occasional errors; register generally appropriate",
  5: "Sufficient range of vocabulary and grammar; generally accurate with some errors; errors do not impede meaning significantly",
  4: "Limited range of vocabulary and grammatical structures; noticeable errors that may occasionally impede meaning",
  3: "Limited range of vocabulary and simple grammatical structures; frequent errors that sometimes impede meaning",
  2: "Very limited vocabulary and grammar; pervasive errors that seriously impede communication",
  1: "Minimal vocabulary and grammar; errors make communication almost impossible",
};
