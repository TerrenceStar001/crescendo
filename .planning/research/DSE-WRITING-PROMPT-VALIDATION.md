# DSE Paper 2 Writing Prompt — Validation Framework

**Research:** Quality Assurance & Validation for DSE-Style Writing Prompts
**Date:** 2026-07-03
**Scope:** Both human-curated and AI-generated prompts
**Purpose:** Establish verifiable quality gates for DSE Paper 2 prompts used in Crescendo

---

## Table of Contents

1. [Understanding DSE Paper 2 Prompt Anatomy](#1-understanding-dse-paper-2-prompt-anatomy)
2. [Dimension 1: Authenticity — Does It Feel Like a Real DSE Question?](#2-dimension-1-authenticity)
3. [Dimension 2: Content Safety — Is It Appropriate for 17–18 Year Olds?](#3-dimension-2-content-safety)
4. [Dimension 3: Structural Completeness — Are All Required Sections Present?](#4-dimension-3-structural-completeness)
5. [Dimension 4: Clarity — Is the Task Unambiguous?](#5-dimension-4-clarity)
6. [Dimension 5: Difficulty Calibration — Is It the Right Level for DSE?](#6-dimension-5-difficulty-calibration)
7. [Dimension 6: Topic & Text-Type Distribution — Avoiding Bias](#7-dimension-6-topic--text-type-distribution)
8. [Dimension 7: Text-Type Verification — Does the Prompt Actually Require the Claimed Text Type?](#8-dimension-7-text-type-verification)
9. [Dimension 8: AI Generation Artifact Detection](#9-dimension-8-ai-generation-artifact-detection)
10. [Dimension 9: A/B Testing & User Validation](#10-dimension-9-ab-testing--user-validation)
11. [Dimension 10: Human Review Workflow](#11-dimension-10-human-review-workflow)
12. [Rejection Criteria Summary](#12-rejection-criteria-summary)
13. [Sources](#13-sources)

---

## 1. Understanding DSE Paper 2 Prompt Anatomy

### Part A (Short Task — 10% of Paper)

| Element | Description | HKEAA Specification |
|---------|-------------|-------------------|
| **Word count** | ~200 words | Candidates provided with situation + purpose + relevant information |
| **Format** | Practical/utilitarian text types | Email, notice, memo, report, questionnaire, comment reply |
| **Structure** | Heavily guided — specific bullet points to address | Usually 2–3 explicit bullet points candidates must cover |
| **Purpose** | Tests ability to extract and organize relevant info, write concisely for a specific audience | Content (7) + Language (7) + Organisation (7) = 21 marks |

### Part B (Long Task — 15% of Paper)

| Element | Description | HKEAA Specification |
|---------|-------------|-------------------|
| **Word count** | ~400 words | Longer, more open-ended |
| **Format** | Wide range of text types | Article, letter, speech, report, proposal, story, blog, review, essay, etc. |
| **Structure** | Minimal scaffolding — brief context, then task | Candidates must independently choose text type and organize content |
| **Purpose** | Tests sustained writing, argumentation, genre awareness | Content (7) + Language (7) + Organisation (7) = 21 marks |

### HKEAA Scoring Rubric (Both Parts)

| Domain | Marks | What Assessors Look For |
|--------|-------|------------------------|
| **Content** | 7 | Relevance, fulfilment of task requirements, depth of ideas, supporting details |
| **Language** | 7 | Accuracy (grammar/spelling), range of vocabulary and sentence structures, tone & style |
| **Organisation** | 7 | Coherence, paragraphing, cohesion, text-type-appropriate structure |

**Critical fact:** Mean scores hover around 50% (Part A: 50.2%, Part B: 47.0% SD ~19%). This means roughly half of all candidates score below half marks — prompts must be genuinely challenging at the top end while accessible at the bottom.

### The 2024+ Reform

From 2024 onward, Part B offers **4 questions** (down from 8 in earlier years), aligned to 4 broad modules rather than 8 electives. This means:
- No more module-specific labels (debating, sports, popular culture, etc.)
- Prompts must be self-contained — no assumed domain knowledge
- All questions compete equally — candidates can attempt any regardless of electives studied

---

## 2. Dimension 1: Authenticity

### What Makes a Prompt Feel "Real DSE"?

Based on analysis of all HKEAA sample papers (2012–2024) and the 2024 sample paper:

#### Authentic Markers (Must Be Present)

| Marker | Example from Real DSE |
|--------|----------------------|
| **Hong Kong context** | "Your school", "the Town Planning Board", "Students' Association", "Summer Institute" |
| **Named role for candidate** | "You are a member of the Students' Association", "You are a blogger" |
| **Specific audience** | "Write a letter to the board", "Write a proposal to the School Management" |
| **Concrete situation** | "Your school has been awarded a government fund", "You are taking part in a student-organised exhibition" |
| **Task verb** | "Write the article", "Write a proposal suggesting...", "Write a letter... and support your arguments" |
| **Relevant information** (Part A) | Data, questionnaire results, key points to include |
| **Naming conventions** | "Chris Wong" for self-reference, "Mary", "Peter", "Mr Smith", "Ms Young" for others |

#### Inauthentic Markers (Reject or Rewrite)

| Pattern | Why It's Wrong | Fix |
|---------|---------------|-----|
| Generic international context ("In many countries...") | DSE is Hong Kong-specific; prompts always situate in HK | Rewrite with HK-specific institution/body |
| Overly abstract/philosophical topic | DSE prompts ground issues in concrete scenarios | Add a specific role, audience, and occasion |
| No named audience | Every DSE prompt specifies who the candidate is writing to | Add recipient and their relationship to candidate |
| No explicit task verb | "Discuss the pros and cons" without "Write a letter/article/report" | Add a clear text type + task verb |
| Unrealistic scenario for a 17-year-old | DSE prompts stay within plausible student experience | Adjust to school, local community, or youth-related context |
| Marking scheme not derivable from prompt | HKEAA requires marking scheme be prepared in tandem with the question | Ensure each prompt has a clear scoring rubric |

### Authenticity Checklist

- [ ] Is the candidate given a specific role? ("You are a...")
- [ ] Is there a named audience or recipient?
- [ ] Is the situation grounded in a concrete, realistic scenario?
- [ ] Does the context reference Hong Kong (directly or via institutions)?
- [ ] Is there a clear task verb requiring a specific text type?
- [ ] Are bullet points or guiding questions provided for Part A?
- [ ] Does the word count guidance match DSE convention (~200 or ~400)?
- [ ] Would a real DSE candidate immediately understand what to produce?

---

## 3. Dimension 2: Content Safety

### Regulatory Context: The 2020 History Paper Incident

In 2020, a DSE History question asked whether "Japan did more good than harm to China" — triggering a major investigation by the EDB Task Force. Key findings relevant to prompt validation:

1. **Sensitivity guidelines were not provided** to the Moderation Committee — committees must receive and reference sensitivity guidelines during all moderation stages.
2. **Marking scheme was incomplete** — no marking criteria were provided for assessing candidates' holistic judgement of a controversial statement.
3. **No single individual should dominate** the question-setting process — collective responsibility is required.
4. **HKEAA rules require** that all draft questions be reviewed for alignment with curriculum aims and values.

**Implication:** Any AI-generated prompt must pass through a sensitivity gate before publication.

### Content Areas Requiring Scrutiny

Based on EDB guidelines, HKEAA internal rules, and textbook review criteria from EDB:

| Area | Check | Reject If... |
|------|-------|-------------|
| **National security / sovereignty** | Does the prompt touch on national security, territorial integrity, or political systems? | Implicitly guides candidate toward a particular political stance |
| **HK-China relations** | Does the prompt assume a position on HK's relationship with mainland China? | Takes sides or implies negative framing |
| **Historical controversies** | Does the prompt ask candidates to judge historical events/figures? | Frames a historical claim as debatable without providing balanced sources |
| **Sensitive social issues** | Does the prompt touch on race, religion, disability, gender identity, family structure? | Uses pejorative language, stereotypes, or forces candidate to take a potentially offensive stance |
| **Age-appropriateness** | Is the topic suitable for 17–18 year olds? | References adult content (violence, sexual content, substance abuse without educational framing) |
| **Stereotyping** | Does the prompt rely on cultural, gender, or socioeconomic stereotypes? | Characterizes any group in a reductive or demeaning way |
| **Values alignment** | Is the prompt consistent with "positive values and attitudes" per CDC curriculum guide? | Promotes values contrary to the curriculum (e.g., dishonesty, cheating, corruption as acceptable) |

### Content Safety Rules for AI-Generated Prompts

1. **Automatic blocklist**: Prompts containing any of the following must be rejected outright:
   - Direct political advocacy (for/against any political party, government, or policy position)
   - Religious endorsement or criticism
   - Racial or ethnic stereotyping
   - Gender-based generalizations that could be offensive
   - References to self-harm, violence, or illegal activity as normal behaviour
   - Anything that would be unsuitable for a school examination setting

2. **Review-required triggers**: Prompts touching these areas require experienced teacher review:
   - Hong Kong's relationship with mainland China
   - Environmental policy (can veer into political territory)
   - Technology ethics (AI, surveillance, privacy)
   - Work culture (can touch on labour rights)
   - Family structures (changing norms, declining birth rates — common DSE topics but sensitive)

3. **Values-positive framing**: DSE prompts should encourage candidates to develop and express reasoned positions, not simply "argue both sides." The EDB expects materials to "nurture students' positive values and attitudes."

### What Real DSE Prompts Do (Safe Patterns)

| Safe Pattern | Examples from Real DSE |
|-------------|----------------------|
| Student life and school improvement | "Write a proposal to the School Management suggesting two ways to use the fund" |
| Cultural observation (neutral) | "How Hong Kong popular culture has been influenced by Japan and/or Korea" |
| Community participation | "The Town Planning Board is inviting the public to express their views" |
| Personal experience | "Write an email to the hotel manager" about a disappointing experience |
| Local identity | "An exhibition on 'What makes Hong Kong Special'" |
| Youth perspectives | Advice columns, school magazine articles, student association matters |
| Arts and culture reviews | Book/movie/music reviews, drama club experiences |

---

## 4. Dimension 3: Structural Completeness

### Required Prompt Components

Based on HKEAA sample papers and item-writing standards (NBME, NYSED, TIMSS):

A complete DSE prompt MUST contain:

1. **Situation/Context** — What is happening? Where? Why?
2. **Candidate's Role** — Who is the candidate in this scenario?
3. **Audience** — Who is the candidate writing to/for?
4. **Purpose** — Why is the candidate writing?
5. **Task Verb** — What type of text must be produced?
6. **Content Requirements** — What must be included (explicit bullet points or implied scope)?
7. **Word Count Guidance** — ~200 words for Part A, ~400 for Part B

### Part A Required Elements (from 2024 Sample)

```
[Context] Last month, you took part in one of the classes offered at the Summer
Institute. The Institute would like you to complete the following questionnaire
after taking the class.

[Role] You are a student who attended the class.

[Information Provided] [Questionnaire showing class name, instructor, date,
ratings for content/delivery/facilities, open-ended questions...]

[Task] Complete the questionnaire. In your response, you should explain:
• what you learned from the class
• whether the class met your expectations
• what changes you would recommend to improve this course

[Word Count] (about 200 words)
```

### Part B Required Elements (from 2024 Sample)

```
[Context] Your school has been awarded a government fund to improve the
facilities and/or learning and teaching in the school.

[Role] You are a member of the Students' Association.

[Task] Write a proposal to the School Management suggesting two ways to use
the fund to improve the facilities and/or learning and teaching in the school.

[Word Count] (about 400 words)
```

### Structural Validation Checklist

- [ ] Context: Does the first paragraph establish a concrete scenario?
- [ ] Role: Is the candidate explicitly identified? ("You are a...")
- [ ] Audience: Is the recipient/readership specified?
- [ ] Purpose: Is it clear why this text is being written?
- [ ] Task verb: Is there an explicit instruction to "Write a [text type]"?
- [ ] Content guidance: Are there bullet points, questions, or topics to address? (Mandatory for Part A, recommended for Part B)
- [ ] Word count: Is the approximate length indicated?
- [ ] Marking criteria derivable: Can an assessor derive Content/Language/Organisation expectations from the prompt?

### Common Structural Failures in AI-Generated Prompts

| Failure | Example | Severity |
|---------|---------|----------|
| Missing audience | "Write an essay about climate change." **No recipient specified.** | High |
| No candidate role | "Write a letter to the editor about..." **Who is writing?** | High |
| Vague task | "Discuss the pros and cons of social media." **No text type specified.** | High |
| Too many elements | 5+ bullet points to address in 200 words | Medium |
| Missing context | Bare instruction without a scenario | Critical |
| Contradictory elements | "Write an informal email to your principal" | High |

---

## 5. Dimension 4: Clarity

### Principles from Assessment Item-Writing Standards

The NBME Item-Writing Guide, NYSED guidelines, and TIMSS framework converge on these rules for constructed-response prompts:

1. **Cover-the-options rule (adapted)**: A knowledgeable candidate should be able to produce a relevant response from the prompt alone, without guessing what the setter intended.
2. **Single unambiguous task**: The prompt should test one primary skill (or clearly scaffolded set of skills), not ask for contradictory things.
3. **Plain language**: Use direct vocabulary and sentence structure. Avoid unnecessary complexity in the prompt itself (save complexity for the expected response).
4. **Active voice** in task instructions: "Write a letter" not "A letter should be written."
5. **Positive framing**: Tell candidates what to do, not what not to do.
6. **No extraneous information**: Include only what is needed for the task.

### DSE-Specific Clarity Checks

| Check | Bad Example | Good Example |
|-------|-------------|-------------|
| **Ambiguous audience** | "Write about your views on school uniform." | "Write a letter to the Principal giving your views on the school uniform policy." |
| **Conflicting constraints** | "Write a formal letter to a friend." | "Write a letter to your cousin who lives overseas, telling him about your plans for the summer." |
| **Multiple tasks disguised as one** | "Describe the event and explain why it was important and suggest improvements." (Three tasks in one) | Keep to 1–2 tightly related tasks for Part B, or scaffold in bullet points for Part A. |
| **Assumed knowledge** | "Write an article about the electoral reform." | "Write an article for your school magazine about a new student council voting system." |
| **Cultural reference requiring insider knowledge** | "Write about the '674 incident'." | "Write about a historical event that has shaped your community." |
| **Vague quantifiers** | "Write about some changes." | "Describe two specific changes you would recommend." |
| **Leading question** | "Do you agree that social media is harmful? Write an essay." | "Social media has become an important part of young people's lives. Write an essay discussing its impact on teenagers." |

### Clarity Validation Protocol

**Step 1 — Self-test**: Cover the expected answer. Can you produce a relevant response from the prompt alone?

**Step 2 — Two-reader test**: Give the prompt to another person without explanation. Ask them: "What exactly are you being asked to write? Who is it for? What must you include?"

**Step 3 — Parse test**: Break the prompt into sentences. Label each: [Context] [Role] [Audience] [Task] [Requirements]. If any label is ambiguous, rewrite.

**Step 4 — Non-native speaker test**: Read the prompt assuming CEFR B2 English level (typical DSE candidate). Are any vocabulary items or sentence structures unnecessarily complex?

---

## 6. Dimension 5: Difficulty Calibration

### HKEAA Baseline Data

| Metric | Part A | Part B |
|--------|--------|--------|
| Mean score % | 50.2% | 47.0% |
| Standard deviation | 19.0% | 19.2% |
| Implied level | Can be attempted by all; depth differentiates | Genuinely challenging — half of candidates below 47% |

### Sources of Difficulty in DSE Writing Prompts

1. **Topic familiarity**: How well would a typical 17-year-old in Hong Kong know this topic?
2. **Abstractness**: Concrete scenarios (writing about a school event) are easier than abstract arguments (writing about freedom of speech).
3. **Structural scaffolding**: More scaffolding = lower difficulty. Part A is easier because it provides bullet points and information.
4. **Text type demands**: Letters are more familiar (and thus easier) than proposals or debate speeches with strict conventions.
5. **Cognitive demand**: Simple description/explanation (easier) vs. evaluation/judgment/recommendation (harder).
6. **Vocabulary burden**: Does the prompt itself use difficult words? (Avoid; difficulty should come from candidate's response, not from reading the prompt.)
7. **Cultural distance**: Topics close to Hong Kong students' lives (school, family, local culture) are easier than topics requiring knowledge of other cultures.

### Difficulty Calibration Table

| Factor | Makes Prompt Easier | Makes Prompt Harder |
|--------|-------------------|-------------------|
| Topic | School life, hobbies, local events | Global economics, technology ethics, governance |
| Role | Student, club member | Professional, advocate, expert |
| Audience | Friend, teacher, principal | Government body, professional association, public |
| Purpose | Describe, share experience | Persuade, evaluate, recommend |
| Text type | Email, personal letter, diary | Proposal, report, speech, argumentative essay |
| Structure | Bullet points provided | Open-ended with minimal guidance |
| Stance | Single clear position | Nuanced position requiring balanced argument |

### Historical Difficulty Patterns (2012–2022 Data)

From Chenglish.hk analysis of mean scores by elective module:

| Module | Mean Score | Difficulty Implication |
|--------|-----------|----------------------|
| Debating | ~11.7 | Slightly above average — familiar format (letter to editor, speech) |
| Popular Culture | ~11.0 | Moderate — accessible topics |
| Social Issues | ~10.5 | Moderate-hard — requires wider knowledge |
| Short Stories | ~9.2 | Harder — creative writing demands higher skill |
| Poems & Songs | ~9.1 | Harder — requires analysis and creativity |
| Sports | ~9.1 | Harder — niche vocabulary |
| Drama | ~8.9 | Hard — specific genre conventions |

### Calibration Protocol for New Prompts

1. **Tag the prompt** with: topic, text type, cognitive demand level (describe/explain vs. analyze/evaluate vs. argue/recommend), intended role
2. **Compare to historical DSE prompts** of similar tag profile: does the difficulty feel equivalent?
3. **Generate a model answer** (200 or 400 words at B2-C1 level): does it feel like it would land around 50% in marking?
4. **Run a panel review** (3+ raters): each rates expected difficulty on a 1–5 scale. If standard deviation >1.5, the prompt is unclear.
5. **Calibrate against the mean**: DSE prompts mean ~50%. If your prompt would clearly score higher than 70% for a typical candidate, it is too easy. If it would score below 30%, it is too hard or unclear.

---

## 7. Dimension 6: Topic & Text-Type Distribution

### Historical Text-Type Frequency (2012–2023)

Data from Chenglish.hk and Mastering Grammar analyses:

| Text Type | Count (2012–2023) | Comment |
|-----------|-------------------|---------|
| Feature article | 18 | Most common — versatile and accessible |
| Formal letter | 14 | Also very common |
| Letter to the editor | 12 | Stable frequency |
| Short story | 11 | Regular appearance, always popular |
| Speech | 7 | Moderate frequency |
| Essay | 6 | Appears regularly |
| Formal email | 6 | Moderate frequency |
| Blog post | 5 | Modern addition (from 2017 onward) |
| Letter of advice | 4 | Lower but regular |
| News report | 4 | Varies year to year |
| Debate speech | 3 | Niche but tested |
| Review | 3 | Music/film/book |
| Proposal | 2 | Low frequency but high-stakes for candidates |
| Report | 2 | Similar to proposal |
| Diary/journal | 3 | Part A format |

### Topic Domain Distribution

Based on analysis of 2012–2024 prompts:

| Domain | Examples | Frequency |
|--------|----------|-----------|
| **School & education** | School facilities, student clubs, courses, exams | Very high |
| **Local culture & identity** | Hong Kong culture, Star Ferry, local food | High |
| **Social issues** | Land use, birth rate, workplace monitoring | High |
| **Youth & lifestyle** | Hobbies, social media, part-time jobs | High |
| **Technology & ethics** | AI in competitions, workplace surveillance | Moderate (increasing) |
| **Environment** | Conservation, urban planning | Moderate |
| **Arts & entertainment** | Book/movie reviews, music, drama | Moderate |
| **Family & relationships** | Advice columns, family dynamics | Moderate |
| **Health & sports** | Exercise, diet, sports events | Moderate |
| **Travel & culture exchange** | Study tours, exchange programmes | Lower |

### Bias Detection Checks

| Bias Type | Signal | Action |
|-----------|--------|--------|
| **Text-type fatigue** | Same text type appears 3+ times in last N prompts | Force a less-used text type (e.g., proposal, report, diary) |
| **Topic clustering** | 3+ prompts on same domain (e.g., social media) | Diversify — no more than 1 in 4 prompts from same domain |
| **Cultural narrowness** | All prompts assume same socioeconomic background | Include prompts accessible to candidates from diverse backgrounds |
| **Gender skew** | All roles/characters default to one gender | Use "Chris Wong" for self (gender-neutral) and vary character genders |
| **Module overrepresentation** | Some modules dominate historically (debating: 28x, poems & songs: 12x) | Weight toward underrepresented modules when building prompt banks |

### Practical Target Distribution for a Prompt Bank

For a healthy bank of 20 prompts:

| Text Type | Target Count | Rationale |
|-----------|-------------|-----------|
| Article/Feature | 4 | Most common real DSE type |
| Formal letter (incl. Letter to the Editor) | 3 | Second most common |
| Speech | 2 | Regular appearance |
| Proposal | 2 | Underrepresented but important |
| Report | 2 | Underrepresented but important |
| Short story | 2 | Regular narrative option |
| Blog post | 2 | Modern and accessible |
| Email | 1 | Part A staple |
| Review | 1 | Occasional appearance |
| Diary/Journal | 1 | Part A staple |

---

## 8. Dimension 7: Text-Type Verification

### Why This Matters

DSE examiners specifically evaluate whether the candidate's response demonstrates "salient features of different genres" and "tone, style and register appropriate to text type." If a prompt claims to be a "speech" but doesn't require speech conventions, candidates cannot demonstrate this skill.

### Text-Type Feature Checklists

Each generated prompt must be verified against the conventions of its claimed text type.

#### Article (Feature Article / Newspaper Article / School Magazine)

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Title | Prompt must say "Write an article with a suitable title" or model answer requires one |
| Engaging opening | Context should position the candidate to hook the reader |
| Byline context | Prompt should indicate who is writing (e.g., "You are a student reporter") |
| Conclusion with call to action or reflection | Task should invite a forward-looking or reflective ending |
| Appropriate register | Prompt should make clear whether publication is formal (newspaper) or informal (school mag) |

#### Speech

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Audience address | Prompt must specify occasion and audience (e.g., "Give a speech at the school assembly") |
| Rhetorical devices invited | Task should call for persuasion or inspiration |
| First/second person | Scenario should naturally require "I believe..." / "You might think..." |
| Call to action | Purpose should end with a specific appeal to the audience |
| Signposting language | Length (~400 words) and persuasive purpose require structured argument |

#### Formal Letter (incl. Letter to the Editor)

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Sender and recipient | Prompt must specify both writer identity and addressee |
| Formal salutation | Scenario should require "Dear Sir/Madam" or named title |
| Clear subject line | For email format, prompt should imply subject; for letter, topic focus suffices |
| Formal closing | "Yours faithfully/truly" should be derivable from relationship |
| Complaint/request/opinion structure | Task must involve making a case, not just describing |

#### Proposal

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Problem/background | Prompt must establish a problem or opportunity |
| Two or more recommendations | Task should explicitly request suggestions (often with bullet points) |
| Justification | Purpose should require explaining WHY each recommendation works |
| Implementation plan | Higher-scoring proposals need to address feasibility |
| Formal, persuasive register | Addressing school management / board should imply formality |

#### Report

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Background/Purpose | Prompt should establish reason for the report |
| Findings | Task should require presenting information gathered |
| Subheadings | Length (~400 words) and formal structure necessitate organizational features |
| Recommendations | Report conventions require a "conclusion and recommendations" section |
| Objective tone | Scenario should imply neutral, factual reporting vs. personal opinion |

#### Short Story

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Narrative arc | Prompt should imply beginning, middle, end (e.g., continues from a given opening) |
| Character and setting | Context should suggest who and where |
| Conflict or tension | Task should hint at a problem or decision point |
| Descriptive language | Open-ended enough to allow creative description |
| First or third person | Prompt should not lock the candidate into a format that conflicts with narrative |

#### Blog Post

| Required Feature | How the Prompt Must Elicit It |
|-----------------|-------------------------------|
| Personal voice | Context should establish candidate as blogger with a perspective |
| Engaging title | Standard convention for blog posts |
| Interactive closing | "What do you think? Leave a comment" or similar expected |
| Informal register | "You are a blogger" implies personal, accessible tone |
| Thematic focus | Blog has a subject matter (e.g., cultural trends, travel, food) |

### Text-Type Verification Protocol

1. **Claim check**: What does the prompt CLAIM to be? (Article, Speech, etc.)
2. **Feature mapping**: Map the prompt against the feature checklist above.
3. **Gap identification**: If the prompt cannot elicit a required feature, it needs revision.
4. **Conflict check**: Does the prompt create contradictions? (e.g., "Write a formal letter to your best friend" — register conflict)
5. **Marking implication**: Would a marker be able to assess Organisation (7 marks) from this prompt? If not, add structural scaffolding.

---

## 9. Dimension 8: AI Generation Artifact Detection

### Known AI Artifact Patterns in Prompt Writing

Based on research from ai-slop-detect, Slop Detector, anti-pattern skills, and academic AI detection literature:

#### Critical Artifacts (Reject the Prompt)

| Artifact | Pattern | Example | Reason |
|----------|---------|---------|--------|
| **AI self-reference** | "As an AI language model...", "As an AI assistant..." | "As an AI, I cannot provide personal opinions..." | Never appears in real exam prompts |
| **Knowledge cutoff** | "As of my last update...", "As at my latest training..." | "As of 2025, the Hong Kong government has..." | Dates may be wrong; reads as AI |
| **Internal placeholders** | `[insert example here]`, `[placeholder]`, `[author name]` | "Write an article about [topic]" | Indicates incomplete generation |
| **Citation artifacts** | `oaicite:0`, `turn0search1`, `contentReference` | "According to [oaicite:0]" | Model internal artifact — never valid |
| **Refusal language** | "I cannot provide...", "I'm not able to..." | "I cannot write about this topic as it may be offensive" | Substituted into prompt content |
| **JSON format leaks** | JSON objects in output | `{"role": "system", "content": "..."}` | Generation boundary failure |

#### High-Severity Artifacts (Flag for Human Review)

| Artifact | Pattern | Example |
|----------|---------|---------|
| **Helpful openers** | "Certainly!", "Of course!", "I'd be happy to help!" | "Of course! Here's a DSE-style writing prompt:" |
| **Meta-commentary** | "Here is a writing prompt", "I have created this prompt..." | "This prompt is designed to test students' ability to..." |
| **Hedge phrases** | "It is important to note that", "It should be noted that" | "It is important to note that the Town Planning Board..." |
| **AI-favored adjectives** | "Robust", "seamless", "innovative", "holistic", "nuanced", "multifaceted" | "A robust and innovative proposal" in the prompt itself |
| **Formulaic transitions** | "Furthermore", "Moreover", "Nevertheless", "Additionally" opening every paragraph | "Furthermore, the school should also consider..." |
| **Significance puffery** | "Stands as a testament", "plays a vital role", "serves as a beacon" | "Hong Kong stands as a testament to cultural diversity" |
| **Tricolon lists** | Exactly three examples, three options, three reasons | "The benefits include improved health, better focus, and stronger community" |
| **Excessive em-dashes** | 4+ em-dashes in a short text | "The school—which was founded in 1990—has decided to implement—after much debate—a new policy" |
| **Perfect uniformity** | No spelling/grammar errors, identical sentence length distribution | AI text has lower perplexity and more uniform sentence length than human text |

#### Medium-Severity Artifacts (Rewrite)

| Artifact | Pattern | Fix |
|----------|---------|-----|
| **"In today's digital age"** opener | Generic modern opener | Replace with concrete DSE-style context |
| **"In recent years"** / "Nowadays" | Vague temporal opener | Replace with specific scenario |
| **"The landscape of"** | AI-favored metaphor | Remove; replace with direct statement |
| **"Delves into"** | AI overused word | Use "explores", "examines", or specific action |
| **"Delve" / "Navigating" / "Harness"** | AI vocabulary markers | Replace with plainer alternatives |
| **Blanket both-sides framing** | "There are pros and cons to both sides" | DSE prompts often invite a single position |
| **Overly neat resolution** | Closing that summarizes everything neatly | DSE prompts leave room for candidates to conclude |
| **"Not only... but also"** | AI-favored construction | Use sparingly or rephrase |

### Detection Protocol

**Automated gate** (run before human review):

1. Regex scan for critical artifacts → **auto-reject** if found
2. Check for AI self-reference patterns → **auto-reject**
3. Count em-dashes, transitional overuse, AI adjectives → **flag for review** if above threshold
4. Perplexity/burstiness check (optional: can use a simple n-gram frequency check)

**Human review** (any flagged prompt):

5. Read for "too perfect" language — no human examiner writes exam prompts like an encyclopedia
6. Check for formulaic three-point structures
7. Check for the "balanced argument" default — real DSE prompts often take a specific stance

### AI Refusal Detection

Sometimes the AI model refuses to generate a prompt (e.g., due to content filters) and substitutes a refusal or a different topic. Watch for:

- "I cannot provide a writing prompt about [X] because..."
- The actual topic changing between request and output without explanation
- Generic placeholder content substituted for the requested topic
- Apologetic framing ("I apologize, but here is an alternative prompt...")

---

## 10. Dimension 9: A/B Testing & User Validation

### What to Test

| Question | Method | Metric |
|----------|--------|--------|
| Do students find the prompt as clear as real DSE? | Side-by-side comparison (known DSE vs. AI prompt) | Clarity rating (1–5) |
| Can students identify which is AI-generated? | 10 prompts mixed (5 real DSE, 5 AI). Students guess. | <2/10 false identifications = passing |
| Does the prompt produce good writing? | Collect 20+ student responses. Expert rater scores Content (1–7). | Mean Content score should be near DSE average (~3.5/7) |
| Is the text type recognizable? | Students identify the required text type from the prompt alone | >80% identification rate |
| Is the difficulty appropriate? | Students self-report difficulty (1–5) after attempting | Mean ~3.0 (moderate) |
| Do students understand what to do? | Ask: "What are you supposed to write?" after reading prompt | >90% correctly describe task |

### A/B Testing Protocol

#### Phase 1 — Expert Panel (Before Student Testing)

- 3+ DSE teachers/experienced tutors review prompt
- Each rates independently on: Authenticity, Clarity, Difficulty, Content Safety (each 1–5)
- Mean <4.0 on any dimension → revise
- Identify modification needs (acceptable, modifiable, reject per medical education AIG research)

#### Phase 2 — Student Pilot (After Expert Approval)

- Minimum 10 students per prompt (target CEFR B2 level)
- Students write under timed conditions
- Post-writing survey: clarity (1–5), difficulty (1–5), topic familiarity (1–5)
- Writing samples assessed by 2 raters using DSE rubric
- Key metric: inter-rater reliability ≥0.7 on Content scores (indicates prompt is not ambiguous)

#### Phase 3 — Item Analysis (After Sufficient Data)

- Track mean Content score per prompt across 30+ responses
- Prompt is too easy if mean Content >4.5/7
- Prompt is too hard if mean Content <2.5/7
- Prompt is unclear if rating SD >2.0

#### Phase 4 — Production Monitoring

- Track which prompts are most/least used
- Track completion rates per prompt
- Flag prompts with high dropout rates (<50% completion)
- Collect optional student feedback on prompt quality

### Sample Size Guidelines

| Test Type | Minimum N | What You Can Conclude |
|-----------|-----------|----------------------|
| Expert review | 3 raters | Content validity, safety, authenticity |
| Student pilot (clarity) | 10–15 | Clear communication issues |
| Student pilot (difficulty) | 20–30 | Rough difficulty calibration |
| Production data | 50+ per prompt | Stable difficulty and discrimination metrics |

---

## 11. Dimension 10: Human Review Workflow

### Inspired by HKEAA's Moderation Process

After the 2020 History Paper incident, the EDB Task Force recommended:

> "All moderation meetings should be chaired by the Chief Examiner and attended by Moderators, who together should take collective responsibility for the moderation process."
> — EDB Task Force Report, Nov 2020

> "The marking scheme should be prepared in conjunction with the draft questions."
> — EDB Task Force Report

> "Sensitivity guidelines must be provided to Moderation Committee members."

### Proposed Review Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    GENERATION STAGE                      │
│  AI generates prompt → automated artifact gate passes   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               STAGE 1: AUTOMATED GATES                    │
│  ├─ Artifact detection (Section 9) → reject if positive  │
│  ├─ Sensitivity blocklist (Section 3) → reject if hit    │
│  ├─ Structural completeness (Section 4) → reject if fail │
│  └─ Text-type verification (Section 7) → reject if fail  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               STAGE 2: SINGLE REVIEWER                    │
│  One DSE teacher / experienced tutor reviews:            │
│  ├─ Authenticity (Section 2)                            │
│  ├─ Clarity (Section 5)                                 │
│  ├─ Difficulty (Section 6)                              │
│  ├─ Content safety (Section 3)                          │
│  └─ Text-type fit (Section 7)                           │
│                                                          │
│  Decision: Accept │ Minor edits │ Reject + reason        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               STAGE 3: MODERATION PANEL                   │
│  (For borderline / modified / sensitive prompts)         │
│  - Chair + 2 moderators                                  │
│  - Each rates independently before discussion            │
│  - Discuss discrepancies, reach consensus                │
│  - Document rationale for all HIGH flags                  │
│  - Sign off on marking scheme alignment                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│               STAGE 4: PRODUCTION RELEASE                 │
│  - Tag prompt with quality level (draft/reviewed/seed)   │
│  - Record in prompt bank with review date + reviewer ID  │
│  - Push to production catalog                            │
│  - Monitor performance data (Section 10, Phase 3-4)      │
└─────────────────────────────────────────────────────────┘
```

### Role Definitions

| Role | Qualification | Responsibilities |
|------|--------------|-----------------|
| **Prompt Generator** | AI system + post-processing | Produce initial prompt draft, pass through automated gates |
| **Reviewer (Stage 2)** | DSE English teacher or experienced tutor (3+ years DSE prep) | Single-review of prompt quality, suggest edits, approve/reject |
| **Moderator (Stage 3)** | Senior DSE English teacher / former HKEAA marker (5+ years) | Panel review of flagged prompts, sensitivity assessment, marking scheme alignment |
| **Chair (Stage 3)** | Chief examiner designate or senior curriculum specialist | Chairs moderation panel, resolves deadlocks, final sign-off |
| **Data Analyst (ongoing)** | Product team | Monitor prompt performance metrics, flag underperforming prompts |

### Required Review Documentation

Each reviewed prompt should have:

| Field | Example |
|-------|---------|
| Prompt ID | WR-2026-07-034 |
| Text type | Speech |
| Reviewer | John Smith (DSE English Teacher, 8 yrs) |
| Date | 2026-07-03 |
| Stage 2 decision | Accept with minor edits |
| Stage 3 decision (if needed) | Approved (unanimous) |
| Sensitivity notes | None — topic is "importance of extracurricular activities" |
| Authenticity rating | 5/5 |
| Clarity rating | 4/5 — simplified one sentence |
| Difficulty rating | 3/5 (moderate) — appropriate for Part B |
| Expected mean Content score | 3.5–4.0/7 |
| Marking scheme attached? | Yes |
| Last reviewed | 2026-07-03 |

### Retraining / Iteration

Flag rate targets for the AI generation pipeline:
- **Critical artifact rejection**: <5% of generations (if >5%, fix prompt template)
- **Stage 2 rejection** (after auto-gate pass): <20% acceptable; >30% means pipeline needs revision
- **Stage 3 escalation**: <10% of Stage 2 approved prompts should need moderation
- **Production flag**: <5% of released prompts should underperform (mean Content <2.5/7 or dropout >50%)

---

## 12. Rejection Criteria Summary

### Auto-Reject (Never Reaches Human)

| Criterion | Trigger Example |
|-----------|----------------|
| AI self-reference | Contains "as an AI", "I cannot", refusal language |
| Sensitivity blocklist | Political advocacy, religious criticism, offensive content |
| Structural failure | Missing audience, role, or task verb |
| Placeholder content | `[insert]`, `[placeholder]`, `oaicite:` |
| Text-type mismatch | Prompt claims "speech" but no audience to address |
| JSON/format leak | Raw model output formatting visible |

### Human-Reject (Reviewer Discretion)

| Criterion | Trigger Example |
|-----------|----------------|
| Inauthentic scenario | Generic non-HK context, unrealistic for 17-year-old |
| Ambiguous task | 50%+ of test readers cannot state what to write |
| Inappropriate difficulty | Clearly too easy (mean expected Content >5/7) or too hard (<2.5/7) |
| Topic fatigue | Same text type or domain repeatedly |
| AI artifact detectable | Formulaic structure, puffery, hedge language, AI-favored vocabulary |
| Unverifiable marking scheme | Cannot derive Content/Language/Organisation criteria |

### Editable (Acceptable with Changes)

| Issue | Typical Fix |
|-------|------------|
| Minor AI wording | Replace "In today's digital landscape" with concrete scenario |
| Missing word count | Add "(about 200 words)" or "(about 400 words)" |
| Slightly generic | Add a specific Hong Kong institution or context |
| Overly scaffolded | Remove one bullet point to allow more open-ended response |
| Missing naming convention | Replace names with "Chris Wong" / "Mary" / "Peter" per HKEAA rules |

---

## 13. Sources

### HKEAA Official Documents
- HKDSE English Language Assessment Framework (2024, 2025, 2028 editions)
- 2024 HKDSE English Language Paper 2 Sample Paper (ENG-SP-Paper2-2024)
- 2025 HKDSE English Language Sample Paper (2025-Sample-ENG-Paper2-S633)
- Briefing Session for the 2025 HKDSE English Language (PowerPoint)
- FAQs on English Language — Paper 2 (Writing)
- HKEAA Examination Circular No. (11) 2020/2021

### EDB / Government Reports
- EDB Task Force Investigation Report — Problematic History Question (Nov 2020)
- LC Paper No. CB(4)867/2023(04) — Curriculum Development
- Supplementary Notes to SECG (Jun 2021) — National Security Education
- Guidelines on Submission of Printed Textbooks for Review (2026)

### Item-Writing Standards
- NBME Item-Writing Guide (2025)
- NYSTCE Item Writing Guidelines (NYSED/Pearson)
- TIMSS 2019 Item Writing Guidelines
- Smarter Balanced Assessment Consortium Item Specifications
- ASC Item Writing Guide (2025)
- Handbook on Test Construction (University of Wisconsin)

### AI-Generated Content Research
- Isley et al. — "Assessing the Quality of AI-Generated Exams" (AAAI 2026)
- Quality assurance and validity of AI-generated SBA questions (PMC, 2025)
- Frontiers in Computer Science — "AI-assisted MCQ creation increases item-writing flaws through automation bias" (2026)
- QUEST Framework for LLM-generated MCQs (Springer, 2025)
- Bhandari et al. — "Evaluating psychometric properties of ChatGPT-generated questions" (CAEAI, 2024)
- Detection of AI-generated Essays in Writing (ETS Research, 2023)
- GL-CLiC — Sentence-Level AI-Generated Text Detection (IJCNLP, 2025)

### AI Pattern Detection
- ai-slop-detect (GitHub: antydizajn) — 70+ AI writing patterns
- Slop Detector (halans/ai-pattern-detection) — 46 detection patterns
- Bloomberry Research — "Sentence-Level Patterns That Make AI Writing Detectable" (2026)
- McGovern et al. — "Your Large Language Models Are Leaving Fingerprints" (ArXiv, 2024)
- ai-anti-patterns skill (edwinhu/workflows)

### DSE Historical Analysis
- Chenglish.hk — HKDSE English Paper 2 Analysis (2012–2023 text types, module scores)
- MasteringGrammar.com — Complete List of Writing Genres (2012–2023)
- GETUTOR Hong Kong — DSE English Composition Format Guide
- Spencer Lam — DSE English Paper 2 Writing Guide
- DSE TREASURE — Past paper archives and exemplars

### Educational Assessment
- Haladyna, T.M. — "Developing and Validating Multiple-Choice Test Items" (2004)
- PubMed — "Quality assurance of item writing: during the introduction of MCQs in medicine" (2008)
- TIMSS & PIRLS Assessment Frameworks

---

*This framework should be reviewed and updated whenever the HKEAA releases a new assessment framework or sample paper. Last reviewed against: 2028 HKDSE English Language Assessment Framework (current as of Jul 2026).*
