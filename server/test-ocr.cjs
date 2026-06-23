const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { createWorker } = require('tesseract.js');

const PDF_URLS = {
  '2023-p1': 'https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng/dse/2023/p1.pdf',
};

const PARALLEL = 4;

async function renderPageToPNG(page, scale = 2.0) {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer('image/png');
}

async function run() {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const label = '2023-p1';
  const url = PDF_URLS[label];

  console.log(`\n=== OCR Test: ${label} ===`);
  console.log('Downloading PDF...');
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

  const data = new Uint8Array(buf);
  const doc = await pdfjs.getDocument({ data }).promise;
  console.log(`Pages: ${doc.numPages}\n`);

  // Render all pages to PNGs (sequential — pdfjs canvas isn't thread-safe)
  console.log('Rendering pages to PNG (scale=2.0)...');
  const pageBuffers = [];
  const renderStart = Date.now();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const png = await renderPageToPNG(page);
    pageBuffers.push({ index: i, png });
    console.log(`  Page ${i}: ${(png.length / 1024).toFixed(0)} KB`);
  }
  const renderTime = (Date.now() - renderStart) / 1000;
  console.log(`Rendered ${doc.numPages} pages in ${renderTime.toFixed(1)}s`);

  // OCR in parallel batches
  console.log('\nStarting OCR (parallel=${PARALLEL})...');
  const worker = await createWorker('eng');
  const ocrStart = Date.now();
  let allText = '';
  let totalWords = 0;

  for (let i = 0; i < pageBuffers.length; i += PARALLEL) {
    const batch = pageBuffers.slice(i, i + PARALLEL);
    const results = await Promise.all(batch.map(async (pb) => {
      const { data: { text } } = await worker.recognize(pb.png);
      const words = text.split(/\s+/).filter(Boolean).length;
      return { index: pb.index, text, words };
    }));
    for (const r of results) {
      const preview = r.text.slice(0, 100).replace(/\n/g, ' ');
      console.log(`  Page ${r.index}: ${r.words} words → "${preview}..."`);
      allText += (r.text || '') + '\n';
      totalWords += r.words;
    }
  }

  await worker.terminate();
  const ocrTime = (Date.now() - ocrStart) / 1000;
  const totalTime = renderTime + ocrTime;

  console.log(`\n--- RESULTS ---`);
  console.log(`Render time: ${renderTime.toFixed(1)}s`);
  console.log(`OCR time: ${ocrTime.toFixed(1)}s (parallel=${PARALLEL})`);
  console.log(`Total time: ${totalTime.toFixed(1)}s`);
  console.log(`Total words: ${totalWords}`);
  console.log(`Total chars: ${allText.length}`);

  // Show sample
  if (allText.trim().length > 100) {
    console.log(`\nFIRST 500 CHARS:\n${allText.trim().slice(0, 500)}`);
    console.log(`\nLAST 300 CHARS:\n${allText.trim().slice(-300)}`);
  } else {
    console.log('\nNO TEXT EXTRACTED — OCR failed');
  }

  // Cleanup temp PNGs
  console.log('\nTest complete');
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
