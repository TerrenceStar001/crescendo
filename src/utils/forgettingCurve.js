const DEFAULT_HALF_LIFE = 30;
const HALF_LIFE_RANGE = { min: 0.5, max: 180 };
const RETRIEVABILITY_THRESHOLD = 0.5;

function forgettingCurve(elapsedDays, halfLife) {
  if (elapsedDays < 0) elapsedDays = 0;
  if (halfLife <= 0) halfLife = DEFAULT_HALF_LIFE;
  return Math.pow(2, -elapsedDays / halfLife);
}

function calcHalfLife(prevHalfLife, correct, difficulty = 1) {
  const factor = correct ? 1.3 : 0.5;
  const difficultyMod = 1 + (difficulty - 1) * 0.2;
  let next = prevHalfLife * factor * difficultyMod;
  if (next > HALF_LIFE_RANGE.max) next = HALF_LIFE_RANGE.max;
  if (next < HALF_LIFE_RANGE.min) next = HALF_LIFE_RANGE.min;
  return Math.round(next * 10) / 10;
}

function scheduleNextReview(halfLife, threshold = RETRIEVABILITY_THRESHOLD) {
  if (halfLife <= 0) return DEFAULT_HALF_LIFE;
  return Math.max(1, Math.round(-halfLife * Math.log2(threshold)));
}

export { forgettingCurve, calcHalfLife, scheduleNextReview, DEFAULT_HALF_LIFE, HALF_LIFE_RANGE, RETRIEVABILITY_THRESHOLD };
