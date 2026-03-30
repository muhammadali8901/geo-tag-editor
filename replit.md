# Photo EXIF / Geotag Tool - Static Site

## Overview
A static HTML/CSS/JS website for photo EXIF data viewing, geotagging, and geotag removal. Originally hosted on Vercel, now running on Replit.

## Architecture
- Pure static site: HTML, CSS, JavaScript
- No build step required
- Node.js (`server.js`) serves static files on port 5000

## Running the App
The workflow "Start application" runs `node server.js`, which:
- Serves static files from the project root
- Applies URL rewrites from the original `vercel.json` (e.g. `/about` → `/about/index.html`)
- Adds security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Listens on `0.0.0.0:5000`

## Key Files
- `server.js` — Static file server with rewrite rules and security headers
- `index.html` — Main landing page
- `vercel.json` — Original Vercel config (rewrites are replicated in server.js)
- `js/` — Client-side JavaScript
- `css/` — Stylesheets

## Pages
- `/` — Home
- `/about` — About
- `/contact` — Contact
- `/blog` — Blog
- `/add-gps-to-photo-online` — GPS tagging tool
- `/remove-geotag-from-photo-online` — Geotag removal tool
- `/geo-tag-editor` — Geotag editor
- `/privacy-policy`, `/terms`, `/disclaimer` — Legal pages
