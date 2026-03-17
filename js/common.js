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

  const logoHTML = `<img src="/images/logo.png" alt="${SITE.name}" style="height:32px;width:auto">`;

  function isActive(href) {
    var path = window.location.pathname.replace(/\\/g, '/').replace(/\/$/, '') || '/';
    var target = (href || '/').replace(/\/$/, '') || '/';
    if (path === target) return true;
    if (path.startsWith(target + '/')) return true;
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

    const links = [
      { label: 'Home', href: '/' },
      { label: 'Add GPS', href: '/add-gps-to-photo-online/' },
      { label: 'Remove GPS', href: '/remove-geotag-from-photo-online/' },
      { label: 'Geo Tag Editor', href: '/geo-tag-editor/' },
      { label: 'Blog', href: '/blog/' },
      { label: 'About', href: '/about/' },
      { label: 'Contact', href: '/contact/' }
    ];

    const desktopNavItems = links.map(l =>
      `<li><a href="${l.href}" class="${isActive(l.href) ? 'active' : ''}">${l.label}</a></li>`
    ).join('');

    const sidebarNavItems = links.map(l =>
      `<li><a href="${l.href}" class="${isActive(l.href) ? 'active' : ''}">${l.label}</a></li>`
    ).join('');

    header.innerHTML = `
      <div class="header-inner">
        <a href="/" class="logo" aria-label="${SITE.name} Home">${logoHTML}<span>${SITE.name}</span></a>
        <nav class="desktop-nav" aria-label="Main navigation">
          <ul class="nav-links" id="navLinks">
            ${desktopNavItems}
            <li><a href="/geo-tag-editor/" class="nav-cta">Try Free Tool</a></li>
          </ul>
        </nav>
        <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileSidebar">
          <span></span><span></span><span></span>
        </button>
      </div>`;

    // Inject sidebar + overlay into body
    if (!document.getElementById('mobileSidebar')) {
      const overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebarOverlay';

      const sidebar = document.createElement('aside');
      sidebar.className = 'mobile-sidebar';
      sidebar.id = 'mobileSidebar';
      sidebar.setAttribute('aria-label', 'Mobile navigation');
      sidebar.innerHTML = `
        <div class="sidebar-header">
          <a href="/" class="logo" aria-label="${SITE.name} Home">${logoHTML}<span>${SITE.name}</span></a>
          <button class="sidebar-close" id="sidebarClose" aria-label="Close menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          <ul class="sidebar-nav">
            ${sidebarNavItems}
          </ul>
        </nav>
        <div class="sidebar-cta">
          <a href="/geo-tag-editor/" class="btn btn-primary" style="width:100%;justify-content:center;">Try Free Tool</a>
        </div>`;

      document.body.appendChild(overlay);
      document.body.appendChild(sidebar);
    }

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  function injectFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;

    footer.innerHTML = `
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">${logoHTML}<span>${SITE.name}</span></div>
          <p>${SITE.name} is a free online tool that lets you add, edit, or remove GPS geotag metadata from your JPEG images. Fast, private, and entirely browser-based.</p>
        </div>
        <div class="footer-col">
          <p class="footer-title">Quick Links</p>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/add-gps-to-photo-online/">Add GPS</a></li>
            <li><a href="/remove-geotag-from-photo-online/">Remove GPS</a></li>
            <li><a href="/geo-tag-editor/">Geo Tag Editor</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/about/">About Us</a></li>
            <li><a href="/contact/">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <p class="footer-title">Articles & Guides</p>
          <ul>
            <li><a href="/blog/how-to-add-geotag-to-existing-photos/">Add Geotag to Existing Photos</a></li>
            <li><a href="/blog/remove-geotag-from-photo/">Remove Geotag from Photo</a></li>
            <li><a href="/blog/why-geotagging-matters-for-local-seo/">Geotagging for Local SEO</a></li>
            <li><a href="/blog/how-to-remove-metadata-from-images/">Remove Image Metadata</a></li>
            <li><a href="/blog/how-to-remove-gps-location-data-from-photos/">Remove GPS Location Data From Photos</a></li>
            <li><a href="/blog/how-to-add-gps-location-to-photos/">Add GPS to Photos</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <p class="footer-title">Legal</p>
          <ul>
            <li><a href="/privacy-policy/">Privacy Policy</a></li>
            <li><a href="/terms/">Terms &amp; Conditions</a></li>
            <li><a href="/disclaimer/">Disclaimer</a></li>
            <li><a href="/sitemap/">Sitemap</a></li>
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
