import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (compatible; Crescendo/1.0)';
const BASE = 'https://raw.githubusercontent.com/Lucasyh/dse.life-mirror/refs/heads/main/static/pp/eng';
const INDEX_URL = 'https://passpaper-unstoppable.github.io/dse.life/ppindex/eng/eng.html';
const PAPER_NAME_MAP = { '卷一 閱讀能力': 'reading', '卷二 寫作能力': 'writing', '卷三 聆聽考核': 'listening', '卷四 說話能力': 'speaking' };
const AL_SECTION_TYPES = { 'a': 'listening', 'b': 'writing', 'c': 'reading', 'd': 'reading', 'e': 'speaking' };
const CE_LABEL_MAP = { '卷一': 'reading', '卷二': 'writing', 'Section A': 'reading', 'Section B': 'writing' };

async function fetchWithTimeout(url, ms = 15000) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function scrapeIndexPage() {
  const res = await fetchWithTimeout(INDEX_URL, 20000);
  const html = await res.text();
  const $ = cheerio.load(html);
  const discovered = [];

  // DSE sections
  const dseWrapper = $('#dse').nextAll('.wrapper').first();
  if (dseWrapper.length) {
    dseWrapper.find('section.dsecolumns').each((i, section) => {
      const $section = $(section);
      const heading = $section.find('h4').first().text().trim().replace(' Sample Paper', ' sp').replace(' Practice Paper', ' pp');
      const setName = /^(\d{4}|pp|sp)$/i.test(heading) ? heading.toLowerCase() : null;
      if (!setName) return;

      $section.find('a.nav-link').each((j, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        const label = $link.text().trim();
        if (!href || !href.includes('.pdf')) return;

        let fileCategory = 'paper';
        if (label.includes('參考答案')) fileCategory = 'ans';
        else if (label.includes('考生表現')) fileCategory = 'per';

        const type = PAPER_NAME_MAP[label] || null;
        const paperNum = type === 'reading' ? 1 : type === 'writing' ? 2 : type === 'listening' ? 3 : type === 'speaking' ? 4 : null;

        discovered.push({
          category: 'dse', setName, year: /^\d{4}$/.test(heading) ? parseInt(heading, 10) : null,
          fileCategory, url: href, label, type, paper: paperNum,
        });
      });
    });
  }

  // AL sections
  const alWrapper = $('#al').nextAll('.wrapper').first();
  if (alWrapper.length) {
    alWrapper.find('section.dsecolumns').each((i, section) => {
      const $section = $(section);
      const year = parseInt($section.find('h4').first().text().trim(), 10);
      if (isNaN(year)) return;

      $section.find('a.nav-link').each((j, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        if (!href || !href.includes('.pdf')) return;
        const m = href.match(/\/al\/([a-z-]+)\/(pp|ans)\//);
        discovered.push({
          category: 'al', year, section: m ? m[1] : 'unknown',
          fileType: m ? m[2] : 'pp', url: href, label: $link.text().trim(),
          type: null, paper: null,
        });
      });
    });
  }

  // CE sections
  const ceWrapper = $('#ce').nextAll('.wrapper').first();
  if (ceWrapper.length) {
    ceWrapper.find('section.dsecolumns').each((i, section) => {
      const $section = $(section);
      const year = parseInt($section.find('h4').first().text().trim(), 10);
      if (isNaN(year)) return;

      $section.find('a.nav-link').each((j, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        const label = $link.text().trim();
        if (!href || !href.includes('.pdf')) return;
        let type = null, paper = null;
        if (label.includes('卷一') || label.includes('Section A')) { type = 'reading'; paper = 1; }
        else if (label.includes('卷二') || label.includes('Section B')) { type = 'writing'; paper = 2; }
        discovered.push({ category: 'ce', year, url: href, label, type, paper });
      });
    });
  }

  return discovered;
}

function fallbackPapers() {
  const papers = [];
  const baseUrl = `${BASE}/dse`;
  const withP4 = ['pp','sp','2012','2013','2014','2015','2016','2017','2018','2019','2023'];
  const withoutP4 = ['2020','2021','2022'];

  for (const year of [...withP4, ...withoutP4]) {
    for (let p = 1; p <= (withoutP4.includes(year) ? 3 : 4); p++) {
      const types = { 1: 'reading', 2: 'writing', 3: 'listening', 4: 'speaking' };
      papers.push({
        category: 'dse', setName: year, year: /^\d{4}$/.test(year) ? parseInt(year,10) : null,
        fileCategory: 'paper', url: `${baseUrl}/${year}/p${p}.pdf`,
        label: `卷${['一','二','三','四'][p-1]} ${['閱讀能力','寫作能力','聆聽考核','說話能力'][p-1]}`,
        type: types[p], paper: p,
      });
    }
    papers.push({
      category: 'dse', setName: year, year: /^\d{4}$/.test(year) ? parseInt(year,10) : null,
      fileCategory: 'ans', url: `${baseUrl}/${year}/ans.pdf`, label: '參考答案', type: null, paper: null,
    });
    if (withP4.includes(year)) {
      papers.push({
        category: 'dse', setName: year, year: /^\d{4}$/.test(year) ? parseInt(year,10) : null,
        fileCategory: 'per', url: `${baseUrl}/${year}/per.pdf`, label: '考生表現', type: null, paper: null,
      });
    }
  }
  papers.push({
    category: 'dse', setName: '2024-sample', year: 2024, fileCategory: 'paper',
    url: 'https://www.hkeaa.edu.hk/DocLibrary/HKDSE/Subject_Information/eng_lang/ENG-SP-Paper2-2024.pdf',
    label: '卷二 寫作能力 (2024 SP)', type: 'writing', paper: 2,
  });
  return papers;
}

export async function crawlDSEPapers(extractText = false) {
  let discovered;
  try {
    discovered = await scrapeIndexPage();
  } catch (e) {
    console.error('Index page scrape failed:', e.message);
    discovered = fallbackPapers();
  }

  console.log(`Discovered ${discovered.length} papers from index page`);
  const results = [];

  for (const entry of discovered) {
    let id;
    if (entry.category === 'dse') {
      const base = `paper-dse-${entry.setName}${entry.paper ? `-p${entry.paper}` : ''}${entry.fileCategory !== 'paper' ? '-'+entry.fileCategory : ''}`;
      id = base;
    } else if (entry.category === 'al') {
      id = `paper-al-${entry.year}-${entry.section}-${entry.fileType || 'pp'}`;
    } else {
      id = `paper-ce-${entry.year}${entry.paper ? `-p${entry.paper}` : ''}`;
    }
    id = id.replace(/[^a-zA-Z0-9-_]/g, '-');

    const meta = { label: entry.label, url: entry.url, category: entry.category };
    if (entry.setName) meta.setName = entry.setName;
    if (entry.section) meta.section = entry.section;
    if (entry.fileCategory) meta.fileCategory = entry.fileCategory;

    results.push({
      id, source: 'dse',
      type: entry.type || AL_SECTION_TYPES[entry.section] || 'unknown',
      year: entry.year || null,
      paper: entry.paper || null,
      section: entry.section || null,
      difficulty: entry.category === 'al' ? 'hard' : 'medium',
      metadata: JSON.stringify(meta),
    });
  }

  return results;
}
