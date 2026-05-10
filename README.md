# Quiet Commitments (Goal Accountability)

A single-page accountability app for building consistency through small daily commitments.

The app runs entirely in the browser and persists data in `localStorage` (no backend required).

## What It Does

- Create and manage personal goals
- Mark each goal daily as done or missed
- Track streaks, completion %, and recent history per goal
- View a consistency heatmap across the last 140 days
- Write daily reflections and browse reflection history
- Respond to rotating daily prompts and keep a prompt journal
- Get goal suggestions by focus area and effort level
- Use light/dark mode with theme preference saved locally
- Navigate with bottom tabs (mobile-first, icon-focused)

## Built With

- HTML
- Tailwind CSS (CDN)
- Vanilla JavaScript
- Browser `localStorage`

## Project Structure

- `index.html` - Source HTML template for development
- `src/styles.css` - App styles (light/dark theme, animations, utility overrides)
- `src/content-data.js` - Centralized text/content constants (`MESSAGES`, `DAILY_PROMPTS`, `GOAL_IDEAS`)
- `src/app.js` - App state, rendering, event handling, and persistence logic
- `build.mjs` - Production build script (esbuild + HTML minification)
- `seed-localstorage.js` - Helper script to preload realistic mock data
- `dist/` - Generated production output (`index.html`, `styles.css`, `app.bundle.js`)

## Quick Start

Because this is a static app, you can run it in either of these ways:

1. Open `index.html` directly in your browser.
2. Or serve the folder locally (recommended):

```bash
cd GoalAccountability
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

You can also use npm scripts:

```bash
npm run start
```

## Production Build

Create a production build (bundled/minified JS + minified HTML) with:

```bash
npm run build
```

Build output is written to:

- `dist/index.html` (minified, references bundled JS)
- `dist/styles.css`
- `dist/app.bundle.js` (bundled + minified)

To serve the production output locally:

```bash
npm run start:dist
```

## Data Persistence

The app stores everything under this key:

- `accountability-app`

Saved state includes:

- Goals and each goal's per-day `completionHistory`
- Reflection entries keyed by date (`YYYY-MM-DD`)
- Prompt responses history
- Prompt draft text
- Selected page
- Selected reflection date
- Theme (`light` or `dark`)
- Last celebration date

## Seed Mock Data

Use the seed script to quickly populate ~5 weeks of realistic data.

### Option A: Browser console

1. Open the app.
2. Open DevTools Console.
3. Paste contents of `seed-localstorage.js` and run.
4. Reload the page.

### Option B: Temporary script include

Temporarily add this near the bottom of `index.html` before `app.js`:

```html
<script src="seed-localstorage.js"></script>
```

Reload once to seed, then remove that line.

## UI Notes

- Goal ideas panel is sticky while scrolling on its page.
- Theme toggle appears in the top-right of the dashboard title card.
- Bottom navigation:
  - Mobile: icon-only labels hidden
  - `sm` and up: icon + text labels
- In dark mode, browser chrome color is updated through `theme-color` to better match iPhone Safari top/bottom areas.

## Accessibility and UX

- Focus-visible ring styles are applied via `.focus-ring`.
- Nav buttons include `aria-label` values for icon-only mobile mode.
- Status and save areas use `aria-live` where appropriate.

## Troubleshooting

### Theme colors look stale on iPhone Safari

If the top/bottom browser areas do not immediately reflect dark mode, do a hard refresh or close/reopen the tab after toggling theme.

### Data reset

To reset app data, clear the `accountability-app` key from `localStorage`.

## Future Improvements

- Export/import data as JSON
- Weekly/monthly rollup analytics
- Goal categories and filters
- Optional reminders/notifications
- Sync support (cloud backend)
