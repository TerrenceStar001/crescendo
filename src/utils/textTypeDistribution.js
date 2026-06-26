// HKDSE Paper 2 Writing — text type frequency distribution
// Based on HKEAA examiner reports (2012-2025) and past paper analysis

const PART_A_DISTRIBUTION = [
  { type: 'letter', weight: 35, label: 'Letter', genres: ['formal letter', 'letter to the editor', 'personal letter', 'letter of complaint', 'letter of advice', 'letter of application'] },
  { type: 'speech', weight: 15, label: 'Speech', genres: ['speech', 'debate speech'] },
  { type: 'article', weight: 15, label: 'Article', genres: ['magazine article', 'newspaper article', 'feature article', 'school article'] },
  { type: 'blog', weight: 10, label: 'Blog Post', genres: ['blog post', 'blog entry'] },
  { type: 'email', weight: 8, label: 'Email', genres: ['formal email', 'informal email', 'personal email'] },
  { type: 'report', weight: 5, label: 'Report', genres: ['report', 'news report', 'survey report'] },
  { type: 'proposal', weight: 3, label: 'Proposal', genres: ['proposal', 'project proposal'] },
  { type: 'review', weight: 3, label: 'Review', genres: ['review', 'film review', 'book review', 'restaurant review'] },
  { type: 'story', weight: 3, label: 'Short Story', genres: ['short story', 'narrative', 'story'] },
  { type: 'diary', weight: 3, label: 'Diary / Journal', genres: ['diary entry', 'journal entry'] },
];

const PART_B_DISTRIBUTION = [
  { type: 'article', weight: 15, label: 'Feature Article', genres: ['feature article', 'magazine article', 'newspaper article', 'school article'] },
  { type: 'letter', weight: 14, label: 'Letter', genres: ['formal letter', 'letter to the editor', 'personal letter', 'letter of advice', 'letter of application', 'letter of complaint'] },
  { type: 'story', weight: 11, label: 'Short Story', genres: ['short story', 'narrative', 'story', 'creative writing'] },
  { type: 'speech', weight: 8, label: 'Speech', genres: ['speech', 'debate speech', 'persuasive speech'] },
  { type: 'essay', weight: 8, label: 'Essay', genres: ['argumentative essay', 'opinion essay', 'discursive essay', 'persuasive essay', 'expository essay'] },
  { type: 'email', weight: 6, label: 'Email', genres: ['formal email', 'informal email', 'business email'] },
  { type: 'blog', weight: 5, label: 'Blog Post', genres: ['blog post', 'blog entry', 'online post'] },
  { type: 'report', weight: 5, label: 'Report', genres: ['report', 'survey report', 'investigation report', 'news report'] },
  { type: 'review', weight: 4, label: 'Review', genres: ['review', 'film review', 'book review', 'restaurant review', 'product review'] },
  { type: 'proposal', weight: 3, label: 'Proposal', genres: ['proposal', 'project proposal', 'business proposal'] },
  { type: 'diary', weight: 3, label: 'Diary / Journal', genres: ['diary entry', 'journal entry', 'reflective journal'] },
  { type: 'debate', weight: 3, label: 'Debate Speech', genres: ['debate speech', 'debate argument'] },
  { type: 'advertisement', weight: 2, label: 'Advertisement', genres: ['advertisement', 'promotional leaflet', 'poster', 'information sheet'] },
  { type: 'forum', weight: 2, label: 'Forum Post', genres: ['forum post', 'online comment', 'discussion post'] },
  { type: 'biography', weight: 1, label: 'Biography', genres: ['biography', 'artist biography', 'profile'] },
  { type: 'guide', weight: 1, label: 'Guide', genres: ['travel guide', 'guidebook', 'instruction guide'] },
];

function weightedRandom(distribution) {
  const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of distribution) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return distribution[distribution.length - 1];
}

function pickGenre(item) {
  return item.genres[Math.floor(Math.random() * item.genres.length)];
}

export function getRandomPartAType() {
  const item = weightedRandom(PART_A_DISTRIBUTION);
  return { slug: item.type, label: item.label, genre: pickGenre(item), weight: item.weight };
}

export function getRandomPartBType() {
  const item = weightedRandom(PART_B_DISTRIBUTION);
  return { slug: item.type, label: item.label, genre: pickGenre(item), weight: item.weight };
}

export function getPartADistribution() {
  return PART_A_DISTRIBUTION;
}

export function getPartBDistribution() {
  return PART_B_DISTRIBUTION;
}
