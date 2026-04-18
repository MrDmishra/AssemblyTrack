# AssemblyTrack — Production Floor Tracker

A zero-dependency, production-ready web app for tracking assembly line production runs.

## Live URL
> Running locally at `http://localhost:3000` (sandbox)

## Features

### Employee (Public Page)
- Employee ID gate (EMP-001 through EMP-999)
- Live table of all ongoing productions with **real-time elapsed timers**
- **Start Production** modal — product name, category, expected duration, station, tool autocomplete (65+ tools)
- **Stop button** (own runs only) → completion form with units, quality check, logbook notes
- Automatic **delay detection** + mandatory justification if run exceeds expected time
- Progress bar visualization per run

### Admin Dashboard (Login Protected)
- Credentials: `admin` / `admin123` *(change `CREDENTIALS` in `js/admin.js`)*
- **5 metric cards**: active runs, completed, delayed, total units, on-time rate
- **3 charts** (Chart.js): actual vs expected duration (bar+line), on-time vs delayed (doughnut), daily units & runs (line)
- **Filterable records table**: date range, category, status, text search, column sorting
- **CSV export** (UTF-8 BOM, respects active filters)

## Project Structure
```
public/
├── index.html          ← Single HTML entry point
├── css/
│   └── main.css        ← All styles (dark mode + light mode)
├── js/
│   ├── store.js        ← Data layer (localStorage, CSV, stats helpers)
│   ├── tools.js        ← Tool tag autocomplete widget (65+ tools)
│   ├── employee.js     ← Employee page + Start/Stop modals
│   ├── admin.js        ← Admin dashboard + charts + CSV export
│   └── app.js          ← Bootstrap + tab router + toast system
└── assets/
    └── favicon.svg
src/
└── index.tsx           ← Hono worker (API-only, static served by Cloudflare Pages)
```

## Deployment

### Cloudflare Pages (Production)
```bash
npm run build
npx wrangler pages deploy dist --project-name assemblytrack
```

### Local Development
```bash
npm run build
pm2 start ecosystem.config.cjs
# OR: npx wrangler pages dev dist
```

### Static Hosting (Netlify / Vercel / GitHub Pages)
Drop the `public/` folder — no build step required.

## Tech Stack
- **Frontend**: Vanilla JS (ES2020+), CSS Custom Properties
- **Charts**: Chart.js 4 (CDN)
- **Backend**: Hono on Cloudflare Workers (API-only)
- **Build**: Vite + @hono/vite-build
- **Data**: localStorage (swap `store.js` calls for `fetch()` when ready for backend)
- **Theme**: Dark mode (default) + Light mode toggle

## Before Going Live
| Task | File | Change |
|------|------|--------|
| Change admin password | `js/admin.js` line 7 | Update `CREDENTIALS` object |
| Persist data to a real DB | `js/store.js` | Replace `localStorage` calls with `fetch()` API |
| Add HTTPS | Hosting / Nginx | Required for production |
| Employee ID validation | `js/employee.js` | Update regex or call an API |

## Browser Support
Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. Requires JavaScript enabled.
