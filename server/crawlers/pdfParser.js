/**
 * PDF text extraction wrapper using pdfjs-dist + tesseract.js fallback + pdf2md fallback.
 *
 * extractPdfText              — text-based PDFs with positional sorting + per-page metrics
 * extractPdfWithOCR           — scanned PDFs (fallback, using tesseract.js)
 * extractPdfTextWithQuality   — full quality assessment helper
 * detectHeadings              — identifies heading items from pdfjs text items via font size/weight
 * chunkByHeadings             — splits text at heading boundaries into topic groups
 * chunkFallback               — merges/splits pages when no headings are detected
 * parsePdf                    — tries text first → pdf2md → OCR fallback chain
 */

import * as cheerio from 'cheerio';

/**
 * extractPdfText: Extracts text from a PDF buffer using pdfjs-dist with positional sorting.
 * Returns { text, pages, method } where each page has { pageNum, text, charCount, englishPct }.
 * Returns null on failure.
 */
export async function extractPdfText(fileBuffer) {
  try {
    const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.js');
    const getDocument = pdfjsMod.default?.getDocument || pdfjsMod.getDocument;

    const data = new Uint8Array(fileBuffer);
    const doc = await getDocument({ data, disableFontFace: true }).promise;

    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();

      // Positional sort: Y descending (top-to-bottom), then X ascending (left-to-right)
      const sortedItems = [...tc.items].sort((a, b) => {
        const yDiff = (b.transform[5] || 0) - (a.transform[5] || 0);
        if (Math.abs(yDiff) > 5) return yDiff;
        return (a.transform[4] || 0) - (b.transform[4] || 0);
      });

      // Reconstruct with line breaks at Y position changes
      let pageText = '';
      let lastY = null;
      for (const item of sortedItems) {
        const y = item.transform[5] || 0;
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        }
        pageText += (item.str || '');
        lastY = y;
      }

      pages.push(pageText);
    }

    // Build full text with page separators
    let fullText = pages.join('\n\n');

    // Clean up HTML entities and tags
    fullText = fullText.replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, '');

    // Normalize whitespace
    fullText = fullText.replace(/\s+/g, ' ').trim();

    // Build per-page metrics
    const pageMetrics = pages.map((pageText, idx) => {
      const charCount = pageText.length;
      const alphaChars = (pageText.match(/[a-zA-Z]/g) || []).length;
      const englishPct = charCount > 0 ? Math.round((alphaChars / charCount) * 100) : 0;
      return {
        pageNum: idx + 1,
        text: pageText.replace(/\s+/g, ' ').trim(),
        charCount,
        englishPct,
      };
    });

    return {
      text: fullText,
      pages: pageMetrics,
      method: 'text',
    };
  } catch (e) {
    console.warn('[pdfParser] extractPdfText failed:', e.message);
    return null;
  }
}

/**
 * English content detection — pure function.
 * Returns true if the proportion of alpha chars >= threshold.
 */
export function isEnglishContent(text, threshold = 0.7) {
  if (!text || text.length < 10) return false;
  const clean = text.replace(/[^a-zA-Z\s]/g, '').trim();
  if (clean.length === 0) return false;
  const alpha = clean.replace(/\s+/g, '').length;
  return alpha / text.length >= threshold;
}

/**
 * extractPdfTextWithQuality: Wrapper around extractPdfText that also computes
 * aggregate quality metrics. Returns { text, pages, totalChars, englishPct }
 * or null on failure.
 */
export async function extractPdfTextWithQuality(fileBuffer) {
  const result = await extractPdfText(fileBuffer);
  if (!result) return null;

  const totalChars = result.text.length;
  const totalAlpha = (result.text.match(/[a-zA-Z]/g) || []).length;
  const englishPct = totalChars > 0 ? Math.round((totalAlpha / totalChars) * 100) : 0;

  return {
    ...result,
    totalChars,
    englishPct,
  };
}

/**
 * detectHeadings: Identifies heading items from pdfjs text items via font size/weight heuristics.
 * Returns array of heading strings.
 */
