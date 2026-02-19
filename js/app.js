/* ========================================
   CHILD PSYCHOLOGY COURSE — APP.JS
   Global initialization & page-level behaviors
   ======================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     SCROLL PROGRESS BAR
     Updates the width of .scroll-progress
     based on how far the user has scrolled.
  ------------------------------------------ */
  function initScrollProgress() {
    var progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) return;

    function updateProgress() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = scrollPercent + '%';
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress(); // initial call
  }

  /* ------------------------------------------
     NAVBAR SCROLL STATE
     Adds `is-scrolled` class to .main-nav
     when the page is scrolled beyond 60px.
  ------------------------------------------ */
  function initNavbarScroll() {
    var nav = document.querySelector('.main-nav');
    if (!nav) return;

    var threshold = 60;

    function onScroll() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > threshold) {
        nav.classList.add('is-scrolled');
      } else {
        nav.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial call
  }

  /* ------------------------------------------
     PAGE TRANSITIONS
     Intercepts clicks on [data-transition] links.
     Adds `is-exiting` to .page-wrapper, waits
     350ms, then navigates to the href.
  ------------------------------------------ */
  function initPageTransitions() {
    var wrapper = document.querySelector('.page-wrapper');
    if (!wrapper) return;

    // On page load, ensure the wrapper is visible (remove any initial hidden state)
    wrapper.classList.remove('is-exiting');

    // Intercept transition-enabled links
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-transition]');
      if (!link) return;

      var href = link.getAttribute('href');
      // Skip if no href, external link, anchor-only, or modifier keys held
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      e.preventDefault();
      wrapper.classList.add('is-exiting');

      setTimeout(function () {
        window.location.href = href;
      }, 175);
    });
  }

  /* ------------------------------------------
     PAGE ENTRANCE ANIMATION
     On load, ensure .page-wrapper is visible
     by removing any hidden/exiting classes and
     allowing the CSS transition to run.
  ------------------------------------------ */
  function initPageEntrance() {
    var wrapper = document.querySelector('.page-wrapper');
    if (!wrapper) return;

    // Start in a hidden state and animate in
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(20px) scale(0.98)';

    // Force a reflow so the browser registers the initial state
    void wrapper.offsetHeight;

    // Animate in with bounce easing
    wrapper.style.transition = 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';

    requestAnimationFrame(function () {
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translateY(0) scale(1)';
    });
  }

  /* ------------------------------------------
     MOBILE NAV TOGGLE
     Hamburger button opens/closes the
     .mobile-nav-overlay panel.
  ------------------------------------------ */
  function initMobileNav() {
    var hamburger = document.querySelector('.nav-hamburger');
    var overlay = document.querySelector('.mobile-nav-overlay');
    var closeBtn = document.querySelector('.mobile-nav-close');

    if (!hamburger || !overlay) return;

    function openNav() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      hamburger.setAttribute('aria-expanded', 'true');
    }

    function closeNav() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', function () {
      var isOpen = overlay.classList.contains('is-open');
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    // Close button inside the overlay
    if (closeBtn) {
      closeBtn.addEventListener('click', closeNav);
    }

    // Close when clicking the overlay backdrop (not the panel)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeNav();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeNav();
      }
    });

    // Close when a mobile nav link is clicked
    var mobileLinks = overlay.querySelectorAll('.mobile-nav-list a');
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  /* ------------------------------------------
     SECTION COMPLETION TRACKING
     Uses IntersectionObserver to detect when
     a .content-section scrolls past 80% visibility.
     Marks the section as completed via progress.js.
  ------------------------------------------ */
  function initSectionTracking() {
    var sections = document.querySelectorAll('.content-section[data-section-id]');
    if (sections.length === 0) return;

    // Get the current module ID from the page
    var moduleId = document.body.getAttribute('data-module-id') ||
                   document.querySelector('[data-module-id]')?.getAttribute('data-module-id');
    if (!moduleId) return;

    // Track which sections have already been marked complete in this session
    var completedInSession = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
          var sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId && !completedInSession[sectionId]) {
            completedInSession[sectionId] = true;

            // Call progressManager if available (from progress.js)
            if (window.progressManager && typeof window.progressManager.markSectionComplete === 'function') {
              window.progressManager.markSectionComplete(moduleId, sectionId);
            }

            // Add a visual indicator class
            entry.target.classList.add('is-section-read');

            // Stop observing this section
            observer.unobserve(entry.target);
          }
        }
      });
    }, {
      threshold: 0.8
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ------------------------------------------
     ACTIVE NAV LINK HIGHLIGHTING
     Marks the current page link as active
     in the navigation.
  ------------------------------------------ */
  function initActiveNavLinks() {
    var currentPath = window.location.pathname;
    var navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-list a');

    navLinks.forEach(function (link) {
      var linkPath = link.getAttribute('href');
      if (!linkPath) return;

      // Normalize paths for comparison
      var normalizedCurrent = currentPath.replace(/\/$/, '').replace(/\/index\.html$/, '');
      var normalizedLink = linkPath.replace(/\/$/, '').replace(/\/index\.html$/, '');

      if (normalizedCurrent === normalizedLink ||
          (normalizedLink !== '' && currentPath.includes(normalizedLink))) {
        link.classList.add('is-active');
      }
    });
  }

  /* ------------------------------------------
     SMOOTH SCROLL FOR ANCHOR LINKS
     Handles clicks on in-page anchor links
     with smooth scrolling behavior.
  ------------------------------------------ */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;

      var targetId = link.getAttribute('href');
      if (targetId === '#') return;

      var targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Update URL hash without jumping
      if (history.pushState) {
        history.pushState(null, null, targetId);
      }
    });
  }

  /* ------------------------------------------
     INITIALIZATION
     Run all setup functions when the DOM
     is fully loaded and ready.
  ------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    initScrollProgress();
    initNavbarScroll();
    initPageTransitions();
    initPageEntrance();
    initMobileNav();
    initSectionTracking();
    initActiveNavLinks();
    initSmoothScroll();

    // Log initialization for development
    console.log('[ChildPsych] App initialized');
  });

})();
