# Photo EXIF / Geotag Tool - Static Site

## Overview
A static HTML/CSS/JS website for photo EXIF data viewing, geotagging, and geotag removal. Originally hosted on Vercel, now running on Replit. Domain: geotagseditor.online

## Architecture
- Pure static site: HTML, CSS, JavaScript
- No build step required
- Node.js (`server.js`) serves static files on port 5000

## Running the App
The workflow "Start application" runs `node server.js`, which:
- Serves static files from the project root
- Applies URL rewrites (e.g. `/about` → `/about/index.html`)
- Adds security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Adds Cache-Control headers: 1-year immutable for CSS/JS/images, must-revalidate for HTML
- Listens on `0.0.0.0:5000`

## Key Files
- `server.js` — Static file server with rewrite rules, security headers, and caching
- `index.html` — Main landing page (1140+ lines)
- `partials/header.html` — Shared header loaded via fetch
- `partials/footer.html` — Shared footer loaded via fetch
- `js/common.js` — Header/footer loading, sidebar logic (sidebar/overlay moved to body, not header)
- `js/site.js` — Site-wide interactions (FAQ, scroll, etc.)
- `js/tool.js` — GPS EXIF editor tool logic
- `css/style.css` — Main stylesheet (no @import — fonts loaded via HTML link tags)
- `images/` — Logo, icons SVG, OG image, tool screenshot SVGs
- `sitemap.xml` — Full sitemap with image sitemaps
- `robots.txt` — Allows all crawlers, points to sitemap

## Pages
- `/` — Home (main landing + tool)
- `/about` — About
- `/contact` — Contact
- `/blog` — Blog index
- `/add-gps-to-photo-online` — GPS tagging tool page
- `/remove-geotag-from-photo-online` — Geotag removal tool page
- `/geo-tag-editor` — Geotag editor tool page
- `/privacy-policy`, `/terms`, `/disclaimer` — Legal pages
- `/blog/*` — 15+ blog articles

## Core Web Vitals Fixes Applied
1. **Font loading** — Removed render-blocking `@import` from `css/style.css`; all pages now load Outfit font asynchronously via `<link rel="preload" as="style" onload="...">` pattern
2. **Eliminated double-fetching** — Removed incorrect `<link rel="modulepreload">` tags from all pages (scripts are `defer` not ES modules)
3. **Removed unused render-blocking CDN** — Deleted Font Awesome CDN link from index.html and 3 blog pages (Font Awesome was loaded but never used)
4. **Aggressive asset caching** — server.js now sets `Cache-Control: public, max-age=31536000, immutable` for all CSS, JS, images, fonts; HTML gets `must-revalidate`
5. **Fixed broken tool screenshots** — Replaced 3 placeholder text files (50 bytes each) with proper SVG illustrations (`images/tool-screenshot-1/2/3.svg`)
6. **Fixed OG image** — Changed `/images/preview.jpg` (non-existent) to `/images/og-default.svg` in all og:image and twitter:image meta tags

## Authority / SEO Signals
- Comprehensive schema markup: Organization, WebSite (SearchAction), WebApplication, HowTo, FAQPage, Review
- FAQPage JSON-LD matches 13 visible FAQ items
- Proper canonical tags, robots meta, author meta on all pages
- Google Analytics (G-ZBE0XN48DV) on all pages
- Sitemap.xml with image sitemaps for all key pages

## Sidebar Architecture Note
The mobile sidebar and overlay elements MUST live in `<body>`, not inside `<header>`. The `<header>` has `contain:layout style paint` in both the critical inline CSS and style.css — this clips any `position:fixed` children. `js/common.js` moves the sidebar and overlay to `document.body` after the partial header HTML is loaded via fetch.
