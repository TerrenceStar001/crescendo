## Crescendo

Build your English mastery to a 5** peak with AI-powered DSE practice and smart notes.

**Crescendo** (formerly NodeMind) is an open-source Progressive Web App that combines a full HKDSE English learning platform (Reading, Writing, Listening, Speaking) with a visual note-taking system — all offline-capable with an optional AI backend.

### Features

**DSE Learning Platform**
- **Reading** (Paper 1) — Passage + MCQ with weighted scoring, timer, and DSE level calculation. Uses bundled content or AI-generated passages.
- **Writing** (Paper 2) — Prompt + contentEditable editor + timer + AI correction with rubric scores, error analysis, and vocabulary suggestions.
- **Listening** (Paper 3) — TTS playback (Web Speech API) + MCQ + results. Custom voice selection in Settings.
- **Speaking** (Paper 4) — 64 topics across 8 categories, prep timer, record with STT + waveform display + local (filler/lexical/WPM) or AI feedback.
- **Dashboard** — 4 skill rings, personalized recommendations, grade trend chart, gap analysis.
- **Custom DSE Grading** — Configurable grade thresholds for 5**–1 per HKDSE boundaries.

**Smart Notes**
- **Three Views**: List (sidebar), Canvas (React Flow with drag-to-connect), Graph (3D ForceGraph3D)
- **AI Tagging**: Built-in topic detection (200+ prototypes) + optional external AI (OpenAI-compatible, BYOK)
- **Knowledge Health**: Forgetting curve with configurable half-life
- **Dark Mode**: Full theme support with OS preference detection

**Offline-First**
- PWA via Workbox service worker — installable, works without internet
- 5 bundled reading passages included out of the box
- Backend (Express + SQLite) is optional; frontend works standalone

### Stack

React 18 + Vite 5 + Custom CSS (BEM, CSS custom properties). No TypeScript.

Optional backend: Express + better-sqlite3 + Web crawlers (SCMP, Young Post, DSE papers, Podcast RSS).

### Getting Started

```bash
npm install
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173, proxy: `/api/ai` → NVIDIA, `/api/*` → backend) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run backend` | Start optional backend (port 3001) |

### Backend (Optional)

The backend provides RAG-powered content generation, web crawling, and AI analysis:

```bash
cd server && npm install && npm run dev
```

Endpoints: health, content retrieval, RAG search, writing/speaking analysis, crawl management.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+S` | Generate AI title & tags |
| `Ctrl+K` | Focus search |
| `Ctrl+1/2/3` | Switch list/canvas/graph view |
| `Ctrl+B/I/U` | Bold / Italic / Underline |
| `Ctrl+Shift+V` | The Void (study quiz) |
| `?` | Show all shortcuts |

### License

MIT