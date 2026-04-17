/**
 * Promotional Ads Component Manager
 * Handles: Sidebar positioning, lazy loading, interactions
 * @namespace GeoTagAds
 */

(function() {
  'use strict';

  const GeoTagAds = {
    config: {
      sidebarSelector: '.ad-sidebar-container',
      iframeSelector: '.ad-iframe-wrapper iframe',
      sidebarSticky: true,
      stickyOffset: 100,
      lazyLoadThreshold: 100,
    },

    /**
     * Initialize all ad components
     */
    init() {
      this.initSidebarPositioning();
      this.initLazyLoadIframes();
      this.initSidebarInteractions();
      this.initResponsiveHandling();
      console.debug('[GeoTagAds] Initialized successfully');
    },

    /**
     * Handle sidebar sticky positioning on scroll
     */
    initSidebarPositioning() {
      const sidebar = document.querySelector(this.config.sidebarSelector);
      if (!sidebar) return;

      const handleScroll = () => {
        if (!this.config.sidebarSticky) return;

        const windowHeight = window.innerHeight;
        const sidebarHeight = sidebar.offsetHeight;
        const maxScroll = document.documentElement.scrollHeight - windowHeight;

        if (maxScroll <= 0) return;

        // Calculate position to keep sidebar within viewport
        const scrollPercent = window.scrollY / maxScroll;
        const maxTop = Math.max(this.config.stickyOffset, 
          maxScroll - sidebarHeight + 150);

        if (window.scrollY > this.config.stickyOffset) {
          sidebar.style.top = Math.min(window.scrollY, maxTop) + 'px';
        } else {
          sidebar.style.top = this.config.stickyOffset + 'px';
        }
      };

      // Debounce scroll event
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // Initial position
      handleScroll();
    },

    /**
     * Implement lazy loading for iframes
     */
    initLazyLoadIframes() {
      const iframes = document.querySelectorAll(`${this.config.iframeSelector}[data-src]`);
      
      if (!iframes.length) return;

      // Check for Intersection Observer support
      if (!('IntersectionObserver' in window)) {
        this.loadAllIframes();
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadIframe(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: this.config.lazyLoadThreshold + 'px'
      });

      iframes.forEach(iframe => observer.observe(iframe));
    },

    /**
     * Load iframe from data-src to src
     */
    loadIframe(iframe) {
      if (!iframe.src && iframe.dataset.src) {
        const wrapper = iframe.closest('.ad-iframe-wrapper');
        if (wrapper) {
          wrapper.classList.add('loading');
        }

        iframe.src = iframe.dataset.src;
        
        iframe.onload = () => {
          if (wrapper) {
            wrapper.classList.remove('loading');
          }
        };

        iframe.onerror = () => {
          if (wrapper) {
            wrapper.classList.remove('loading');
            wrapper.innerHTML = '<p style="padding: 20px; color: #666;">Unable to load preview</p>';
          }
        };
      }
    },

    /**
     * Load all iframes (fallback for no Intersection Observer)
     */
    loadAllIframes() {
      const iframes = document.querySelectorAll(`${this.config.iframeSelector}[data-src]`);
      iframes.forEach(iframe => this.loadIframe(iframe));
    },

    /**
     * Handle sidebar close button and interactions
     */
    initSidebarInteractions() {
      const sidebar = document.querySelector(this.config.sidebarSelector);
      if (!sidebar) return;

      // Close button handler
      const closeBtn = sidebar.querySelector('.ad-sidebar-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.closeSidebar(sidebar);
        });
      }

      // Track CTA button clicks
      const ctaButtons = document.querySelectorAll('.ad-cta-button');
      ctaButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.trackAdClick(btn, e);
        });
      });

      // Sidebar item interactions
      const sidebarItems = sidebar.querySelectorAll('.ad-sidebar-item');
      sidebarItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          this.trackSidebarClick(index);
          
          // If it's a link, navigate
          if (item.href) {
            window.open(item.href, '_blank', 'noopener,noreferrer');
          }
        });

        // Keyboard support
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            item.click();
          }
        });
      });
    },

    /**
     * Close sidebar (for mobile view)
     */
    closeSidebar(sidebar) {
      sidebar.style.display = 'none';
      localStorage.setItem('geoTagAdsSidebarClosed', 'true');
    },

    /**
     * Track ad CTA button clicks for analytics
     */
    trackAdClick(button, event) {
      const adTitle = button.closest('.ad-card-container')?.querySelector('.ad-card-title')?.textContent || 'Unknown';
      const ctaText = button.textContent.trim();

      // Send to analytics if available
      if (window.gtag) {
        gtag('event', 'ad_click', {
          'ad_title': adTitle,
          'cta_text': ctaText,
          'event_label': 'promotional_ad'
        });
      }

      console.debug(`[GeoTagAds] CTA Clicked: ${adTitle} - ${ctaText}`);
    },

    /**
     * Track sidebar ad clicks
     */
    trackSidebarClick(itemIndex) {
      if (window.gtag) {
        gtag('event', 'sidebar_ad_click', {
          'sidebar_item': itemIndex,
          'event_label': 'sidebar_ad'
        });
      }

      console.debug(`[GeoTagAds] Sidebar item clicked: ${itemIndex}`);
    },

    /**
     * Handle responsive breakpoint changes
     */
    initResponsiveHandling() {
      const handleResize = () => {
        const sidebar = document.querySelector(this.config.sidebarSelector);
        if (!sidebar) return;

        // Hide sidebar on mobile
        if (window.innerWidth <= 1024) {
          sidebar.style.display = 'none';
        } else {
          sidebar.style.display = 'flex';
        }
      };

      // Debounce resize
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 250);
      });

      // Initial check
      handleResize();
    },

    /**
     * Method to programmatically show/hide ads
     */
    toggleAds(show = true) {
      const containers = document.querySelectorAll('.ad-card-container, .ad-sidebar-container');
      containers.forEach(container => {
        container.style.display = show ? '' : 'none';
      });
    },

    /**
     * Update ad content dynamically
     */
    updateAdContent(selector, data) {
      const container = document.querySelector(selector);
      if (!container) return;

      if (data.title) {
        const titleElem = container.querySelector('.ad-card-title');
        if (titleElem) titleElem.textContent = data.title;
      }

      if (data.subtitle) {
        const subtitleElem = container.querySelector('.ad-card-subtitle');
        if (subtitleElem) subtitleElem.textContent = data.subtitle;
      }

      if (data.buttonText) {
        const button = container.querySelector('.ad-cta-button');
        if (button) button.textContent = data.buttonText;
      }

      if (data.buttonUrl) {
        const button = container.querySelector('.ad-cta-button');
        if (button) button.href = data.buttonUrl;
      }
    }
  };

  /**
   * Auto-initialize on DOM ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => GeoTagAds.init());
  } else {
    GeoTagAds.init();
  }

  // Export to global scope
  window.GeoTagAds = GeoTagAds;

})();
