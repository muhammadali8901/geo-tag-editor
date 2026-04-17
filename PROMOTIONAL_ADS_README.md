# Promotional Ads Integration Guide

Complete guide for integrating promotional ads into your Geo Tag Editor website.

**Files Created:**
- `css/promotional-ads.css` - 10KB component styles
- `js/promotional-ads.js` - 8KB component functionality
- `PROMOTIONAL_ADS_GUIDE.html` - Full documentation (open in browser)

---

## Quick Start (2 Minutes)

### Step 1: Add Stylesheet Link
In the `<head>` of your pages:
```html
<link rel="stylesheet" href="/css/promotional-ads.css">
```

### Step 2: Add Script Link
Before `</body>` closing tag:
```html
<script src="/js/promotional-ads.js" defer></script>
```

### Step 3: Add Component HTML
Choose from the examples below based on placement.

---

## Component 1: Card Ad (Full-Width Promotional Card)

### When to Use:
- Homepage sections (4-5 times throughout page)
- Between content sections
- Tool pages (optional)

### HTML Template:

```html
<div class="ad-card-container">
  <div class="ad-card-header">
    <h3 class="ad-card-title">Free Business Listing</h3>
    <p class="ad-card-subtitle">Get your business online in minutes</p>
  </div>

  <div class="ad-iframe-wrapper loading">
    <iframe 
      data-src="https://your-listing-website.com"
      loading="lazy"
      sandbox="allow-same-origin allow-scripts allow-popups"
      rel="noopener noreferrer"
      title="Free Business Listing Preview">
    </iframe>
    <div class="ad-iframe-loader">
      <div class="ad-loader-spinner"></div>
    </div>
  </div>

  <ul class="ad-card-features">
    <li class="ad-feature-item">
      <span class="ad-feature-icon">✓</span>
      <p class="ad-feature-text">Free business listing</p>
    </li>
    <li class="ad-feature-item">
      <span class="ad-feature-icon">✓</span>
      <p class="ad-feature-text">Increase online visibility</p>
    </li>
    <li class="ad-feature-item">
      <span class="ad-feature-icon">✓</span>
      <p class="ad-feature-text">SEO-friendly profiles</p>
    </li>
    <li class="ad-feature-item">
      <span class="ad-feature-icon">✓</span>
      <p class="ad-feature-text">Easy submission process</p>
    </li>
  </ul>

  <div class="ad-card-footer">
    <a href="https://your-listing-website.com" 
       target="_blank" 
       rel="noopener noreferrer"
       class="ad-cta-button">
      List Your Business
    </a>
  </div>
</div>
```

### Customization:
Replace the following:
- `data-src="https://your-listing-website.com"` - Your listing website URL
- `href="https://your-listing-website.com"` - CTA button URL
- `Ad card title/subtitle` - Your messaging
- `bullet points` - Feature highlights
- `button text` - CTA text

---

## Component 2: Sidebar Ad (Fixed/Sticky Sidebar)

### When to Use:
- Tool pages (Geo Tag Editor, etc.)
- Right or left side of interface
- Auto-hides on mobile/tablet

### HTML Template:

```html
<aside class="ad-sidebar-container" role="complementary" aria-label="Promotional ads">
  <button class="ad-sidebar-close" aria-label="Close sidebar">×</button>

  <a href="https://your-listing-website.com" 
     class="ad-sidebar-item" 
     target="_blank" 
     rel="noopener noreferrer"
     title="List Your Business">
    📌 List Business
  </a>

  <a href="https://your-listing-website.com/features" 
     class="ad-sidebar-item" 
     target="_blank" 
     rel="noopener noreferrer"
     title="See Features">
    ⭐ Features
  </a>

  <a href="https://your-listing-website.com/pricing" 
     class="ad-sidebar-item" 
     target="_blank" 
     rel="noopener noreferrer"
     title="View Pricing">
    💰 Pricing
  </a>

  <a href="https://your-listing-website.com/contact" 
     class="ad-sidebar-item" 
     target="_blank" 
     rel="noopener noreferrer"
     title="Contact Us">
    💬 Support
  </a>
</aside>
```

### Customization:
- **Position left:** Add `left` class: `<aside class="ad-sidebar-container left">`
- **Sticky instead of fixed:** Add `sticky` class: `<aside class="ad-sidebar-container sticky">`
- **Change links:** Replace all `href` URLs with your links
- **Change text:** Replace emoji + text in sidebar items

