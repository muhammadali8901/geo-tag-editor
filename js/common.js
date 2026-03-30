/* ============================================
   Geo Tags Editor — Shared Components & Utilities
   ============================================ */

// Load protection script first
(function() {
    var protectionScript = document.createElement('script');
    protectionScript.src = '/js/protection.js';
    protectionScript.async = true;
    document.head.appendChild(protectionScript);
})();

(function () {
  'use strict';

  const SITE = {
    name: 'Geo Tags Editor',
    tagline: 'Free Online Geo Tag Editor',
    domain: 'https://geotagseditor.online',
    year: new Date().getFullYear()
  };

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
        if (targetId === 'site-header') {
          // Move sidebar + overlay out of <header> to <body>.
          // The header has contain:layout style paint which clips position:fixed children.
          var overlay = target.querySelector('#sidebarOverlay');
          var sidebar = target.querySelector('#mobileSidebar');
          if (overlay) document.body.appendChild(overlay);
          if (sidebar) document.body.appendChild(sidebar);
          setTimeout(renderHeaderLinks, 10);
        }
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function renderHeaderLinks() {
    var desktop = document.getElementById('desktopNavLinks');
    var mobilePrimary = document.getElementById('mobilePrimaryLinks');
    var mobileUtility = document.getElementById('mobileUtilityLinks');

    if (!desktop || !mobilePrimary || !mobileUtility) {
      setTimeout(renderHeaderLinks, 100);
      return;
    }

    desktop.innerHTML = '';
    mobilePrimary.innerHTML = '';
    mobileUtility.innerHTML = '';

    primaryLinks.forEach(function (l) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = l.href;
      a.className = isActive(l.href) ? 'active' : '';
      a.textContent = l.label;
      li.appendChild(a);
      desktop.appendChild(li);
    });

    var ctaLi = document.createElement('li');
    var ctaA = document.createElement('a');
    ctaA.href = '/geo-tag-editor/';
    ctaA.className = 'nav-cta';
    ctaA.textContent = 'Try Free Tool';
    ctaLi.appendChild(ctaA);
    desktop.appendChild(ctaLi);

    primaryLinks.forEach(function (l) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = l.href;
      a.className = isActive(l.href) ? 'active' : '';
      a.innerHTML = l.icon + '<span>' + l.label + '</span>';
      li.appendChild(a);
      mobilePrimary.appendChild(li);
    });

    utilityLinks.forEach(function (l) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = l.href;
      a.className = isActive(l.href) ? 'active' : '';
      a.innerHTML = l.icon + '<span>' + l.label + '</span>';
      li.appendChild(a);
      mobileUtility.appendChild(li);
    });
  }

  function setupHeaderInteractions() {
    var hamburger = document.getElementById('hamburger');
    var sidebar = document.getElementById('mobileSidebar');
    var overlay = document.getElementById('sidebarOverlay');
    var closeBtn = document.getElementById('sidebarClose');

    if (!hamburger || !sidebar || !overlay || !closeBtn) return;

    var lastActiveElement = null;

    function getFocusable() {
      return sidebar.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
    }

    function openSidebar() {
      lastActiveElement = document.activeElement;
      sidebar.classList.add('open');
      overlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      sidebar.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sidebar-open');
      var first = getFocusable()[0];
      if (first) first.focus();
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      sidebar.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sidebar-open');
      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeSidebar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
      }
      if (e.key === 'Tab' && sidebar.classList.contains('open')) {
        var focusable = getFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && sidebar.classList.contains('open')) closeSidebar();
    });
  }

  function injectFallbackHeader() {
    var header = document.getElementById('site-header');
    if (!header) return;
    header.innerHTML = '<div class="header-inner"><a href="/" class="logo"><img src="/images/logo.png" alt="' + SITE.name + '" style="height:32px;width:auto"><span>' + SITE.name + '</span></a><nav class="desktop-nav"><ul class="nav-links" id="desktopNavLinks"></ul></nav><button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileSidebar"><span></span><span></span><span></span></button></div>';
    var overlayEl = document.createElement('div');
    overlayEl.className = 'sidebar-overlay';
    overlayEl.id = 'sidebarOverlay';
    document.body.appendChild(overlayEl);
    var sidebarEl = document.createElement('aside');
    sidebarEl.className = 'mobile-sidebar';
    sidebarEl.id = 'mobileSidebar';
    sidebarEl.setAttribute('aria-label', 'Mobile navigation');
    sidebarEl.setAttribute('aria-hidden', 'true');
    sidebarEl.innerHTML = '<div class="sidebar-header"><a href="/" class="logo"><img src="/images/logo.png" alt="' + SITE.name + '" style="height:32px;width:auto"><span>' + SITE.name + '</span></a><button class="sidebar-close" id="sidebarClose" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div><div class="mobile-sidebar-body"><p class="sidebar-section-title">Tools &amp; Guides</p><nav aria-label="Mobile navigation links"><ul class="sidebar-nav" id="mobilePrimaryLinks"></ul></nav><p class="sidebar-section-title">Company &amp; Legal</p><ul class="sidebar-nav sidebar-nav-secondary" id="mobileUtilityLinks"></ul></div><div class="sidebar-cta"><div class="sidebar-actions"><a href="/geo-tag-editor/" class="btn btn-primary sidebar-btn">Open Geo Tag Tool</a><a href="/contact/" class="btn btn-outline sidebar-btn">Contact Us</a></div></div>';
    document.body.appendChild(sidebarEl);
  }

  function injectFallbackFooter() {
    var footer = document.getElementById('site-footer');
    if (!footer) return;
    footer.innerHTML = '<div class="footer-bottom">&copy; <span id="copyright-year"></span> ' + SITE.name + '. All rights reserved.</div>';
  }

  function updateFooterYear() {
    var yearNode = document.getElementById('copyright-year');
    if (yearNode) yearNode.textContent = String(SITE.year);
  }

  function addGlobalSeoSignals() {
    if (!document.querySelector('meta[name="robots"]')) {
      var robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'index,follow,max-image-preview:large';
      document.head.appendChild(robots);
    }

    if (!document.querySelector('meta[name="referrer"]')) {
      var referrer = document.createElement('meta');
      referrer.name = 'referrer';
      referrer.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(referrer);
    }

    if (!document.querySelector('link[rel="canonical"]')) {
      var canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = SITE.domain + window.location.pathname;
      document.head.appendChild(canonical);
    }

    if (!document.querySelector('meta[property="og:url"]')) {
      var ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      ogUrl.content = SITE.domain + window.location.pathname;
      document.head.appendChild(ogUrl);
    }
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

  function injectRelatedPosts() {
    var path = window.location.pathname.replace(/\\/g, '/');
    if (!path.startsWith('/blog/') || path === '/blog/' || document.getElementById('related-posts')) return;
    var article = document.querySelector('.article .container');
    if (!article) return;

    var posts = [
      { href: '/blog/how-to-add-geotag-to-existing-photos/', title: 'How to Add Geotag to Existing Photos', desc: 'Step-by-step guide to add GPS coordinates to existing images.' },
      { href: '/blog/remove-geotag-from-photo/', title: 'How to Remove Geotag from Photo', desc: 'Protect privacy by stripping location metadata before sharing.' },
      { href: '/blog/how-to-remove-metadata-from-images/', title: 'How to Remove Metadata From Images', desc: 'Remove EXIF metadata for privacy and compliance use cases.' },
      { href: '/blog/how-to-check-where-picture-was-taken/', title: 'How to Check Where a Picture Was Taken', desc: 'Learn how to read and verify image GPS data accurately.' },
      { href: '/blog/why-geotagging-matters-for-local-seo/', title: 'Why Geotagging Matters for Local SEO', desc: 'Understand how image geotags can strengthen local rankings.' },
      { href: '/blog/how-to-use-geotagging-to-rank-local-business-2026/', title: 'Use Geotagging to Rank Local Business', desc: 'Advanced strategy for better local visibility and click-through.' }
    ].filter(function (item) { return item.href !== path; }).slice(0, 3);

    var section = document.createElement('section');
    section.className = 'section related-posts';
    section.id = 'related-posts';
    section.innerHTML = `
      <div class="container">
        <div class="section-header">
          <h2>Related Articles</h2>
          <p>Continue with practical guides to improve photo metadata quality and local SEO signals.</p>
        </div>
        <div class="grid-3">
          ${posts.map(function (p) {
            return `<a class="card-link" href="${p.href}"><div class="card"><h3>${p.title}</h3><p>${p.desc}</p></div></a>`;
          }).join('')}
        </div>
      </div>`;
    var footer = document.getElementById('site-footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
  }

  function injectQuickLinks() {
    var path = window.location.pathname.replace(/\\/g, '/');
    var toolPages = ['/add-gps-to-photo-online/', '/remove-geotag-from-photo-online/', '/geo-tag-editor/'];
    if (toolPages.indexOf(path) === -1 || document.getElementById('quick-links-section')) return;
    var main = document.getElementById('main-content');
    if (!main) return;
    var section = document.createElement('section');
    section.className = 'section quick-links-section';
    section.id = 'quick-links-section';
    section.innerHTML = `
      <div class="container">
        <div class="card quick-links">
          <h2>Explore More Resources</h2>
          <p>Use these guides to improve photo privacy, geotag accuracy, and local search performance.</p>
          <div class="quick-links-grid">
            <a href="/blog/how-to-add-location-to-photos-android-iphone/">Add Location on Android & iPhone</a>
            <a href="/blog/how-to-remove-gps-location-data-from-photos/">Remove GPS Location Data</a>
            <a href="/blog/how-to-check-where-picture-was-taken/">Check Where a Picture Was Taken</a>
            <a href="/blog/why-geotagging-matters-for-local-seo/">Geotagging for Local SEO</a>
          </div>
        </div>
      </div>`;
    main.appendChild(section);
  }

  function optimizeImageLoading() {
    document.querySelectorAll('img').forEach(function (img) {
      if (img.closest('.site-header') || img.closest('.hero') || img.closest('.page-hero')) return;
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    injectSkipLink();
    var headerLoaded = await loadPartial('site-header', '/partials/header.html');
    var footerLoaded = await loadPartial('site-footer', '/partials/footer.html');
    if (!headerLoaded) injectFallbackHeader();
    if (!footerLoaded) injectFallbackFooter();
    
    // Wait a bit for the DOM to settle, then render links
    setTimeout(function() {
      renderHeaderLinks();
    }, 50);
    
    setupHeaderInteractions();
    updateFooterYear();
    wrapMain();
    addGlobalSeoSignals();
    injectRelatedPosts();
    injectQuickLinks();
    optimizeImageLoading();
  });

  window.GTP = { 
    showToast, 
    SITE,
    renderHeaderLinks: renderHeaderLinks
  };
})();
