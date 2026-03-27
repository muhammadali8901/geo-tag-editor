# Header Code - Complete Implementation

## HTML Structure
File: `/partials/header.html`

```html
<div class="header-inner">
  <a href="/" class="logo" aria-label="Geo Tags Editor Home">
    <img src="/images/logo.png" alt="Geo Tags Editor" style="height:32px;width:auto">
    <span>Geo Tags Editor</span>
  </a>
  <nav class="desktop-nav" aria-label="Main navigation">
    <ul class="nav-links" id="desktopNavLinks"></ul>
  </nav>
  <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileSidebar">
    <span></span><span></span><span></span>
  </button>
</div>
<div class="sidebar-overlay" id="sidebarOverlay"></div>
<aside class="mobile-sidebar" id="mobileSidebar" aria-label="Mobile navigation" aria-hidden="true">
  <div class="sidebar-header">
    <a href="/" class="logo" aria-label="Geo Tags Editor Home">
      <img src="/images/logo.png" alt="Geo Tags Editor" style="height:32px;width:auto">
      <span>Geo Tags Editor</span>
    </a>
    <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
  <div class="mobile-sidebar-body">
    <p class="sidebar-section-title">Tools & Guides</p>
    <nav aria-label="Mobile navigation links">
      <ul class="sidebar-nav" id="mobilePrimaryLinks"></ul>
    </nav>
    <p class="sidebar-section-title">Company & Legal</p>
    <ul class="sidebar-nav sidebar-nav-secondary" id="mobileUtilityLinks"></ul>
  </div>
  <div class="sidebar-cta">
    <div class="sidebar-actions">
      <a href="/geo-tag-editor/" class="btn btn-primary sidebar-btn">Open Geo Tag Tool</a>
      <a href="/contact/" class="btn btn-outline sidebar-btn">Contact Us</a>
    </div>
  </div>
</aside>
```

## CSS Styles
File: `/css/style.css` (Header-specific styles)