export function detectHeadings(textItems) {
  return textItems.filter(item => {
    const fontSize = item.transform?.[0] || 0;
    const fontName = item.fontName || '';
    return fontSize > 14 || /bold|heavy|black/i.test(fontName);
  }).map(item => item.str);
}

/**
 * chunkByHeadings: Splits extracted text into chunks at heading boundaries.
 * Each heading group = one potential course topic/lesson.
 * Returns [{ heading: string|null, content: string }].
 */
export function chunkByHeadings(text, textItems) {
  const headings = detectHeadings(textItems);
  if (headings.length === 0) return null;

  const lines = text.split('\n');
  const chunks = [];
  let currentHeading = null;
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line matches any detected heading
    const isHeading = headings.some(h => trimmed.includes(h) || h.includes(trimmed));

    if (isHeading) {
      if (currentContent.length > 0) {
        chunks.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
      }
      currentHeading = trimmed;
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  // Flush last chunk
  if (currentContent.length > 0) {
    chunks.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
  }

  return chunks.length > 0 ? chunks : null;
}

/**
 * chunkFallback: Fallback when no headings detected.
 * Merges adjacent low-content pages and splits pages exceeding 3000 chars.
 * Target: 500-3000 chars per chunk.
 * Returns [{ heading: null, content: string }].
 */
export function chunkFallback(pages) {
  if (!pages || pages.length === 0) return [];

  const merged = [];
  let buffer = '';

  for (const page of pages) {
    const pageText = page.text || '';
    if (!pageText.trim()) continue;

    // If adding this page to buffer doesn't exceed 3000 chars, merge
    if ((buffer + '\n\n' + pageText).length <= 3000) {
      buffer = buffer ? buffer + '\n\n' + pageText : pageText;
    } else {
      if (buffer) merged.push(buffer);
      // Start new buffer; split page if > 3000
      if (pageText.length > 3000) {
        // Split into roughly equal parts targeting 1500 chars each
        const midpoint = Math.ceil(pageText.length / 2);
        const split1 = pageText.slice(0, midpoint).trim();
        const split2 = pageText.slice(midpoint).trim();
        if (split1) merged.push(split1);
        if (split2) merged.push(split2);
        buffer = '';
      } else {
        buffer = pageText;
      }
    }
  }
  if (buffer) merged.push(buffer);

  return merged.map(content => ({ heading: null, content }));
}

/**
 * extractPdfWithOCR: Fallback for scanned PDFs using tesseract.js OCR.
 * Returns { text, pages, method } with per-page metrics, or null on failure.
 */
export async function extractPdfWithOCR(fileBuffer) {
  try {
    const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.js');
    const getDocument = pdfjsMod.default?.getDocument || pdfjsMod.getDocument;

    const { createCanvas } = await import('canvas');
    const { createWorker } = await import('tesseract.js');

    const data = new Uint8Array(fileBuffer);
    const doc = await getDocument({ data, disableFontFace: true }).promise;

    const pages = [];
    const pageTexts = [];
    const worker = await createWorker('eng');

    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const pngBuffer = canvas.toBuffer('image/png');

        const { data: { text } } = await worker.recognize(pngBuffer);
        const trimmed = (text || '').trim();
        pageTexts.push(trimmed);
        if (trimmed.length > 50) {
          pages.push(trimmed);
        }
      }
    } finally {
      await worker.terminate();
    }

    const fullText = pages.join('\n\n') || null;
    if (!fullText) return null;

    // Build per-page metrics
    const pageMetrics = pageTexts.map((text, idx) => {
      const charCount = text.length;
      const alphaChars = (text.match(/[a-zA-Z]/g) || []).length;
      const englishPct = charCount > 0 ? Math.round((alphaChars / charCount) * 100) : 0;
      return { pageNum: idx + 1, text, charCount, englishPct };
    });

    return { text: fullText, pages: pageMetrics, method: 'ocr' };
  } catch (e) {
    console.warn('[pdfParser] extractPdfWithOCR failed:', e.message);
    return null;
  }
}

