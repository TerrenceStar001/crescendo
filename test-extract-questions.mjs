// Test script to verify extractQuestionsBlock logic against real DSE OCR data
// Run: node test-extract-questions.mjs

function extractQuestionsBlock(content, part) {
  const qaRegex = new RegExp(
    `PAPER 1\\s+PART\\s+${part}[\\s\\S]{0,300}?QUESTION[\\s-]*ANSWER\\s+BOOK`,
    'i'
  );
  const match = content.match(qaRegex);
  if (!match) return null;
  let block = content.slice(match.index);
  const endRegex = new RegExp(`END\\s+OF\\s+PART\\s+${part}\\b`, 'i');
  const endMatch = block.match(endRegex);
  if (endMatch) {
    block = block.slice(0, endMatch.index + endMatch[0].length);
  } else {
    const next = block.slice(200).match(/PAPER 1\s+PART\s+(?:B1|B2)\b/i);
    if (next) block = block.slice(0, 200 + next.index);
  }
  return block.trim();
}

async function main() {
  // Test all 12 DSE papers across all 3 parts
  const years = [];
  for (let y = 2012; y <= 2023; y++) years.push(y);

  const parts = ['A', 'B1', 'B2'];
  let passed = 0;
  let failed = 0;

  for (const year of years) {
    const res = await fetch(`http://localhost:3001/api/rag/article/dse-ocr-${year}-p1`);
    if (!res.ok) {
      console.log(`[SKIP] ${year} — not found`);
      continue;
    }
    const data = await res.json();
    const content = data.content;

    for (const part of parts) {
      const block = extractQuestionsBlock(content, part);
      if (!block || block.length < 200) {
        console.log(`[FAIL] ${year} Part ${part}: no block or too short (${block?.length || 0} chars)`);
        failed++;
        continue;
      }

      // Count question numbers in the block
      const qNums = block.match(/\b\d{1,3}\.\s/g);
      const qCount = qNums ? qNums.length : 0;
      if (qCount < 3) {
        console.log(`[FAIL] ${year} Part ${part}: only ${qCount} questions found (block: ${block.length} chars)`);
        failed++;
      } else {
        console.log(`[PASS] ${year} Part ${part}: ${qCount} questions, ${block.length} chars`);
        passed++;
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

main().catch(console.error);