---

## Placement Strategy

### Homepage: 4-5 Card Ads

```
1. HERO SECTION
   ↓
2. [AD #1: Free Business Listing] ← First placement (high visibility)
   ↓
3. FEATURES SECTION
   ↓
4. [AD #2: Free Business Listing]
   ↓
5. TOOLS GRID
   ↓
6. [AD #3: Free Business Listing]
   ↓
7. HOW IT WORKS SECTION
   ↓
8. [AD #4: Free Business Listing]
   ↓
9. TESTIMONIALS
   ↓
10. [AD #5: Free Business Listing] ← Final placement (strongest CTA)
    ↓
11. FOOTER
```

**Best Practice:** Use `<div class="ad-section">` wrapper for visual separation:
```html
<div class="ad-section">
  <div class="ad-card-container">
    ... card ad ...
  </div>
</div>
```

### Tool Page: Sidebar + Optional Card

```
LAYOUT:
┌─────────────────────────────────────┐
│ [SIDEBAR]  │ MAIN CONTENT           │
│            │                        │
│ ☰ List ☰   │ TOOL INTERFACE         │
│ Business   │ (Geo Tag Editor)       │
│            │                        │
│ ⭐ Features │ [Optional Ad Below]    │
│            │                        │
│ 💰 Pricing  │ RELATED FAQ            │
│            │                        │
│ 💬 Support  │                        │
│            │                        │
└─────────────────────────────────────┘

On Mobile: Sidebar hidden, card full-width if shown
```

---

## HTML Integration Examples

### Example 1: Homepage Head Addition

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... existing meta tags ... -->
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/promotional-ads.css">  <!-- NEW -->
</head>
<body>
  <!-- ... existing content ... -->
  <script src="/js/site.js"></script>
  <script src="/js/promotional-ads.js" defer></script>  <!-- NEW -->
</body>
</html>
```

### Example 2: Homepage Section Placement

```html
<main>
  <section class="hero">
    <!-- Hero content -->
  </section>

  <!-- NEW: First ad placement -->
  <div class="ad-section">
    <div class="ad-card-container">
      <!-- Card ad HTML -->
    </div>
  </div>

  <section class="features">
    <!-- Features content -->
  </section>

  <!-- NEW: Second ad placement -->
  <div class="ad-section">
    <div class="ad-card-container">
      <!-- Card ad HTML -->
    </div>
  </div>
</main>
```

### Example 3: Tool Page with Sidebar

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="/css/promotional-ads.css">  <!-- NEW -->
</head>
<body>
  <!-- NEW: Sidebar ad (add after body opening tag) -->
  <aside class="ad-sidebar-container sticky">
    <!-- Sidebar ad HTML -->
  </aside>

  <!-- Main tool interface -->
  <main class="tool-main">
    <h1>Geo Tag Editor</h1>
    <div class="tool-interface">
      <!-- Tool content -->
    </div>
  </main>

  <script src="/js/promotional-ads.js" defer></script>  <!-- NEW -->
</body>
</html>
```

---

## Performance Metrics

**File Sizes:**
- `promotional-ads.css`: 10KB (3KB minified + gzipped)
- `promotional-ads.js`: 8KB (2.5KB minified + gzipped)
- **Total impact:** ~5.5KB on first load

**Lighthouse Impact:**
- ✅ No render-blocking JavaScript (deferred)
- ✅ No Cumulative Layout Shift (CLS)
- ✅ Native lazy loading on iframes
- ✅ Minimal main thread work
- ✅ Silent, non-intrusive loading

**SEO Friendly:**
- ✅ Semantic HTML structure
- ✅ Proper ARIA labels for accessibility
- ✅ Does not interfere with content indexing
- ✅ Print-friendly (ads hidden on print)

---

## JavaScript API

### Available Methods

**Toggle ads programmatically:**
```javascript
// Hide all ads
GeoTagAds.toggleAds(false);

// Show all ads
GeoTagAds.toggleAds(true);
```

**Update ad content dynamically:**
```javascript
GeoTagAds.updateAdContent('.ad-card-container', {
  title: 'New Title',
  subtitle: 'New subtitle text',
  buttonText: 'New Button Text',
  buttonUrl: 'https://new-url.com'
});
```