```css
/* ── HEADER ── */
.site-header{
  position:sticky;top:0;z-index:9999;
  background:rgba(255,255,255,.96);
  backdrop-filter:blur(16px);
  border-bottom:1px solid var(--border);
  height:var(--header-h);
  transition:box-shadow .3s,background .3s;
  contain:layout style paint;
}
.site-header.scrolled{
  box-shadow:var(--shadow);
  background:rgba(255,255,255,.98);
}
.header-inner{
  display:flex;align-items:center;justify-content:space-between;
  height:var(--header-h);max-width:var(--max-w);margin:0 auto;padding:0 20px;
  width:100%;
  position:relative;
}
.logo{
  display:flex;align-items:center;gap:8px;
  font-size:1.2rem;font-weight:800;color:var(--text);
  transition:opacity .2s;flex-shrink:1;min-width:0
}
.logo:hover{opacity:.85}
.logo span{
  background:var(--gradient);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;white-space:nowrap
}
.logo img{height:28px;width:auto;object-fit:contain}

/* Navigation Links */
.nav-links{
  display:flex;align-items:center;gap:28px;list-style:none
}
.nav-links a{
  font-size:.92rem;font-weight:500;color:var(--text-secondary);
  transition:color .2s;min-height:44px;display:flex;align-items:center
}
.nav-links a:hover,.nav-links a.active{color:var(--primary)}

/* CTA Button */
.nav-cta{
  background:var(--gradient);color:#fff!important;
  padding:10px 24px;border-radius:var(--radius);font-weight:600;
  font-size:.9rem;transition:transform .2s,box-shadow .3s;
  box-shadow:0 2px 8px rgba(2,132,199,.2);
}
.nav-cta:hover{
  transform:translateY(-2px);
  box-shadow:0 4px 16px rgba(2,132,199,.35);
}

/* ── HAMBURGER MENU ── */
.hamburger{
  display:none;flex-direction:column;gap:5px;
  background:none;border:none;padding:6px;cursor:pointer;z-index:10001;
  width:44px;height:44px;border-radius:10px;
  background:var(--gradient);padding:10px;
  box-shadow:0 4px 12px rgba(2,132,199,.25);
}
.hamburger span{
  display:block;width:24px;height:2.5px;background:var(--text);
  border-radius:2px;transition:transform .3s,opacity .3s
}
.hamburger span{background:#fff}
.hamburger.open span:nth-child(1){
  transform:rotate(45deg) translate(5px,5px)
}
.hamburger.open span:nth-child(2){opacity:0}
.hamburger.open span:nth-child(3){
  transform:rotate(-45deg) translate(5px,-5px)
}

/* ── SIDEBAR OVERLAY ── */
.sidebar-overlay{
  display:none;position:fixed;inset:0;
  background:rgba(0,0,0,.45);z-index:10002;
  backdrop-filter:blur(2px);
  transition:opacity .36s ease;
  opacity:0;
}
.sidebar-overlay.open{display:block;opacity:1}

/* Body scroll lock */
body.sidebar-open{overflow:hidden;position:fixed;width:100%;height:100vh}

/* ── MOBILE SIDEBAR ── */
.mobile-sidebar{
  position:fixed;top:0;right:0;bottom:0;
  width:320px;max-width:85vw;
  background:#0f172a;
  z-index:10003;
  transform:translateX(100%);
  box-shadow:-8px 0 30px rgba(0,0,0,.2);
  transition:transform .36s cubic-bezier(.4,0,.2,1);
  overflow-y:auto;
  display:flex;flex-direction:column;
  visibility:hidden;
}
.mobile-sidebar.open{
  transform:translateX(0);
  visibility:visible;
}

.sidebar-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:20px 24px;border-bottom:1px solid rgba(148,163,184,.2);
  position:sticky;top:0;background:#111827;z-index:10;
  backdrop-filter:blur(10px);
}
.sidebar-header .logo span{
  color:#fff;-webkit-text-fill-color:#fff;background:none
}
.mobile-sidebar-body{
  padding:10px 0 18px;overflow-y:auto;flex:1;position:relative;z-index:5
}
.sidebar-section-title{
  font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:#94a3b8;padding:14px 24px 8px;
  position:relative;z-index:5;
}
.sidebar-close{
  background:rgba(148,163,184,.18);border:none;cursor:pointer;
  color:#fff;padding:10px;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  transition:all .3s ease;
  width:40px;height:40px;
}
.sidebar-close:hover{
  background:rgba(255,255,255,0.3);transform:scale(1.1)
}

.sidebar-nav{
  list-style:none;padding:0;margin:0
}
.sidebar-nav li{
  margin:0
}
.sidebar-nav a{
  display:flex;align-items:center;gap:12px;
  padding:12px 24px;color:#e2e8f0;
  text-decoration:none;transition:all .2s ease;
  font-size:.95rem;font-weight:500;
  border-left:3px solid transparent;
}
.sidebar-nav a:hover{
  background:rgba(255,255,255,0.1);
  color:#fff;
  border-left-color:var(--primary);
}
.sidebar-nav a.active{
  background:rgba(2,132,199,.2);
  color:#fff;
  border-left-color:var(--primary);
}
.sidebar-nav .icon{
  width:20px;height:20px;
  flex-shrink:0;
}

.sidebar-nav-secondary a{
  font-size:.88rem;
  opacity:.8;
}
.sidebar-nav-secondary a:hover{
  opacity:1;
}

.sidebar-cta{
  padding:20px 24px 24px;
  background:rgba(0,0,0,.2);
  border-top:1px solid rgba(148,163,184,.1);
}
.sidebar-actions{
  display:flex;flex-direction:column;gap:12px
}
.sidebar-btn{
  text-align:center;padding:14px 20px;
  border-radius:var(--radius);
  font-weight:600;font-size:.9rem;
  text-decoration:none;transition:all .2s;
  display:block;
}
.sidebar-btn.btn-primary{
  background:var(--gradient);color:#fff;
  box-shadow:0 4px 12px rgba(2,132,199,.3);
}
.sidebar-btn.btn-primary:hover{
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(2,132,199,.4);
}
.sidebar-btn.btn-outline{
  background:transparent;border:2px solid rgba(255,255,255,.3);
  color:#fff;
}
.sidebar-btn.btn-outline:hover{
  background:rgba(255,255,255,.1);
  border-color:rgba(255,255,255,.5);
}

/* ── RESPONSIVE ── */
@media (max-width: 768px){
  .hamburger{display:flex}
  .desktop-nav{display:none}
  .site-header{background:rgba(255,255,255,.98)}
}
```

