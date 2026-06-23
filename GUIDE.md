# NodeMind Phase 1 Demo Guide

## Overview
This guide walks you through running the Phase 1 “Capture Everything” MVP of NodeMind locally. The app is a minimalist PWA where you can type notes, auto‑generate tags, and store everything in `localStorage`.

## Prerequisites
- **Node.js** (v18 or higher) installed
- **npm** (comes with Node.js)

## Steps to Run the Demo

1. **Clone / navigate to the project**
   ```bash
   cd /home/terrence/珈珈/Code/NodeMind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   - The server will start and output something like:
     ```
     ➜  Local:   http://localhost:5173/
     ```

4. **Open the app**
   - Open a web browser and go to `http://localhost:5173`.
   - You should see the NodeMind interface with a header, tag list, and an editable canvas.

5. **Try it out**
   - Type anything into the canvas. As soon as you start typing, the app will:
     - Save the note to `localStorage`.
     - Generate up to 10 tags based on the words in the note.
     - Display those tags under the header.

6. **Refresh / reload**
   - Reload the page (`F5` or `Cmd+R`). Your previously entered note and tags will persist because they are stored in `localStorage`.

## Building for Production (optional)
If you want to generate a production build to host on a static site (e.g., Vercel, Netlify, Cloudflare Pages):

```bash
npm run build
```

The compiled assets will appear in the `dist/` directory. You can then upload `dist/` to any static hosting provider.

## Common Issues
- **Port already in use**: If `5173` is taken, you can start the dev server on a different port:
  ```bash
  npm run dev -- --port 5174
  ```
  Then open `http://localhost:5174`.

- **Build error about `index.html`**: Ensure `public/index.html` exists and that `src/main.jsx` is the entry point (it already is in this scaffold).

## Deleting the Guide
Once you have the demo running, you can remove this `GUIDE.md` file if you wish:
```bash
rm GUIDE.md
```