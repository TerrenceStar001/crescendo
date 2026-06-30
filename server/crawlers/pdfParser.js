/**
 * PDF text extraction wrapper using pdfjs-dist + tesseract.js fallback.
 *
 * extractPdfText   — text-based PDFs (fast, using pdfjs-dist getTextContent)
 * extractPdfWithOCR — scanned PDFs (fallback, using tesseract.js)
 * parsePdf         — tries text first, falls back to OCR on low content
 */

import * as cheerio from 'cheerio';

/**
 * extractPdfText: Extracts text from a PDF buffer using pdfjs-dist.
 * Returns cleaned text string, or null on failure.
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
      const pageText = tc.items
        .map(item => item.str || '')
        .join(' ');
      pages.push(pageText);
    }

    let text = pages.join('\n\n');

    // Clean up HTML entities and tags
    text = text.replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, '');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  } catch (e) {
    console.warn('[pdfParser] extractPdfText failed:', e.message);
    return null;
  }
}

/**
 * extractPdfWithOCR: Fallback for scanned PDFs using tesseract.js OCR.
 * Returns text string or null if OCR fails.
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
    const worker = await createWorker('eng');

    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const pngBuffer = canvas.toBuffer('image/png');

        const { data: { text } } = await worker.recognize(pngBuffer);
        const trimmed = (text || '').trim();
        if (trimmed.length > 50) {
          pages.push(trimmed);
        }
      }
    } finally {
      await worker.terminate();
    }

    return pages.join('\n\n') || null;
  } catch (e) {
    console.warn('[pdfParser] extractPdfWithOCR failed:', e.message);
    return null;
  }
}

/**
 * parsePdf: Tries extractPdfText first; falls back to OCR if result is empty or very short.
 * Returns { text, method: 'text'|'ocr'|'failed' }.
 */
export async function parsePdf(fileBuffer) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    return { text: null, method: 'failed' };
  }

  // Try text extraction first
  const textResult = await extractPdfText(fileBuffer);
  if (textResult && textResult.length >= 50) {
    return { text: textResult, method: 'text' };
  }

  // Fall back to OCR
  const ocrResult = await extractPdfWithOCR(fileBuffer);
  if (ocrResult && ocrResult.length >= 50) {
    return { text: ocrResult, method: 'ocr' };
  }

  return { text: null, method: 'failed' };
}