## JavaScript Implementation
File: `/js/common.js` (Header-specific functions)

```javascript
// Site Configuration
const SITE = {
  name: 'Geo Tags Editor',
  tagline: 'Free Online Geo Tag Editor',
  domain: 'https://geotagseditor.online',
  year: new Date().getFullYear()
};

// Icon Definitions
const icon = {
  home: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  minus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  blog: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  about: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  contact: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  shield: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  terms: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 3v5h4M10 13h6M10 17h6M10 9h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  map: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4v14M15 6v14" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};

// Navigation Links Configuration
const primaryLinks = [
  { label: 'Home', href: '/', icon: icon.home },
  { label: 'Add GPS', href: '/add-gps-to-photo-online/', icon: icon.plus },
  { label: 'Remove GPS', href: '/remove-geotag-from-photo-online/', icon: icon.minus },
  { label: 'Geo Tag Editor', href: '/geo-tag-editor/', icon: icon.edit },
  { label: 'Blog', href: '/blog/', icon: icon.blog }
];

const utilityLinks = [
  { label: 'About', href: '/about/', icon: icon.about },
  { label: 'Contact', href: '/contact/', icon: icon.contact },
  { label: 'Privacy Policy', href: '/privacy-policy/', icon: icon.shield },
  { label: 'Terms & Conditions', href: '/terms/', icon: icon.terms },
  { label: 'Sitemap', href: '/sitemap/', icon: icon.map }
];

// Helper Functions
function isActive(href) {
  var path = window.location.pathname.replace(/\\/g, '/').replace(/\/$/, '') || '/';
  var target = (href || '/').replace(/\/$/, '') || '/';
  if (path === target) return true;
  if (path.startsWith(target + '/')) return true;
  return false;
}

// Load Partial HTML
function loadPartial(targetId, partialPath) {
  var target = document.getElementById(targetId);
  if (!target) return Promise.resolve(false);
  return fetch(partialPath, { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('Failed loading ' + partialPath);
      return response.text();
    })
    .then(function (html) {
      target.innerHTML = html;
      // If this is the header, immediately try to render links
      if (targetId === 'site-header') {
        setTimeout(renderHeaderLinks, 10);
      }
      return true;
    })
    .catch(function () {
      return false;
    });
}

// Render Header Navigation Links
function renderHeaderLinks() {
  var desktop = document.getElementById('desktopNavLinks');
  var mobilePrimary = document.getElementById('mobilePrimaryLinks');
  var mobileUtility = document.getElementById('mobileUtilityLinks');
  
  if (!desktop || !mobilePrimary || !mobileUtility) {
    setTimeout(renderHeaderLinks, 100);
    return;
  }

  // Clear existing content
  desktop.innerHTML = '';
  mobilePrimary.innerHTML = '';
  mobileUtility.innerHTML = '';

  // Populate desktop links
  primaryLinks.forEach(function (l) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = l.href;
    a.className = isActive(l.href) ? 'active' : '';
    a.textContent = l.label;
    li.appendChild(a);
    desktop.appendChild(li);
  });
  
  // Add CTA button to desktop
  var ctaLi = document.createElement('li');
  var ctaA = document.createElement('a');
  ctaA.href = '/geo-tag-editor/';
  ctaA.className = 'nav-cta';
  ctaA.textContent = 'Try Free Tool';
  ctaLi.appendChild(ctaA);
  desktop.appendChild(ctaLi);

  // Populate mobile primary links
  primaryLinks.forEach(function (l) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = l.href;
    a.className = isActive(l.href) ? 'active' : '';
    a.innerHTML = l.icon + l.label;
    li.appendChild(a);
    mobilePrimary.appendChild(li);
  });

  // Populate mobile utility links
  utilityLinks.forEach(function (l) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = l.href;
    a.className = isActive(l.href) ? 'active' : '';
    a.innerHTML = l.icon + l.label;
    li.appendChild(a);
    mobileUtility.appendChild(li);
  });

  // Setup mobile menu functionality
  setupMobileMenu();
}

// Mobile Menu Setup
function setupMobileMenu() {
  var hamburger = document.getElementById('hamburger');
  var sidebar = document.getElementById('mobileSidebar');
  var overlay = document.getElementById('sidebarOverlay');
  var closeBtn = document.getElementById('sidebarClose');

  if (!hamburger || !sidebar || !overlay) return;

  function openMenu() {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.body.classList.add('sidebar-open');
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  }

  // Event listeners
  hamburger.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  // Close menu on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeMenu();
    }
  });

  // Close menu on window resize if open
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
      closeMenu();
    }
  });
}

// Header Scroll Effect
function setupHeaderScroll() {
  var header = document.getElementById('site-header');
  if (!header) return;

  var lastScrollY = window.scrollY;
  var scrollThreshold = 50;

  function updateHeader() {
    var currentScrollY = window.scrollY;
    
    if (currentScrollY > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    
    lastScrollY = currentScrollY;
  }

  // Throttled scroll handler
  var ticking = false;
  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
      setTimeout(function() { ticking = false; }, 100);
    }
  }

  window.addEventListener('scroll', requestTick);
  updateHeader(); // Initial call
}

// Initialize Header
function initHeader() {
  loadPartial('site-header', '/partials/header.html')
    .then(function(success) {
      if (success) {
        renderHeaderLinks();
        setupHeaderScroll();
      }
    });
}

// Accessibility Features
function injectSkipLink() {
  if (document.querySelector('.skip-link')) return;
  var skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Skip to main content';
  document.body.insertBefore(skip, document.body.firstChild);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    injectSkipLink();
    initHeader();
  });
} else {
  injectSkipLink();
  initHeader();
}
```