/**
 * parsePdf: Tries extractPdfText first, then pdf2md fallback, then OCR.
 * Returns { text, pages, totalChars, englishPct, method, chunks }.
 * - method: 'text' | 'pdf2md' | 'ocr' | 'failed'
 * - pages: [{ pageNum, charCount, englishPct }]
 * - chunks: [{ heading, content }]  (from heading detection or fallback)
 */
export async function parsePdf(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    return { text: null, pages: [], totalChars: 0, englishPct: 0, method: 'failed', chunks: [] };
  }

  // Try text extraction first (positional sort)
  let result = await extractPdfText(fileBuffer);
  let method = 'text';

  if (result && result.text) {
    const totalChars = result.text.length;
    const totalAlpha = (result.text.match(/[a-zA-Z]/g) || []).length;
    const englishPct = totalChars > 0 ? Math.round((totalAlpha / totalChars) * 100) : 0;

    // Check quality — if insufficient, try pdf2md fallback
    if (totalChars < 500 || englishPct < 70) {
      // Try pdf2md fallback
      try {
        const pdf2mdMod = await import('@opendocsg/pdf2md');
        const pdf2mdResult = await pdf2mdMod.default(fileBuffer);
        if (pdf2mdResult && pdf2mdResult.length >= 500) {
          const pdf2mdAlpha = (pdf2mdResult.match(/[a-zA-Z]/g) || []).length;
          const pdf2mdEnglishPct = pdf2mdResult.length > 0 ? Math.round((pdf2mdAlpha / pdf2mdResult.length) * 100) : 0;
          if (pdf2mdEnglishPct >= 70) {
            result = {
              text: pdf2mdResult,
              pages: [{
                pageNum: 1,
                text: pdf2mdResult,
                charCount: pdf2mdResult.length,
                englishPct: pdf2mdEnglishPct,
              }],
              method: 'pdf2md',
            };
            method = 'pdf2md';
          }
        }
      } catch (e) {
        console.warn('[pdfParser] pdf2md fallback failed:', e.message);
        // Fall through to OCR
      }
    }

    // If still low quality, try OCR
    if (!result || method === 'text') {
      const totalChars = result ? result.text.length : 0;
      const totalAlpha = result ? (result.text.match(/[a-zA-Z]/g) || []).length : 0;
      const englishPct = totalChars > 0 ? Math.round((totalAlpha / totalChars) * 100) : 0;

      if (totalChars < 500 || englishPct < 70) {
        const ocrResult = await extractPdfWithOCR(fileBuffer);
        if (ocrResult && ocrResult.text) {
          result = ocrResult;
          method = 'ocr';
        }
      }
    }
  }

  if (!result || !result.text) {
    // Final OCR attempt
    const ocrResult = await extractPdfWithOCR(fileBuffer);
    if (ocrResult && ocrResult.text) {
      result = ocrResult;
      method = 'ocr';
    } else {
      return { text: null, pages: [], totalChars: 0, englishPct: 0, method: 'failed', chunks: [] };
    }
  }

  const totalChars = result.text.length;
  const totalAlpha = (result.text.match(/[a-zA-Z]/g) || []).length;
  const englishPct = totalChars > 0 ? Math.round((totalAlpha / totalChars) * 100) : 0;

  // Compute chunks via heading detection if available, or fallback
  let chunks = [];
  const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.js');
  const getDocument = pdfjsMod.default?.getDocument || pdfjsMod.getDocument;
  try {
    const data = new Uint8Array(fileBuffer);
    const doc = await getDocument({ data, disableFontFace: true }).promise;
    // Collect text items from all pages for heading detection
    let allTextItems = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      allTextItems = allTextItems.concat(tc.items);
    }

    const headingChunks = chunkByHeadings(result.text, allTextItems);
    if (headingChunks) {
      chunks = headingChunks;
    } else {
      chunks = chunkFallback(result.pages || []);
    }
  } catch {
    chunks = chunkFallback(result.pages || []);
  }

  return {
    text: result.text,
    pages: result.pages || [],
    totalChars,
    englishPct,
    method,
    chunks,
  };
}
