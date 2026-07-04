# HKDSE Past Paper Acquisition Guide

**Research:** Sources, download methods, extraction pipelines, and legal considerations
**Date:** 2026-07-03
**Status:** Complete
**Purpose:** Comprehensive guide for building an authentic DSE question bank in Crescendo

---

## Table of Contents

1. [Official HKEAA Sources](#1-official-hkeaa-sources)
2. [Third-Party Archives](#2-third-party-archives)
3. [What Currently Exists in Crescendo](#3-what-currently-exists-in-crescendo)
4. [Format & Extractability](#4-format--extractability)
5. [Text Extraction Pipeline](#5-text-extraction-pipeline)
6. [OCR Strategy for Scanned Papers](#6-ocr-strategy-for-scanned-papers)
7. [DSE English Paper 2 Writing Prompts — Complete Source Map](#7-dse-english-paper-2-writing-prompts--complete-source-map)
8. [Legal Considerations](#8-legal-considerations)
9. [Alternative Approaches & Build-vs-Buy](#9-alternative-approaches--build-vs-buy)
10. [Recommendations for Crescendo](#10-recommendations-for-crescendo)
11. [Sources](#11-sources)

---

## 1. Official HKEAA Sources

### 1.1 HKEAA Online Bookstore

**URL:** https://online.hkeaa.edu.hk/Bookstore/faces/1_home.xhtml
**Status:** Active — paid only

The HKEAA publishes "Question Papers (with marking schemes and comments on candidates' performance)" for every DSE year (2012–2025). These are **printed booklets** sold through:

| Purchase Method | Details |
|----------------|---------|
| **Online Bookstore** | https://online.hkeaa.edu.hk/Bookstore/ — credit/debit card, delivered by mail |
| **In-person** | HKEAA San Po Kong Office, 17 Tseuk Luk Street |
| **School order** | Schools can order in bulk |

**Pricing (2025):**

| Subject | Chinese Version | English Version |
|---------|----------------|-----------------|
| English Language | — | HK$114 (~US$15) |
| Chinese Language | HK$114 | — |
| Most electives | HK$66–100 | HK$66–100 |

**Key Facts:**
- Papers are **physical print booklets**, NOT digital downloads
- No PDF download option exists from the official source
- Delivery takes 2–6 working days (HK/Macau)
- Older years (2022) are sold at 50% off
- Sample papers are **free PDF downloads** from the HKEAA website

### 1.2 Free Official Resources from HKEAA

| Resource | URL | Format |
|----------|-----|--------|
| **2024 Sample Paper (English Paper 2)** | https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/ENG-SP-Paper2-2024.pdf | PDF (digital, selectable text) |
| **Sample Papers Index** | https://www.hkeaa.edu.hk/en/hkdse/assessment/sample_practice_paper/ | PDF links |
| **Candidate Performance Examples** | https://www.hkeaa.edu.hk/en/hkdse/assessment/candidate_performance/ | PDF (scanned) |
| **Examination Reports** | Available per year/subject (free in library) | Print only |

### 1.3 Photocopying Service

HKEAA offers a photocopying service for past HKDSE question papers:
- **Cost:** HK$1 per page + HK$25 administration fee per subject per year
- **Form:** https://www.hkeaa.edu.hk/en/our_services/forms/publications_form/
- **Turnaround:** ~7 working days
- **Format:** Physical photocopies, not digital

### 1.4 Library Access

| Library | Access |
|---------|--------|
| **HKU Education Library** | Last 3 years restricted to library use; older editions available for 1-day loan |
| **Hong Kong Public Libraries** | Multimedia Information System — some papers available |
| **School libraries** | May have physical copies |

---

## 2. Third-Party Archives

### 2.1 Active Archives (As of July 2026)

| Site | URL | Years | Format | Status |
|------|-----|-------|--------|--------|
| **dse.rioho.dev** (dse.life backup) | https://dse.rioho.dev/past-papers | 2012–2025 | PDF direct download | Active |
| **dseweb.site** | https://www.dseweb.site/past-papers | 2012–2025 | PDF direct download | Active |
| **dsepaper.hk** | https://dsepaper.hk/ | 2012–2025 | PDF links + community upload | Active |
| **dse.best** | https://dse.best/ | 2012–2025 | PDF per subject/year | Active |
| **dse-hive** | https://dse-hive.nekoweb.org/ | 2012–2025 | PDF with timers | Active |
| **dsesource.com/dsepp** | https://dsesource.com/dsepp/ | 2012–2025 | PDF links (external) | Active |
| **dsetreasure.com** | https://dsetreasure.com/dse-past-paper/ | 2012–2025 | PDF links | Active |
| **dse247.com** | https://dse247.com/ | 2012–2024 | PDF direct download | Active |
| **Google Drive (community)** | Various (see Section 2.4) | 2012–2025 | PDF | Shared on demand |
| **dse.link** | https://dselink.odoo.com/past-paper | SP-2024 | PDF links | Active |
| **PassPaper.Unstoppable** | https://passpaper-unstoppable.github.io/dse.life/ | 2012–2025 | PDF direct download | Active |

### 2.2 Primary Mirror Infrastructure (What dse.life Mirrors Use)

The original dse.life went offline, but its data lives on through GitHub mirrors. The primary mirror:

- **GitHub:** `Lucasyh/dse.life-mirror`
- **Raw base URL:** `https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/`
- **Index page:** `https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html`
- **Paper URL pattern:** `{base}/eng/dse/{year}/p{1-4}.pdf`
- **Answer URL pattern:** `{base}/eng/dse/{year}/ans.pdf`
- **Performance URL pattern:** `{base}/eng/dse/{year}/per.pdf`

This is the exact source currently used by Crescendo's `dsePapers.js` crawler.

### 2.3 Common URL Patterns

```
# English Language DSE Papers (via dse.life mirror)
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/{year}/p{1-4}.pdf
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/{year}/ans.pdf
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/{year}/per.pdf

# Example: 2023 English Paper 2 (Writing)
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/2023/p2.pdf

# Sample Paper
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/sp/p2.pdf

# Practice Paper
https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/pp/p2.pdf
```

### 2.4 Google Drive Community Archives

Users actively share paper collections via Google Drive. Notable collection:
- **Threads post (2025):** User "gung1zi2" compiled all Category A subjects
- **Drive link:** `https://drive.google.com/drive/folders/1j-j-2gxdrFRBPz-Pnuv31FRi8n_Fx_MA`
  - Contains 2012–2024 papers for all subjects
  - Marking schemes and candidate performance included
  - 2025 papers added in early 2026

**How to find current Drive links:**
- Search `site:threads.com OR site:reddit.com "DSE past paper" "Google Drive"`
- Check Hong Kong education forums (小卒論壇 — requires account)
- Follow DSE-related social media accounts (Threads, Discord)

### 2.5 Crawling Strategy for dse.life Mirrors

```javascript
// URL structure for all known mirrors:
const MIRRORS = [
  'https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp',
  'https://raw.githubusercontent.com/{other-mirror}/refs/heads/main/static/pp',
];

// English papers are at: {mirror}/eng/dse/{year}/p{paper}.pdf
// Index pages at:
const INDEX = 'https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html';
```

**What Crescendo already has:** `server/crawlers/dsePapers.js` implements this crawling pattern with proper fallback. The `crawlDSEPapers()` function:
1. Scrapes the index page for paper URLs
2. Falls back to hardcoded URL patterns if index is unavailable
3. Discovers DSE, AL (Advanced Level), and CE (Certificate of Education) papers

---

## 3. What Currently Exists in Crescendo

### 3.1 Existing Infrastructure

| File | Purpose |
|------|---------|
| `server/crawlers/dsePapers.js` | Scrapes dse.life mirror index → discovers paper PDF URLs |
| `server/crawlers/dseOcr.js` | Downloads PDFs → renders to images → OCR via Tesseract.js |
| `test-extract-questions.mjs` | Tests extraction of question blocks from OCR'd text |
| `server/db/` | SQLite storage for processed paper content |
| `eng.traineddata` (root + server/) | Tesseract language data for English OCR |

### 3.2 Current Limitations

1. **dse.life mirror may go offline** — GitHub mirrors have been taken down before
2. **OCR is slow** — Tesseract.js processes 1 page in ~1-3 seconds on CPU, ~30-90 seconds per paper
3. **OCR quality is 80-85%** on clean DSE PDFs — sufficient for question text but errors in numbers/special characters
4. **No writing prompt extraction** — current OCR targets Paper 1 (Reading) only
5. **No structured question bank** — extracted text is stored but not parsed into question/answer format
6. **Existing fallback URLs may be stale** — the current fallback pattern checks for years up to 2022

### 3.3 What Needs to Change

| Gap | Priority | Fix |
|-----|----------|-----|
| dse.life mirrors are brittle | High | Add multiple mirror fallbacks + community Drive sources |
| Only Reading paper (P1) is OCR'd | High | Extend to Writing (P2), Listening (P3), Speaking (P4) |
| No structured prompt extraction | High | Parse writing prompts from OCR'd text into structured format |
| OCR accuracy on scanned papers | Medium | Upgrade to PaddleOCR for better accuracy on mixed layouts |
| No periodic refresh mechanism | Medium | Add scheduled crawling + version tracking |
| Legal notice missing | Low | Add attribution/disclaimer in UI |

---

## 4. Format & Extractability

### 4.1 PDF Types in the Wild

| Type | Characteristics | Text Extractable? | OCR Needed? |
|------|----------------|-------------------|-------------|
| **Official HKEAA PDF (recent)** | Selectable text, searchable, digital-origin | Yes — direct extraction | No |
| **Community-scanned PDF** | Image-only, scanned from print booklet | No — image only | Yes |
| **Mixed PDF** | Mostly image with some hidden text layer | Partial | Maybe |
| **dse.life mirror PDFs** | Scanned image PDFs (derived from print editions) | No — image only | Yes |

**Important finding:** Most dse.life mirror PDFs are **scanned images**, NOT native digital PDFs. They were created by scanning the printed booklet, so the text is embedded as images. OCR is required for ALL papers from these mirrors.

### 4.2 How to Detect PDF Type

```javascript
// Using pdfjs-dist (what Crescendo already uses)
async function detectPDFType(pdfUrl) {
  const doc = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await doc.getPage(1);
  const textContent = await page.getTextContent();
  
  if (textContent.items.length > 10) {
    return 'digital'; // Has real text
  } else {
    return 'scanned'; // Image-only — needs OCR
  }
}

// Using PyMuPDF (fitz) — more reliable:
// import fitz
// doc = fitz.open(path)
// has_text = any(len(page.get_text()) > 100 for page in doc)
```

### 4.3 Check Individual Paper Format

Before committing to OCR for a paper, check if it has selectable text:

1. Open the PDF in a browser
2. Try to select text with cursor
3. If you can select text → digital PDF (no OCR needed)
4. If you cannot → scanned PDF (OCR needed)

Most dse.life mirror PDFs are **scanned** and require OCR. Some community Drive collections may have better quality versions.

---

## 5. Text Extraction Pipeline

### 5.1 Recommended Architecture

```
┌─────────────┐   ┌────────────────┐   ┌───────────────┐   ┌──────────────┐
│ Paper URLs   │──▶│ PDF Downloader  │──▶│ Text Extractor │──▶│ Question      │
│ (mirror/     │   │ (fetch + cache) │   │ (PyMuPDF +     │   │ Parser        │
│  Drive/API)  │   │                │   │  OCR fallback) │   │ (regex + AI)  │
└─────────────┘   └────────────────┘   └───────────────┘   └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │ Digest Check   │
                                       │ (avoid re-OCR) │
                                       └──────────────┘
```

### 5.2 Step 1: Download PDF

```javascript
// Node.js — with timeout and retry (already partially in dseOcr.js)
async function downloadPDF(url) {
  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Crescendo/1.0)' },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i === MAX_RETRIES - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}
```

### 5.3 Step 2: Text Extraction (with OCR Fallback)

```javascript
async function extractText(pdfBuffer) {
  // Try native extraction first
  const pdfDoc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  const firstPage = await pdfDoc.getPage(1);
  const textContent = await firstPage.getTextContent();
  
  const hasText = textContent.items.length > 10;
  
  if (hasText) {
    // Digital PDF — direct extraction
    let fullText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ');
    }
    return { text: fullText, method: 'native' };
  } else {
    // Scanned PDF — OCR pipeline
    const ocrText = await ocrPDF(pdfBuffer);  // See Section 6
    return { text: ocrText, method: 'ocr' };
  }
}
```

### 5.4 Step 3: Parse Writing Prompts from Text

For Paper 2 (Writing), extract structured prompts:

```javascript
const PART_A_PATTERN = /PART\s+A[^]*?write about (\d+) words/i;
const PART_B_PATTERN = /PART\s+B[^]*?questions (\d+)[^]*?write about (\d+) words/i;
const QUESTION_PATTERN = /(?:Question|Q\.?)\s*(\d+)[\s\S]*?(?=(?:Question|Q\.?)\s*\d+|END OF PAPER|$)/gi;

function extractWritingPrompts(ocrText) {
  const prompts = [];
  
  // Part A
  const partAMatch = ocrText.match(PART_A_PATTERN);
  if (partAMatch) {
    prompts.push({
      part: 'A',
      wordCount: 200,
      text: partAMatch[0].trim(),
    });
  }
  
  // Part B questions
  const questions = [...ocrText.matchAll(QUESTION_PATTERN)];
  for (const q of questions) {
    prompts.push({
      part: 'B',
      questionNumber: parseInt(q[1]),
      text: q[0].trim(),
      wordCount: 400,
      elective: detectElective(q[0]),
    });
  }
  
  return prompts;
}

function detectElective(text) {
  const electivePatterns = {
    'Sports Communication': /sports\s+communication/i,
    'Workplace Communication': /workplace\s+communication/i,
    'Social Issues': /social\s+issues/i,
    'Popular Culture': /popular\s+culture/i,
    'Short Stories': /short\s+stories/i,
    'Poems and Songs': /poems?\s+and\s+songs/i,
    'Debating': /debating/i,
    'Drama': /drama/i,
  };
  
  for (const [name, pattern] of Object.entries(electivePatterns)) {
    if (pattern.test(text)) return name;
  }
  return 'unknown';
}
```

### 5.5 Step 4: Validate & Store

```javascript
const VALIDATION_RULES = {
  minTextLength: 50,         // Reject if OCR output <50 chars
  mustHaveRole: /\byou are\b/i,     // Must establish candidate role
  mustHaveTask: /\bwrite\b/i,       // Must include instruction verb
  minWordCount: 20,                 // Prompt itself should be readable
};
```

---

## 6. OCR Strategy for Scanned Papers

### 6.1 OCR Engine Comparison for DSE Papers

| Engine | English Accuracy | Chinese Accuracy | Speed (per page) | GPU | Ease of Use |
|--------|-----------------|------------------|-------------------|-----|-------------|
| **Tesseract 5.x** (current in Crescendo) | 80-85% | 70-80% | 0.3-1s CPU | No | Easy |
| **PaddleOCR** | 90-95% | 95-98% | 1-3s CPU, 0.3s GPU | Yes | Moderate |
| **Google Cloud Vision** | 95-98% | 95-98% | ~0.5s API | Cloud | API key needed |
| **EasyOCR** | 85-90% | 85-90% | 1-3s CPU | Yes | Easy |
| **Azure Document Intelligence** | 96-97% | 95-97% | ~0.5s API | Cloud | API key needed |

### 6.2 Recommendation for Crescendo

**Short-term (now):** Continue with Tesseract.js (already integrated).

- Reason: It works, is free, runs locally, no additional dependencies
- Acceptable for text-heavy DSE papers with clean layouts
- Already working in `server/crawlers/dseOcr.js`

**Medium-term (next milestone):** Add PaddleOCR as an option.

- Reason: Significantly better for mixed layouts, handles tables and multi-column text
- Better Chinese character recognition for bilingual papers
- GPU acceleration available

**Long-term (if budget):** Use Google Cloud Vision API for high-accuracy batch OCR.

- Reason: 98% accuracy even on challenging scans
- Cost: ~US$1.50 per 1,000 pages — negligible for DSE papers (~50 pages/year × 14 years = 700 pages ≈ US$1)

### 6.3 Preprocessing Pipeline (Critical for OCR Quality)

The existing `preprocessImage()` in `dseOcr.js` applies grayscale + binary thresholding. This can be improved:

```javascript
function preprocessImage(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // 1. Convert to grayscale
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // 2. Apply adaptive-like threshold (Otsu's method approximation)
    // Using 128 as default — but should be computed per-page for best results
    const threshold = 128;
    const binary = gray > threshold ? 255 : 0;
    
    data[i] = data[i + 1] = data[i + 2] = binary;
  }
  
  ctx.putImageData(imageData, 0, 0);
}
```

**Improved preprocessing chain for DSE papers:**

| Step | Effect | Implementation |
|------|--------|----------------|
| 1. Grayscale | Removes color noise | Luminosity formula |
| 2. Contrast enhancement | Sharpens text edges | CLAHE or 2.5x contrast |
| 3. Binarization | Converts to pure B/W | Otsu's method or adaptive threshold |
| 4. Deskew | Corrects page tilt | Hough transform (optional) |
| 5. Despeckle | Removes noise dots | Median filter (optional) |

### 6.4 Tesseract Page Segmentation Modes

For DSE papers with multi-column layouts, PSM selection is critical:

```javascript
// For single text block (most DSE papers):
'--psm 6'  // Assume uniform block of text

// For single column:
'--psm 4'  // Single column of text

// For multi-column (some reading papers):
'--psm 3'  // Fully automatic (default)

// Recommended for DSE:
const tesseractConfig = '--psm 6 --oem 3';
```

**Current Crescendo configuration:** Uses default PSM (3). Should change to PSM 6 for better results on most DSE papers.

### 6.5 Pipeline Integration (What to Add to server/crawlers/dseOcr.js)

```javascript
// Add to dseOcr.js — Paper 2 (Writing) support
async function ocrWritingPaper(pdfUrl) {
  const text = await ocrPDF(pdfUrl);
  return {
    rawText: text,
    prompts: extractWritingPrompts(text),
    wordCount: text.split(/\s+/).length,
  };
}

// Add to crawlDSEPapersOCR — extend from reading-only to all papers
function discoverAllPapers(html) {
  // Current: filters for '卷一' (Paper 1) only
  // Change: filter for '卷二' (Paper 2) as well
  return {
    reading: discoverPapersByLabel(html, '卷一'),
    writing: discoverPapersByLabel(html, '卷二'),
    listening: discoverPapersByLabel(html, '卷三'),
    speaking: discoverPapersByLabel(html, '卷四'),
  };
}
```

---

## 7. DSE English Paper 2 Writing Prompts — Complete Source Map

### 7.1 Structure of Paper 2

| Component | Duration | Marks | Length |
|-----------|----------|-------|--------|
| Part A (Short Task) | Shared 2hrs | 21 (C7+L7+O7) | ~200 words |
| Part B (Long Task) | Shared 2hrs | 21 (C7+L7+O7) | ~400 words |
| **Total** | **2 hours** | **42 marks** | **~600 words** |

**2024+ Reform:** Part B reduced from 8 questions → 4 questions. Elective modules eliminated.

### 7.2 Complete Prompt Source Index

**Best source for raw prompt text:** OCR'd PDF from dse.life mirror → extract text → parse prompts

**Best source for categorized/clean prompts:**

| Source | URL | Content | Format |
|--------|-----|---------|--------|
| Chenglish.hk | https://www.chenglish.hk/paper2analysis.html | 2012-2022 prompts by genre | Web page |
| Mastering Grammar | https://www.masteringgrammar.com/p/writing-genres-featured-in-hkdse.html | 2012-2023 genres | Web page |
| Spencer Lam | https://spencerlam.hk/blog/2022/10/29/dse%e8%8b%b1%e6%96%87%e4%bd%9c%e6%96%87%e9%a1%8c%e7%9b%ae/ | 2012-2022 prompts by year | Blog post |
| Ice Cream Tutor | https://www.icecreamtutor.com/notes/hkdse/hkdse-english-writing/ | 2012-2024 prompts + sample answers | Web page |
| DSE TREASURE | https://dsetreasure.com/dse-english-paper-2-%E7%AF%84%E6%96%87/ | 2012-2024 prompts + 5** samples | Web page |
| Scribd | https://www.scribd.com/document/1012869124/2012-2022-Dse-Paper-2-Writing-Questions | 2012-2022 compiled prompts | PDF |
| dsepastpaper.blogspot.com | http://dsepastpaper.blogspot.com/search/label/Writing | 2012-2021 papers by year | Blog + PDFs |

### 7.3 Prompts by Elective Module (Historical Data 2012-2023)

| Module | Frequency | Approx. Questions |
|--------|-----------|-------------------|
| Social Issues | Very High | 15+ |
| Workplace Communication | High | 12+ |
| Sports Communication | High | 10+ |
| Popular Culture | High | 10+ |
| Short Stories | High | 11 |
| Debating | Moderate | 8+ |
| Poems and Songs | Moderate | 8+ |
| Drama | Lower | 5+ |

### 7.4 Text Type Distribution (2012-2023)

| Text Type | Count | Sample Years |
|-----------|-------|-------------|
| Article/Feature | 18 | Every year |
| Formal Letter | 14 | Every year |
| Letter to Editor | 12 | 2012, 2014, 2016, 2018, 2020 |
| Short Story | 11 | 2012, 2014, 2016, 2018, 2020, 2022 |
| Speech | 7 | 2013, 2015, 2017, 2019, 2021 |
| Essay | 6 | 2016, 2017, 2018, 2020, 2021 |
| Email | 6 | 2013, 2015, 2017, 2019, 2021 |
| Blog Post | 5 | 2017, 2019, 2021, 2022 |
| Proposal | 2 | 2022, 2024 Sample |
| Report | 2 | 2013, 2018 |
| Diary/Journal | 3 | Part A formats |

---

## 8. Legal Considerations

### 8.1 HKEAA Copyright Position

HKEAA **holds full copyright** over all examination materials:

> "The Authority holds copyright for all its publications... no part of the Authority's publications may in any form or by any electronic, mechanical, photocopying, or other means be reproduced, stored in a retrieval system or broadcast or transmitted without the prior permission of the Hong Kong Examinations and Assessment Authority."

**Source:** https://www.hkeaa.edu.hk/en/resources/publications/copyright/

### 8.2 School Licensing Scheme

HKEAA offers paid licences for schools:

| Licence | Usage | Annual Fee |
|---------|-------|------------|
| **Licence 1** | Up to 75% of works | HK$5,275 (~US$675) |
| **Licence 2** | Up to 95% of works | HK$6,685 (~US$855) |

**Restrictions:**
- Only for registered secondary schools
- Only for classroom instruction
- Must be on school premises / school intranet
- Copies must not be stored longer than 12 months
- **Not transferable** to third parties (including apps/platforms)

### 8.3 Hong Kong Copyright Ordinance — Fair Dealing

**Section 41A** (Fair Dealing for Education) allows certain uses:

> "Fair dealing with a work by or on behalf of a teacher or by a pupil for the purposes of giving or receiving instruction in a specified course of study provided by an educational establishment does not infringe the copyright."

**Four factors determining "fairness":**
1. Purpose and nature (non-profit? commercial?)
2. Nature of the work
3. Amount and substantiality of portion used
4. Effect on potential market or value

**Critical limitation:** The fair dealing exemption under Section 41A **does NOT apply** to HKEAA examination papers specifically. HKEAA has explicitly stated that educational fair dealing exemptions "do not apply to copying HKEAA's past HKCEE/HKALE question papers and HKDSE question papers, sample papers and practice papers."

### 8.4 Third-Party Archive Legal Status

| Archive Type | Legal Risk | Notes |
|-------------|------------|-------|
| **dse.life mirrors** | Grey area | Hosting copyrighted material without licence. Take-downs have occurred before. |
| **User-uploaded Google Drive** | Grey area | Copyright holder can request removal. Enforced sporadically. |
| **Educational blog posts reproducing prompts** | Low risk | Small excerpts for commentary/education — may qualify as fair dealing for criticism/review |
| **Scribd uploads** | Grey area | Subject to DMCA takedowns |
| **Direct HKEAA purchase** | Clean | Full legal right to use purchased copy |

### 8.5 Risk Assessment for Crescendo

| Activity | Risk Level | Mitigation |
|----------|-----------|------------|
| **Scraping dse.life mirrors** | Medium | Mirror may be taken down; no legal exposure for mirror operator |
| **Storing full paper PDFs** | Medium-High | Storing complete copyrighted works increases risk |
| **Storing extracted text (prompts only)** | Low-Medium | Extracted facts (exam questions) may not be copyrightable, but formatting/layout is |
| **Generating AI-similar prompts** | Low | Transformative use; prompts inspired by but not copying DSE style |
| **Displaying real prompts in-app** | Low-Medium | For non-commercial educational purposes; argument for fair dealing |
| **Selling access to real prompts** | High | Commercial exploitation of copyrighted exam materials |

**Bottom line:** The safest approach is to use authentic DSE papers for **internal validation and calibration** (training your AI to generate similar-quality content), while serving users **AI-generated prompts** that follow DSE format but are original creations. If you want to display real DSE prompts to users, seek legal advice or obtain a licence from HKEAA.

### 8.6 Practical Recommendations

1. **DO** download papers from mirrors for internal analysis, format study, and AI training
2. **DO** extract and study writing prompt patterns, marking schemes, and examiner comments
3. **DO** generate original prompts that follow DSE conventions
4. **DON'T** redistribute full PDFs of HKEAA papers in your app
5. **DON'T** charge users for access to HKEAA copyrighted content
6. **DON'T** claim HKEAA endorsement
7. **CONSIDER** adding a disclaimer: "Crescendo is not affiliated with HKEAA. Practice materials are inspired by DSE format."

---

## 9. Alternative Approaches & Build-vs-Buy

### 9.1 Option A: Full OCR Pipeline (Current Approach)

**What it does:** Downloads PDFs from mirrors, OCRs them, extracts structured data
**Cost:** Free (server CPU + Tesseract)
**Quality:** 80-85% accuracy, requires cleanup
**Maintenance:** Mirror URLs need updating when they go down
**Pros:** Complete control, no licensing issues for internal use
**Cons:** Brittle sources, OCR errors need correction, ongoing maintenance

### 9.2 Option B: Manual Transcription (Crowdsourced)

**What it does:** Recruit 1-2 people to manually type out writing prompts from PDFs
**Cost:** ~HK$500-1000 one-time for all 14 years (~140 prompts)
**Quality:** 100% accurate
**Pros:** Perfect accuracy, no OCR cleanup, fast to get started
**Cons:** One-time human cost, doesn't scale to other paper types

### 9.3 Option C: Use Public Compilations

**What it does:** Scrape educational blogs that have already compiled prompt lists (Chenglish.hk, Spencer Lam, etc.)
**Cost:** Free + development time
**Quality:** Text is already clean and categorized
**Pros:** No OCR needed, already structured by year/module
**Cons:** May miss some years, blog content can change, copyright on compilation

### 9.4 Option D: Hybrid (Recommended)

**What it does:** OCR for bulk text + manual correction for prompts + AI generation for new content
**Cost:** Low development + minimal human review
**Quality:** High for prompts (human-verified), acceptable for passages (AI-generated)
**Pros:** Best balance of quality, cost, and control
**Cons:** Requires both development and occasional human review

### 9.5 Recommendation

**Phase 1 (Immediate):** Use Option C — scrape existing compilations for writing prompts. This gives you a clean dataset of 100+ validated prompts in a day.

**Phase 2 (This week):** Extend existing OCR pipeline (dseOcr.js) to cover all 4 papers, not just reading. Keep Tesseract.js but improve preprocessing.

**Phase 3 (Backlog):** Add mirror fallbacks, explore PaddleOCR for accuracy improvement, build structured question bank.

---

## 10. Recommendations for Crescendo

### 10.1 Immediate Actions

1. **Fix dsePapers.js fallback** — Update the hardcoded URL patterns to include 2023, 2024, 2025
2. **Extend OCR to Paper 2** — Modify `dseOcr.js` to process writing papers (卷二) in addition to reading (卷一)
3. **Scrape structured prompt lists** — Extract clean prompt text from Chenglish.hk, Mastering Grammar, and Spencer Lam
4. **Store prompts in structured format** — Create a `writing_prompts` table in SQLite with fields: `year`, `part`, `question_number`, `elective`, `text_type`, `prompt_text`, `word_limit`

### 10.2 Short-Term Improvements

5. **Add mirror fallbacks** — Maintain a list of 3-5 mirror URLs in case primary mirror goes down
6. **Improve OCR preprocessing** — Add contrast enhancement and adaptive thresholding
7. **Add PDF type detection** — Skip OCR for digital PDFs (rare, but some exist)
8. **Add human verification step** — Flag low-confidence OCR output for manual review

### 10.3 Medium-Term (V2)

9. **Build local prompt bank** from verified real prompts + AI-generated variants
10. **Add validation** — Every prompt in the bank passes the validation framework (see `DSE-WRITING-PROMPT-VALIDATION.md`)
11. **Implement quality badges** — "Seed" (verified real DSE), "Reviewed" (human-reviewed AI), "AI-Generated" (auto)

### 10.4 Mirror Maintenance Checklist

```javascript
// src/utils/dseMirrorConfig.js
export const DSE_MIRRORS = {
  primary: {
    base: 'https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp',
    index: 'https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html',
    priority: 1,
  },
  backup1: {
    base: 'https://raw.githubusercontent.com/{community-mirror}/main/static/pp',
    index: null, // No index page — use hardcoded patterns
    priority: 2,
  },
  // Add more as they appear
};
```

---

## 11. Sources

### Official
- HKEAA Online Bookstore: https://online.hkeaa.edu.hk/Bookstore/
- HKEAA Publications List: https://www.hkeaa.edu.hk/en/resources/publications/list_of_publications/
- HKEAA Sample Papers: https://www.hkeaa.edu.hk/en/hkdse/assessment/sample_practice_paper/
- HKEAA Copyright Notice: https://www.hkeaa.edu.hk/en/resources/publications/copyright/
- HKEAA School Licensing: https://www.hkeaa.edu.hk/en/resources/publications/licence/
- HKEAA Photocopying Service: https://www.hkeaa.edu.hk/en/Resources/publications/list_of_publications/hkdse_photocopy_pub/
- 2024 English Paper 2 Sample: https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/ENG-SP-Paper2-2024.pdf

### Third-Party Archives
- dse.rioho.dev (dse.life backup): https://dse.rioho.dev/past-papers
- dseweb.site: https://www.dseweb.site/past-papers
- dsepaper.hk: https://dsepaper.hk/
- dse.best: https://dse.best/
- dse-hive: https://dse-hive.nekoweb.org/
- dsesource.com/dsepp: https://dsesource.com/dsepp/
- dsetreasure.com: https://dsetreasure.com/dse-past-paper/
- dse247.com: https://dse247.com/
- PassPaper.Unstoppable: https://passpaper-unstoppable.github.io/dse.life/
- dse.link: https://dselink.odoo.com/past-paper
- dsepp.ru (dse.life mirror): https://dsepp.ru/ppindex/index.html
- GitHub - tseminghong/DSE: https://github.com/tseminghong/DSE
- Google Drive (community): https://drive.google.com/drive/folders/1j-j-2gxdrFRBPz-Pnuv31FRi8n_Fx_MA

### Prompt Compilations
- Chenglish.hk Paper 2 Analysis: https://www.chenglish.hk/paper2analysis.html
- Mastering Grammar Genres: https://www.masteringgrammar.com/p/writing-genres-featured-in-hkdse.html
- Spencer Lam Prompt List: https://spencerlam.hk/blog/2022/10/29/dse%e8%8b%b1%e6%96%87%e4%bd%9c%e6%96%87%e9%a1%8c%e7%9b%ae/
- Ice Cream Tutor: https://www.icecreamtutor.com/notes/hkdse/hkdse-english-writing/
- DSE TREASURE: https://dsetreasure.com/dse-english-paper-2-%E7%AF%84%E6%96%87/
- Scribd: https://www.scribd.com/document/1012869124/2012-2022-Dse-Paper-2-Writing-Questions
- dsepastpaper.blogspot.com: http://dsepastpaper.blogspot.com/search/label/Writing

### Legal
- Hong Kong Copyright Ordinance (Cap. 528): https://www.elegislation.gov.hk/hk/cap528
- CLIC Fair Dealing Guide: https://clic.org.hk/en/topics/intellectualProperty/infringement_of_copyright/B/
- EDB Copyright Circular: https://applications.edb.gov.hk/circular/upload/EDBCM/EDBCM23074E.pdf
- IPD Guidelines for Educational Copying: https://www.ipd.gov.hk/filemanager/ipd/common/copyright/guide_photo-e.pdf

### OCR Technology
- Tesseract.js: https://github.com/naptha/tesseract.js
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR
- OCRmyPDF: https://ocrmypdf.readthedocs.io/
- MinerU (PDF extraction): https://github.com/opendatalab/MinerU
- text-peeler (PDF ext toolkit): https://github.com/craigtrim/text-peeler

### Crescendo Codebase References
- `server/crawlers/dsePapers.js` — Paper URL discovery from dse.life mirrors
- `server/crawlers/dseOcr.js` — OCR pipeline with Tesseract.js
- `test-extract-questions.mjs` — Question block extraction test
- `server/db/` — SQLite storage for processed content

---

*This document should be updated whenever a dse.life mirror goes down or a new mirror appears. Check status of listed sources before relying on them in production. Last verified: July 2026.*