## Integration Instructions

### 1. HTML Integration
Add this to your main HTML files where you want the header:

```html
<header class="site-header" id="site-header" role="banner"></header>
```

### 2. CSS Variables
Make sure these CSS variables are defined in your stylesheet:

```css
:root{
  --primary:#0284c7;
  --primary-dark:#0369a1;
  --gradient:linear-gradient(135deg,#0284c7 0%,#6366f1 100%);
  --text:#0f172a;
  --text-secondary:#475569;
  --border:#e2e8f0;
  --shadow:0 4px 16px rgba(0,0,0,.06);
  --radius:10px;
  --header-h:70px;
  --max-w:1200px;
}
```

### 3. JavaScript Loading
Include the common.js file in your HTML:

```html
<script src="/js/common.js" defer></script>
```

### 4. File Structure
Ensure these files exist:
- `/partials/header.html` - Header HTML template
- `/css/style.css` - Header styles
- `/js/common.js` - Header functionality
- `/images/logo.png` - Logo image

## Features Included

- **Responsive Design**: Desktop and mobile layouts
- **Mobile Menu**: Hamburger menu with slide-out sidebar
- **Active State**: Current page highlighting
- **Scroll Effects**: Header changes appearance on scroll
- **Accessibility**: ARIA labels, skip links, keyboard navigation
- **Smooth Animations**: CSS transitions and transforms
- **Modern Design**: Gradient effects, backdrop blur, shadows
- **SEO Friendly**: Semantic HTML structure

## Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
