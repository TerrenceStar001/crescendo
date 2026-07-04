# AI-SPEC: Auto-Generation Reliability & Quality

> Design contract for Phase 8 of Crescendo (v1.1 milestone).
> Domain: HKDSE English Language Paper 2 Writing (AI-generated writing prompts) + Paper 1 Reading (passages and questions) + Courses (auto-generated learning materials)

---

## 1b. Domain Context

**Industry Vertical:** Hong Kong secondary education examination preparation (HKDSE English Language)

**User Population:** Hong Kong secondary school students (Form 4–6, ages 15–18) preparing for the HKDSE English Language examination. Primary users are self-studying Cantonese-speaking students who need authentic DSE-level English practice materials. Secondary users include English tutors, teachers assigning practice, and adult learners retaking the exam.

**Stakes Level:** High

**Output Consequence:** Students practice on AI-generated materials with the expectation that the experience mirrors the real HKDSE exam. If AI-generated writing prompts, reading passages, or course content are topic-inappropriate (wrong genre, culturally irrelevant, taboo topics, non-Hong Kong context), students form incorrect expectations about the exam, waste limited revision time, and lose trust in the platform. In worst case, students learn wrong exam formats or prepare for topics that never appear, directly impacting their exam performance.

---

### What Domain Experts Evaluate Against

#### Dimension 1: DSE Topic Authenticity — Writing Prompts

**Good (domain expert would accept):** Prompt matches a real DSE Paper 2 Part B elective module (e.g., "Learning English through Social Issues"), uses a genre that has appeared in real exams (letter to editor, article, speech, blog, report, proposal, email, short story), grounds the scenario in a Hong Kong-specific context (e.g., "Write a letter to the editor of the Hong Kong Daily"), and provides clear role-playing instructions ("You are the chairperson of the Heritage Club").

**Bad (domain expert would flag):** Prompt uses a topic that has never appeared in 14 years of DSE exams (e.g., cryptocurrency trading, Chinese politics, religion, military service), uses a genre never tested (e.g., research paper, memo, legal brief), lacks a Hong Kong anchor (generic "write an essay about environmental protection"), or frames the task in a way that doesn't match the HKEAA's tested formats.

**Stakes:** Critical
**Source:** HKEAA past papers 2012–2025 (14 years of real exam data); examiner reports published annually

---

#### Dimension 2: DSE Text-Type Coverage — Reading Passages

**Good (domain expert would accept):** Passage fits one of the verified DSE text types — news report, feature article, opinion piece, autobiography/memoir excerpt, novel excerpt, blog post, webpage, letter to editor, academic text, forum post, guide/informational text. The passage has a clear source attribution pattern (author name, publication name, date where appropriate) matching DSE conventions.

**Bad (domain expert would flag):** Passage uses a text type rarely or never seen in DSE Paper 1 (e.g., poetry, play script, scientific paper, instruction manual, advertisement, advertisement copy). Passage lacks any source identity or uses a fake source format. Passage feels like generic ESL textbook content rather than authentic English-language media.

**Stakes:** High
**Source:** HKEAA examiner reports 2012–2024; HKEAA 2018 briefing session (Paper 1 text types); Pearson annual DSE analyses

---

#### Dimension 3: Hong Kong Cultural Grounding

**Good (domain expert would accept):** Content references Hong Kong-specific locations (Tsim Sha Tsui, Victoria Park, Hong Kong Adventure Farm, West Kowloon Cultural District), institutions (Hong Kong Daily, Young Post, Hong Kong Post, Hong Kong Academy for Performing Arts), and culturally authentic scenarios (school lockers debate, TSA drills, NEETs phenomenon, housing estate Instagram spots, disappearing street life, traditional crafts like bamboo scaffolding, egg tarts, mahjong, lion dance).

