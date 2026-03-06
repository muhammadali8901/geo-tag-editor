/* ============================================
   Geo Tags Editor — Shared Components & Utilities
   ============================================ */

(function () {
  'use strict';

  const SITE = {
    name: 'Geo Tags Editor',
    tagline: 'Free Online Geo Tag Editor',
    domain: 'https://geotagseditor.online',
    year: new Date().getFullYear()
  };

  const logoSVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="url(#g)"/>
    <path d="M16 7c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" fill="#fff"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
  </svg>`;

  function getRelPath() {
    var path = window.location.pathname.replace(/\\/g, '/');
    var parts = path.split('/').filter(Boolean);
    var file = parts[parts.length - 1] || '';
    var dir = parts[parts.length - 2] || '';
    if (dir === 'blog' && file.endsWith('.html') && file !== 'blog.html') return '../';
    return '';
  }

  function isActive(href) {
    var path = window.location.pathname.replace(/\\/g, '/');
    var current = path.replace(/\/$/, '').split('/').pop() || 'index';
    current = current.replace('.html', '');
    var target = href.replace('.html', '').split('/').pop() || 'index';
    if (current === target) return true;
    if (current === 'index' && (target === '' || target === 'index')) return true;
    if (path.includes('/blog') && target === 'blog') return true;
    return false;
  }

  function injectSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var skip = document.createElement('a');
    skip.href = '#main-content';
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  function wrapMain() {
    var header = document.getElementById('site-header');
    var footer = document.getElementById('site-footer');
    if (!header || !footer || document.getElementById('main-content')) return;
    var main = document.createElement('main');
    main.id = 'main-content';
    var sibling = header.nextSibling;
    while (sibling && sibling !== footer) {
      var next = sibling.nextSibling;
      main.appendChild(sibling);
      sibling = next;
    }
    header.parentNode.insertBefore(main, footer);
  }

  function injectHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    const r = getRelPath();
    const links = [
      { label: 'Home', href: r + 'index.html' },
      { label: 'Geo Tag Editor', href: r + 'geo-tag-editor.html' },
      { label: 'Blog', href: r + 'blog.html' },
      { label: 'About', href: r + 'about.html' },
      { label: 'Contact', href: r + 'contact.html' }
    ];
    const navItems = links.map(l =>
      `<li><a href="${l.href}" class="${isActive(l.href) ? 'active' : ''}">${l.label}</a></li>`
    ).join('');

    header.innerHTML = `
      <div class="header-inner">
        <a href="${r}index.html" class="logo" aria-label="${SITE.name} Home">${logoSVG}<span>${SITE.name}</span></a>
        <nav aria-label="Main navigation">
          <ul class="nav-links" id="navLinks">
            ${navItems}
            <li><a href="${r}geo-tag-editor.html" class="nav-cta">Try Free Tool</a></li>
          </ul>
        </nav>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false" aria-controls="navLinks">
          <span></span><span></span><span></span>
        </button>
      </div>`;

    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    hamburger.addEventListener('click', function () {
      const open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  function injectFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const r = getRelPath();

    footer.innerHTML = `
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">${logoSVG}<span>${SITE.name}</span></div>
          <p>${SITE.name} is a free online tool that lets you add, edit, or remove GPS geotag metadata from your JPEG images. Fast, private, and entirely browser-based.</p>
        </div>
        <div class="footer-col">
          <p class="footer-title">Quick Links</p>
          <ul>
            <li><a href="${r}index.html">Home</a></li>
            <li><a href="${r}geo-tag-editor.html">Geo Tag Editor</a></li>
            <li><a href="${r}blog.html">Blog</a></li>
            <li><a href="${r}about.html">About Us</a></li>
            <li><a href="${r}contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <p class="footer-title">Resources</p>
          <ul>
            <li><a href="${r}blog/how-to-add-gps-location-to-photos.html">Add GPS to Photos</a></li>
            <li><a href="${r}blog/why-geotagging-matters-for-local-seo.html">Geotagging &amp; SEO</a></li>
            <li><a href="${r}blog/how-to-remove-metadata-from-images.html">Remove Metadata</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <p class="footer-title">Legal</p>
          <ul>
            <li><a href="${r}privacy-policy.html">Privacy Policy</a></li>
            <li><a href="${r}terms.html">Terms &amp; Conditions</a></li>
            <li><a href="${r}disclaimer.html">Disclaimer</a></li>
            <li><a href="${r}sitemap-page.html">Sitemap</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${SITE.year} ${SITE.name}. All rights reserved. Free online geo tag editor tool.
      </div>`;
  }

  function showToast(msg) {
    let t = document.getElementById('global-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'global-toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectSkipLink();
    injectHeader();
    injectFooter();
    wrapMain();
  });

  window.GTP = { showToast, SITE };
})();