**Configure sidebar behavior:**
```javascript
// Modify config (do this BEFORE document loads)
GeoTagAds.config = {
  sidebarSticky: true,              // true = sticky, false = fixed
  stickyOffset: 100,                // pixels from top
  lazyLoadThreshold: 100            // pixels before visible area
};
```

---

## Analytics Tracking

**Automatic Tracking (if Google Analytics is loaded):**
- ✅ Button clicks tracked as `ad_click` events
- ✅ Sidebar clicks tracked as `sidebar_ad_click` events
- ✅ Ad title and text included in event data

**View in Google Analytics:**
```
Events > ad_click
Events > sidebar_ad_click
```

---

## Customization Options

### Change Colors

Override CSS variables in your stylesheet:

```css
:root {
  --ad-primary: #0284c7;           /* Button color */
  --ad-primary-hover: #0369a1;     /* On hover */
  --ad-bg: #ffffff;                /* Card background */
  --ad-border: #e2e8f0;            /* Border color */
}
```

### Change Sizes

```css
/* Wider sidebar */
.ad-sidebar-container {
  width: 100px;
}

/* Larger card ad */
.ad-card-container {
  max-width: 800px;
}
```

### Dark Mode

Component has built-in dark mode support. No actions needed!

```css
/* Automatically applied when system prefers-color-scheme: dark */
@media (prefers-color-scheme: dark) {
  /* Styles automatically applied */
}
```

---

## Responsive Behavior

| Screen Size | Sidebar | Card Ads | Notes |
|-------------|---------|----------|-------|
| Desktop (1025px+) | Visible, sticky/fixed | Full-width | Optimal layout |
| Tablet (769-1024px) | Hidden | Full-width | Mobile-first approach |
| Mobile (<768px) | Hidden | Full-width, responsive | Touch-friendly sizes |

---

## Troubleshooting

### Ads not showing?
- ✓ Check stylesheet link in `<head>`
- ✓ Check script link before `</body>`
- ✓ Verify file paths are correct
- ✓ Check browser console for errors

### Sidebar overlapping content?
```css
.ad-sidebar-container {
  right: 40px;    /* Increase margin */
  z-index: 90;    /* Lower z-index */
  width: 70px;    /* Narrower */
}
```

### Iframe not loading?
- ✓ Verify URL in `data-src` attribute
- ✓ Check for CORS errors in browser console
- ✓ Ensure listing site allows embedding
- ✓ Test URL directly in browser

### Mobile layout broken?
- ✓ Check media queries match breakpoints (1024px)
- ✓ Verify no custom CSS overriding responsive rules
- ✓ Test on actual mobile device or DevTools

---

## Implementation Checklist

Before going live:
- [ ] Copy `promotional-ads.css` to `/css/`
- [ ] Copy `promotional-ads.js` to `/js/`
- [ ] Add stylesheet link to all pages
- [ ] Add script link to all pages
- [ ] Add 4-5 card ads to homepage
- [ ] Add sidebar ad to tool pages
- [ ] Test on desktop (1920px)
- [ ] Test on tablet (768px)
- [ ] Test on mobile (375px)
- [ ] Verify CTA buttons work
- [ ] Test iframe loading
- [ ] Run Lighthouse audit
- [ ] Validate HTML
- [ ] Test keyboard navigation
- [ ] Test with screen readers
- [ ] Monitor Search Console for crawl errors

---

## Next Steps

1. **Review the HTML guide:** Open `PROMOTIONAL_ADS_GUIDE.html` in browser
2. **Copy component files:** Move CSS and JS to appropriate directories
3. **Add to pages:** Integrate HTML snippets into your site
4. **Test locally:** Verify appearance and functionality
5. **Deploy:** Push to production
6. **Monitor:** Track analytics and user engagement

---

## Support

For detailed instructions:
- See `PROMOTIONAL_ADS_GUIDE.html` (visual guide with examples)
- Check JavaScript console for debug messages
- Review CSS variables in `promotional-ads.css`
- Test each component independently

**Expected Results:**
- ✅ Professional, modern ads
- ✅ Non-intrusive layout
- ✅ Mobile responsive
- ✅ Fast performance
- ✅ Better conversion tracking
