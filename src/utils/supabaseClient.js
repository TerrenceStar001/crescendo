const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yfxqelscyupzqpsskzat.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeHFlbHNjeXVwenFwc3NremF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIzMDYxMDIsImV4cCI6MjAzNzg4MjEwMn0.TSy5V6BY-ZjMTSuqELH71nRhMZ9ld0udm4yIspARoik';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

async function query(table, opts = {}) {
  const { select = '*', filters = '', order, limit, single } = opts;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  if (filters) url += `&${filters}`;
  if (order) url += `&order=${encodeURIComponent(order)}`;
  if (limit) url += `&limit=${limit}`;
  if (single) url += '&limit=1';
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase ${table} query: ${res.status}`);
  const data = await res.json();
  return single ? data[0] || null : data;
}

async function getById(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=*`, { headers });
  if (!res.ok) throw new Error(`Supabase ${table} getById: ${res.status}`);
  const data = await res.json();
  return data[0] || null;
}

async function post(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${table} post: ${res.status}`);
  return res.json();
}

async function searchArticles(queryText, limit = 10) {
  return query('articles', {
    select: 'id,title,source,summary,difficulty,topics,published_at',
    order: 'published_at.desc',
    limit,
  });
}

async function getPapers(type) {
  const filter = type ? `type=eq.${type}` : '';
  return query('papers', { select: 'id,title,type,year,level', filters: filter, order: 'year.desc', limit: 50 });
}

async function getPodcasts(limit = 20) {
  return query('podcasts', { select: 'id,title,description,difficulty,topics,published_at', order: 'published_at.desc', limit });
}

async function getCourses(skill) {
  const filter = skill ? `skill=eq.${skill}` : '';
  return query('courses', { select: 'id,title,description,skill,level,lesson_count', filters: filter, order: 'created_at.desc' });
}

async function health() {
  try {
    await query('articles', { select: 'id', limit: 1 });
    return { ok: true, embeddings: 0 };
  } catch {
    return { ok: false, embeddings: 0 };
  }
}

const supabase = { query, getById, post, searchArticles, getPapers, getPodcasts, getCourses, health };

export default supabase;
