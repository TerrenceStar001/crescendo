import * as cheerio from 'cheerio';
import { createCanvas } from 'canvas';
import { createWorker } from 'tesseract.js';


const PDF_BASE = 'https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng';
const INDEX_URL = 'https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html';
const UA = 'Mozilla/5.0 (compatible; Crescendo/1.0)';
const PARALLEL_OCR = 4;
const RENDER_SCALE = 2.0;

/**
 * preprocessImage: Applies grayscale + binarization to improve OCR accuracy.
 * Mutates the canvas in-place.
 */
function preprocessImage(canvas, ctx) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const binary = gray > 128 ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = binary;
  }
  ctx.putImageData(imageData, 0, 0);
}

async function fetchWithTimeout(url, ms = 30000) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

function renderPageToPNG(page) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  return page.render({ canvasContext: ctx, viewport }).promise.then(() => {
    preprocessImage(canvas, ctx);
    return canvas.toBuffer('image/png');
  });
}

// Discover all reading-paper PDFs from the index page
function discoverPapers(html) {
  const $ = cheerio.load(html);
  const papers = [];

  // DSE Paper 1 (Reading) — labelled '卷一 閱讀能力'
  const dseWrapper = $('#dse').nextAll('.wrapper').first();
  if (dseWrapper.length) {
    dseWrapper.find('section.dsecolumns').each((i, section) => {
      const $section = $(section);
      const heading = $section.find('h4').first().text().trim();
      const setName = heading.replace(' Sample Paper', '').replace(' Practice Paper', '').trim().toLowerCase();
      if (!setName) return;

      // Only care about Paper 1 (Reading) — 卷一 閱讀能力
      $section.find('a.nav-link').each((j, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        const label = $link.text().trim();
        if (!href || !href.includes('.pdf')) return;
        if (!label.includes('卷一')) return;

        papers.push({
          id: `dse-ocr-${setName}-p1`,
          title: `${heading} DSE English Paper 1 (Reading)`,
          url: href.startsWith('http') ? href : `https://raw.githubusercontent.com${href}`,
          year: /^\d{4}$/.test(setName) ? parseInt(setName, 10) : null,
          category: 'dse',
          difficulty: 'hard',
          topics: JSON.stringify(['dse', 'reading', 'english', heading]),
        });
      });
    });
  }

  // AL Section C (Reading comprehension)
  const alWrapper = $('#al').nextAll('.wrapper').first();
  if (alWrapper.length) {
    alWrapper.find('section.dsecolumns').each((i, section) => {
      const $section = $(section);
      const year = parseInt($section.find('h4').first().text().trim(), 10);
      if (isNaN(year)) return;

      $section.find('a.nav-link').each((j, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        const label = $link.text().trim();
        if (!href || !href.includes('.pdf')) return;
        if (!label.includes('Section C')) return;

        papers.push({
          id: `dse-ocr-al-${year}-c`,
          title: `${year} AL English Section C (Reading Comprehension)`,
          url: href.startsWith('http') ? href : `https://raw.githubusercontent.com${href}`,
          year,
          category: 'al',
          difficulty: 'hard',
          topics: JSON.stringify(['al', 'reading', 'english', `${year}`]),
        });
      });
    });
  }

  return papers;
}

async function ocrPDF(pdfUrl, onProgress) {
  const origWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (args[0].includes('fetchStandardFontData') || args[0].includes('getPathGenerator'))) return;
    origWarn(...args);
  };
  try {
    const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.js');
    const getDocument = pdfjsMod.default?.getDocument || pdfjsMod.getDocument;
    const res = await fetchWithTimeout(pdfUrl, 60000);
    const buf = Buffer.from(await res.arrayBuffer());
    const data = new Uint8Array(buf);
    const doc = await getDocument({ data, disableFontFace: true }).promise;

    const pageBuffers = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const png = await renderPageToPNG(page);
      pageBuffers.push({ index: i, png });
      if (onProgress) onProgress(`Rendered page ${i}/${doc.numPages}`);
    }

    const worker = await createWorker('eng');
    let allText = '';

    try {
      for (let i = 0; i < pageBuffers.length; i += PARALLEL_OCR) {
        const batch = pageBuffers.slice(i, i + PARALLEL_OCR);
        const results = await Promise.all(batch.map(async (pb) => {
          const { data: { text } } = await worker.recognize(pb.png);
          return { index: pb.index, text };
        }));
        for (const r of results) {
          const trimmed = (r.text || '').trim();
          if (trimmed.length > 50) {
            allText += trimmed + '\n\n';
          }
          if (onProgress) onProgress(`OCR page ${r.index}: ${trimmed.split(/\s+/).length} words`);
        }
      }
    } finally {
      await worker.terminate();
    }

    return allText.trim();
  } finally {
    console.warn = origWarn;
  }
}

export async function crawlDSEPapersOCR(existingIds = [], onProgress = null) {
  // Fetch index page
  let html;
  try {
    const res = await fetchWithTimeout(INDEX_URL);
    html = await res.text();
  } catch (e) {
    onProgress?.(`Failed to fetch index page: ${e.message}`);
    return [];
  }

  const papers = discoverPapers(html);
  onProgress?.(`Discovered ${papers.length} reading papers from index`);

  const results = [];
  for (const paper of papers) {
    if (existingIds.includes(paper.id)) {
      onProgress?.(`Skipping ${paper.id} — already processed`);
      continue;
    }

    onProgress?.(`Processing ${paper.id}...`);
    try {
      const text = await ocrPDF(paper.url, (msg) => onProgress?.(`  ${paper.id}: ${msg}`));
      const wc = text.split(/\s+/).length;
      if (wc < 50) {
        onProgress?.(`  ${paper.id}: only ${wc} words, skipping (likely blank/scanned)`);
        continue;
      }

      results.push({
        id: paper.id,
        source: 'dse-pastpaper',
        title: paper.title,
        content: text,
        url: paper.url,
        difficulty: paper.difficulty,
        topics: paper.topics,
        word_count: wc,
        year: paper.year,
        category: paper.category,
      });
      onProgress?.(`  Done: ${wc} words from ${paper.id}`);
    } catch (e) {
      onProgress?.(`  FAILED ${paper.id}: ${e.message}`);
    }
  }

  return results;
}