**Bad (domain expert would flag):** Content uses non-Hong Kong settings (US high schools, UK universities, generic "Western" contexts), or references mainland Chinese political topics, or uses Hong Kong locations in ways that feel inauthentic (e.g., a character buying a sports car at the Peninsula Hotel in a way that doesn't reflect Hong Kong socioeconomic reality as experienced by teenagers).

**Stakes:** High
**Source:** 14 years of DSE past papers; Spencer Lam year-by-year DSE writing question archive (2012–2025); Young Post candidate reports

---

#### Dimension 4: Difficulty Calibration by Part (A/B1/B2)

**Good (domain expert would accept):** Part A passages are 350–450 words with concrete, straightforward content targeting general understanding. Part B1 passages stay under 600 words with moderately complex sentence structures. Part B2 passages are 650–850 words with sophisticated vocabulary, abstract concepts, irony, metaphor, and discourse markers requiring inference — matching the HKEAA's documented differentiation strategy.

**Bad (domain expert would flag):** All passages are roughly the same difficulty. Part B2 is not noticeably harder than B1. Part A contains abstract vocabulary requiring inference. Word counts deviate significantly from DSE norms (A: 350–450, B1: 500–600, B2: 650–850 estimated from examiner reports).

**Stakes:** High
**Source:** HKEAA 2018 briefing session (Paper 1 structure); examiner reports on candidate performance by part

---

#### Dimension 5: Genre-Specific Format & Register Awareness

**Good (domain expert would accept):** Content correctly distinguishes genre conventions — a letter to the editor follows formal argumentation structure with counter-arguments; a blog post uses conversational yet informed register; a speech opens with salutation to audience; a report uses headings and subheadings; a short story uses narrative tenses and descriptive language; a proposal outlines activities, budget, benefits.

**Bad (domain expert would flag):** Genres are mixed up (speech written as a blog post, report written as an article), register is inappropriate (academic prose in a blog, slang in a formal letter), structural conventions are missing (no salutation in a letter, no headline in an article, no title in a proposal).

**Stakes:** Critical
**Source:** GETUTOR analysis of DSE Paper 2 genre conventions; HKEAA examiner reports citing format errors as common mark-losing pitfalls

---

### Known Failure Modes in This Domain

1. **Topic-selection mismatch (Critical):** The AI generates writing prompts or reading passages on topics that have never appeared in real DSE exams and don't fit the HKEAA's implicit topic boundaries. Real DSE topics are deliberately chosen to be accessible to all candidates regardless of background knowledge — no specialized expertise required. Topics like "AI ethics in the workplace" or "cryptocurrency regulation" that require technical knowledge would disadvantage candidates and would never appear. The AI must avoid this error pattern.

2. **Cultural-flattening (High):** The AI produces content that is culturally generic — it could be about any English-speaking context rather than specifically Hong Kong. Real DSE prompts are always Hong Kong-grounded: they reference Hong Kong publications, Hong Kong locations, Hong Kong government bodies, and Hong Kong social phenomena. Generic "write an essay about fast fashion" without a Hong Kong angle is detectable by domain experts as non-DSE.

3. **Register-blind genre writing (High):** The AI generates writing prompts where the target genre and required register don't match. Real DSE Paper 2 Part B questions always specify an exact genre (letter to editor, blog entry, article, speech, report, proposal, email, short story) and provide a specific role and audience. Failure to preserve these conventions in generated prompts produces content that misleads students about exam expectations.

4. **Difficulty compression (High):** AI-generated passages for Part B1 and B2 are not sufficiently differentiated. In real DSE, B2 is markedly harder — more sophisticated vocabulary (e.g., "conjecture" vs. "guess"), denser sentence structures, implied meanings requiring inference, and discourse-level comprehension. The 2018 HKEAA briefing noted that candidates "struggled when attempting items which tested understanding of discourse markers, metaphors and irony" — these features must be concentrated in B2, not absent or spread uniformly.

5. **Template overuse / robotic content (Medium):** Memorized introductory phrases, formulaic transitions, and recycled examples characterize low-scoring candidate responses. When the AI generates or expects template-like structures, it reinforces bad habits. Real DSE 5** responses show organic language, specific examples, and natural argument development — not "Firstly, Secondly, Lastly" mechanical structures.

---

### Regulatory / Compliance Context

- **HKEAA Copyright:** Past exam papers are copyrighted by the Hong Kong Examinations and Assessment Authority. AI-generated content can reference exam *topic categories* and *structural patterns* but must not reproduce actual exam questions, passages, or marking schemes verbatim. The system should generate novel content that follows DSE patterns without copying protected material.

- **Education Ordinance (Hong Kong):** No specific AI regulation for educational tools. General requirement that educational materials are accurate and age-appropriate for minors (ages 15–18).

- **Data Privacy (PDPO):** Hong Kong's Personal Data (Privacy) Ordinance applies to any user data collected. Student writing samples, performance data, and error analysis should be stored locally (IndexedDB / localStorage) per existing architecture. No student data should be sent to third-party AI services beyond what the user explicitly submits for AI correction.

- **Exam Integrity:** The system is a practice tool, not a proxy for the real exam. Content must not claim to be "actual leaked DSE papers" or "predicted exam topics with guarantee." Clear labeling as "AI-generated practice material" prevents misleading students.

- **No specific domain regulation identified** beyond standard educational content requirements for this deployment context (self-study app, not a registered educational institution).

---

### Domain Expert Roles for Evaluation

| Role | Responsibility in Eval |
|------|----------------------|
| **DSE English Tutor** (5+ years HKDSE teaching experience) | Reference dataset labeling — identify which real-DSE topics, genres, and text types are authentic vs. implausible; rubric calibration on topic authenticity dimension; edge case review for culturally inappropriate content |
| **HKDSE Examiner / Marker** (or former HKEAA marker) | Production sampling — review generated writing prompts and reading passages against HKEAA standards; validate difficulty calibration between Part A/B1/B2; confirm genre and register conventions match real marking schemes |
| **Senior Secondary Student** (Form 6, high-achieving, 5* or above) | Edge case review — flag content that feels "off" from a test-taker's perspective; identify prompt ambiguity, unnatural scenarios, or non-DSE topic patterns |
| **Curriculum Developer** (experienced in DSE English materials) | Rubric calibration — define Good/Bad boundaries for all five evaluation dimensions; validate that AI-generated content covers the full range of tested text types and genres proportionally |
| **Product Owner / Lead Educator** | Final sign-off on domain suitability; arbitrate borderline cases where topic authenticity is ambiguous; maintain topic boundary documentation (what's in/out) |

---

### Research Sources

- HKEAA Past Papers 2012–2025 — English Language Paper 2 (Writing) and Paper 1 (Reading), via dse.best, dsepp.com, and HKEAA official site
- HKEAA 2018 Briefing Session PowerPoint — English Language Paper structure, statistics, examiner recommendations ([hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/PowerPoint-ENG-1810.pdf](https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/PowerPoint-ENG-1810.pdf))
- HKEAA Assessment Frameworks 2024, 2025 ([hkeaa.edu.hk/en/hkdse/hkdse_subj.html](https://www.hkeaa.edu.hk/en/hkdse/hkdse_subj.html?1&2_25&A1))
- Spencer Lam — Complete year-by-year DSE English Paper 2 question archive (2012–2025) ([spencerlam.hk/blog/2022/10/29/dse英文作文題目](https://spencerlam.hk/blog/2022/10/29/dse%E8%8B%B1%E6%96%87%E4%BD%9C%E6%96%87%E9%A1%8C%E7%9B%AE/))
- thinka.ai — DSE English Language analysis 2021–2025, topic frequency, difficulty trends, examiner insights ([thinka.ai/en-HK/past-paper/HKDSE/English-Language](https://www.thinka.ai/en-HK/past-paper/HKDSE/English-Language/2025/analysis))
- GETUTOR — DSE English Paper 2 format guide, genre conventions, scoring criteria ([getutor.com.hk/en/51367](https://www.getutor.com.hk/en/51367))
- Ms Priscilla English (pllearning.com) — 2023, 2024, 2025 Paper 2 real questions and 5** sample essays
- SCMP Young Post — DSE 2026 English exam student reactions, topic analysis ([youngpostclub.com](https://www.youngpostclub.com/yp/learning-zone/study-tools/exam-tips/article/3349738/dse-2026-english-reading-and-writing-papers-were-straightforward-and-relatable))
- Scribd document collections — Topic banks, 141 potential writing topics categorized by elective module
- Wikipedia — HKDSE overview, assessment structure, history ([en.wikipedia.org/wiki/Hong_Kong_Diploma_of_Secondary_Education](https://en.wikipedia.org/wiki/Hong_Kong_Diploma_of_Secondary_Education))

---

## Appendix A: Full DSE English Paper 2 Topic Domain Analysis

### A1. The Eight Elective Modules (Part B Framework)

Paper 2 Part B questions are organized under eight elective modules from the NSS English Language curriculum. Every year, 8 questions (one per module, but Short Stories gets two) are offered:

| # | Elective Module | Topics Covered | Recurrence |
|---|----------------|---------------|------------|
| 1 | **Sports Communication** | Sports benefits, facilities access debate, athlete career, Olympic sports, marathon, fitness, dancers as athletes, tai chi, PE lessons | Every year (2012–2025) |
| 2 | **Debating** | Four-day school week, social media influencers, school rank reporting, TV makes us smarter, harbour front development, food warning labels, workplace monitoring | Every year |
| 3 | **Social Issues** | Filming in city centre, electric vehicles, independent shops decline, NEETs (not in education/employment/training), international talent, primary school exam pressure, disappearing street life, youth culture preservation | Every year |
| 4 | **Workplace Communication** | Summer job experience, PR/complaint handling, career advice column, no-refund policy, job application, intern at Correctional Services, campaign poster design, fresh grad stereotypes | Every year |
| 5 | **Popular Culture** | Cosmetic surgery obsession, stand-up comedy, cinemas decline, athleisure fashion, Hong Kong housing estate Instagram, k-pop/cantopop, YouTube channel creation, Chinese opera at Xiqu Centre | Every year |
| 6 | **Short Stories** | "Revenge is Sweet" competition, detective story, pet bird's perspective, hiker survival, The Tortoise & the Hare rewrite, security guard horror, friendship theme from poem | Every year (highest attempt rate) |
| 7 | **Poems & Songs** | Song lyric reflection, poetry festival preparation, scholarship application for poetry workshop, music festival blog as lead singer, band bio | Every year |
| 8 | **Drama** | Romeo and Juliet essay, Drama Club misconduct email, acting career vs academic, Cinderella film review, screenwriting proposal, Julius Caesar diary | Every year |

### A2. Topic Categories by Frequency (from 14 years of data)

**Very High Frequency (appears 5+ times across years):**
- School life and academic pressure (lockers, exams, TSA, school start time, homework, class rank, PE lessons)
- Career and future planning (job seeking, fresh grad expectations, career change, higher education choices, internships)
- Technology and social media (parental monitoring apps, social media influencers, YouTube channels, Instagram, online debates)
- Hong Kong culture and heritage preservation (disappearing street life, egg tarts, mahjong, Chinese opera, traditional crafts, intangible cultural heritage)
- Environmental issues (electric cars, eco-friendly products, food waste, sustainability, tai chi connection to nature)
- Youth issues and social problems (NEETs, depression/mental health, teenage stress, suicide prevention, graffiti/vandalism)
- Sports and fitness (sports benefits, marathon, school facilities, Olympic games, athletes as role models)

**Medium Frequency (appears 3–4 times):**
- Work-life balance (long working hours, office stress, promotion decisions, freelancing vs corporate)
- Family relationships (parent-child conflict, career choice disagreements, family expectations)
- Tourism and travel (Hong Kong attractions, hotel complaints, holiday destinations, gap year)
- Creative writing (short story competitions, narrative from unusual perspective, rewriting fables)
- Music and performing arts (band performance, music festival, singer interviews, poetry workshops)
- Consumer culture (fast fashion, food trends, restaurant reviews, shopping habits, athleisure)

**Low Frequency (appears 1–2 times):**
- Urban planning (harbour front development, housing policy, public space)
- Food and dining (restaurant review writing, food delivery trends, healthy eating labels)
- Animal welfare (pet-friendly cities, zoo ethics, conservation)
- Drama and theatre (stage play reviews, drama in education, screenwriting)
- Immigration/overseas study (studying abroad, international talent, Hong Kong graduates in Asia)

**Never Appears (taboo topics):**
- Mainland Chinese political topics (National Security Law, Tiananmen Square, Xinjiang, Tibet, Taiwan sovereignty)
- Hong Kong independence or political reform
- Religious beliefs, conversion, or religious conflict
- Explicit sexual content or sex education
- Drug use (except in the context of "Second Chance" rehabilitation in 2012 Q8 — framed as reformed criminals)
- Violence, terrorism, or war
- Specific political figures or parties (local or international)
- Mental illness beyond depression (e.g., schizophrenia, bipolar disorder in personal narrative)
- Any topic requiring specialized domain knowledge unavailable to a 17-year-old student

### A3. How Prompts Are Hong Kong-Grounded

Analysis of 14 years of prompts reveals these localization patterns:

**Publications:** Hong Kong Daily (most common), Hong Kong Post, Young Post (SCMP), Hong Kong Express, Teen Magazine, Showbiz magazine, Jobs Online, Health and Fitness eMag, Eat & Drink online food guide

**Organizations:** Hong Kong Sports Foundation, Hong Kong Academy for Performing Arts, Hong Kong Correctional Services, West Kowloon Cultural District, Xiqu Centre, Hong Kong Adventure Farm, District Councils, Home Affairs Department

**Locations:** Tsim Sha Tsui, Victoria Park, Hong Kong Museum of Art, Happy Valley, New Territories, Hong Kong Island, theme parks (Ocean Park, Disneyland)

**Social Phenomena:** NEETs (not in education/employment/training), TSA (Territory-wide System Assessment), DSE (the exam itself), Hong Kong's disappearing street life, housing estate Instagram tourism, cram school culture, the "second chance" employment scheme for reformed criminals

**Cultural References:** Lion dance, dragon boat racing, Chinese opera, mahjong, egg tarts, bamboo scaffolding, calligraphy, tea ceremony, feng shui, soy sauce Western restaurants (example from real paper)

### A4. Topic Evolution 2012–2025

**2012–2014 (Early years):** Heavy focus on school life debates (lockers, PE lessons, drama club misconduct) and straightforward social issues (filming in city centre, summer jobs, museum vandalism). Writing frames were highly structured with explicit instructions ("provide three reasons"). Part A asked for guided formats like feature articles, photo exhibition explanations.

**2015–2017 (Mid-period):** More complex social issues emerged — NEETs (2017), mental health/depression (2012, then re-emerged), disappearing street life (2016), Hong Kong graduates seeking work in Asian cities (2016). Technology topics appeared: parental monitoring apps (2016), debate about TV making us smarter (2017). Hong Kong cultural identity became a recurring theme.

**2018–2020 (Maturity):** Very contemporary topics — athleisure fashion trend (2018), social media influencers (2019, 2021), electric vehicles (2021), Instagram housing estate tourism (2020), independent stationery shops declining (2020). Genres diversified: blog posts, online forum posts, magazine features became common. Prompt structures became less prescriptive, allowing more creative responses.

**2021–2023 (Post-COVID era):** Workplace communication became more prominent (fast fashion returns policy, advice column about career change). Mental health and well-being continued (gratitude challenge, 21-day reflection). Environmental topics (eco-friendly products). The 2023 paper featured tai chi as a cultural export. Part A moved toward practical literacy (application forms, promotional materials, leaflets).

**2024–2025 (Current period):** Highly relatable everyday topics — hotel complaint (Part A), pet-friendly cities, viral social media experiences, music promotion blogs (2024), promotional leaflet for teen art club (Part A 2025), coffee shops used for tutoring (2025), vegan lifestyle blog (2025). The 2025 paper also had workplace group work challenges. 2026 exam featured bubble tea and YouTube channels (Part A/B1 reading), holiday themes (B2 reading), with Part A writing being a promotional leaflet.

**Trends over time:**
1. Decrease in prescriptive "give three reasons" framing — more open-ended prompts from 2018 onward
2. Increase in digital-native genres (blog posts, online forum responses, YouTube channel articles)
3. Growing emphasis on Hong Kong cultural identity and heritage preservation
4. Shift from purely argumentative to mixed-genre (narrative + argumentative, reflective + persuasive)
5. Contemporary relevance tracking real-world issues (electric cars, social media, gig economy)
6. Part A moving from letters/announcements toward practical everyday writing (reviews, leaflets, applications)

### A5. Question Format Distribution (Part A)

| Year | Part A Genre | Topic |
|------|-------------|-------|
| 2012 | Feature article (guided) | Being a famous news reporter |
| 2013 | Photo exhibition captions | "My Memories" personal photos |
| 2014 | Newsletter article | Old village in Hong Kong |
| 2015 | Letter to editor | School start time debate |
| 2016 | Speech (guided) | Welcome speech to new students |
| 2017 | Letter to principal | Community project proposal |
| 2018 | Letter to parents | School trip to sky100 |
| 2019 | Yearbook entry | Academic & student life reflections |
| 2020 | Online restaurant review | Dim Sum One restaurant |
| 2021 | Morning assembly announcement | School fair |
| 2022 | Visitor guide | Hong Kong Adventure Farm |
| 2023 | Application form | Eco-friendly pop-up shop |
| 2024 | Complaint email | Disappointing hotel stay |
| 2025 | Promotional leaflet | 852 Teen Art Club |

### A6. Key DSE English Language Facts for AI Calibration

- **Paper 2 weighting:** 25% of total subject mark (Part A: 10%, Part B: 15%)
- **Time:** 2 hours
- **Part A word count:** ~200 words
- **Part B word count:** ~400 words
- **Text types for part A:** Letter, email, article, speech, report, review, announcement, guide, application, leaflet
- **Text types for part B:** Argumentative essay, letter to editor, article, speech, report, proposal, blog, email, short story, debate speech, news report, feature article, diary entry, journal entry, advice column, forum post, campaign poster with explanation, application letter
- **Marking criteria:** Content (relevance, elaboration, task fulfillment), Language (vocabulary range, accuracy, sentence variety), Organisation (paragraphing, cohesion, format conventions)
- **Candidate count:** ~50,000–58,000 per year (2024: 50,803; 2026: 58,000+)
- **DSE Grade descriptors (public):** Level 5** = ≥85% (estimated), Level 4 = 59–61%, Level 3 = 45–47%, Level 2 = ~30% (by reconstruction)
