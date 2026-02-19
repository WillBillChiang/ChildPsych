/* ========================================
   CHILD PSYCHOLOGY COURSE — ANIMATIONS.JS
   GSAP-based animation system with ScrollTrigger
   ======================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     REDUCED MOTION CHECK
     Respects the user's system preference for
     reduced motion. If enabled, animations are
     skipped and elements shown immediately.
  ------------------------------------------ */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------
     REGISTER GSAP PLUGINS
     ScrollTrigger is required. Draggable is
     optional (used by diagrams.js).
  ------------------------------------------ */
  function registerPlugins() {
    if (typeof gsap === 'undefined') {
      console.warn('[ChildPsych] GSAP not found. Animations disabled.');
      return false;
    }

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    } else if (gsap.ScrollTrigger) {
      // Some CDN builds auto-register
    } else {
      console.warn('[ChildPsych] ScrollTrigger plugin not found. Scroll animations disabled.');
    }

    if (typeof Draggable !== 'undefined') {
      gsap.registerPlugin(Draggable);
    }

    return true;
  }

  /* ------------------------------------------
     SCROLL ANIMATIONS
     Finds all [data-animate] elements and sets
     up GSAP ScrollTrigger animations for each.

     Supported animation types:
       - fade-up:     from y:40, opacity:0
       - fade-in:     from opacity:0
       - slide-left:  from x:-60, opacity:0
       - slide-right: from x:60, opacity:0
       - scale-in:    from scale:0.85, opacity:0
       - stagger:     staggers children with 0.1s delay
  ------------------------------------------ */
  function initScrollAnimations() {
    if (typeof gsap === 'undefined') return;

    var elements = document.querySelectorAll('[data-animate]');
    if (elements.length === 0) return;

    // If reduced motion is preferred, make everything visible immediately
    if (prefersReducedMotion) {
      elements.forEach(function (el) {
        el.classList.add('is-visible');
        gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 });

        // For stagger animations, also reset children
        if (el.getAttribute('data-animate') === 'stagger') {
          var kids = el.children;
          for (var i = 0; i < kids.length; i++) {
            gsap.set(kids[i], { opacity: 1, y: 0 });
          }
        }
      });
      return;
    }

    var isMobile = window.innerWidth < 768;

    elements.forEach(function (el) {
      var animationType = el.getAttribute('data-animate');
      var delay = parseFloat(el.getAttribute('data-animate-delay')) || 0;
      var duration = parseFloat(el.getAttribute('data-animate-duration')) || 0.4;

      // Default "from" properties
      var fromVars = { opacity: 0 };
      var toVars = {
        opacity: 1,
        duration: duration,
        delay: delay,
        ease: 'power2.out',
        onComplete: function () {
          el.classList.add('is-visible');
        }
      };

      switch (animationType) {
        case 'fade-up':
          fromVars.y = isMobile ? 20 : 40;
          toVars.y = 0;
          break;

        case 'fade-in':
          // Only opacity, no transform
          break;

        case 'slide-left':
          fromVars.x = isMobile ? -30 : -60;
          toVars.x = 0;
          break;

        case 'slide-right':
          fromVars.x = isMobile ? 30 : 60;
          toVars.x = 0;
          break;

        case 'scale-in':
          fromVars.scale = 0.85;
          toVars.scale = 1;
          toVars.ease = 'back.out(1.4)';
          break;

        case 'stagger':
          // Stagger children instead of animating the parent
          initStaggerAnimation(el, delay);
          return; // Skip the default ScrollTrigger below

        default:
          // Fallback: simple fade-in
          break;
      }

      // Set up ScrollTrigger for this element
      if (typeof ScrollTrigger !== 'undefined' || (gsap.ScrollTrigger)) {
        toVars.scrollTrigger = {
          trigger: el,
          start: 'top 85%',
          once: true
        };
      }

      gsap.fromTo(el, fromVars, toVars);
    });
  }

  /* ------------------------------------------
     STAGGER ANIMATION
     Animates the children of a [data-animate="stagger"]
     element with a 0.1s delay between each child.
  ------------------------------------------ */
  function initStaggerAnimation(container, delay) {
    var children = container.children;
    if (children.length === 0) return;

    // Set initial state for children
    var isMobile = window.innerWidth < 768;
    gsap.set(children, { opacity: 0, y: isMobile ? 20 : 40 });

    var toVars = {
      opacity: 1,
      y: 0,
      duration: 0.3,
      stagger: 0.075,
      delay: delay,
      ease: 'power2.out',
      onComplete: function () {
        container.classList.add('is-visible');
      }
    };

    if (typeof ScrollTrigger !== 'undefined' || (gsap.ScrollTrigger)) {
      toVars.scrollTrigger = {
        trigger: container,
        start: 'top 85%',
        once: true
      };
    }

    gsap.to(children, toVars);
  }

  /* ------------------------------------------
     COUNTER ANIMATIONS
     Finds all [data-count-to] elements and
     animates their text content from 0 (or a
     specified start) to the target number when
     scrolled into view.
  ------------------------------------------ */
  function initCounterAnimations() {
    if (typeof gsap === 'undefined') return;

    var counters = document.querySelectorAll('[data-count-to]');
    if (counters.length === 0) return;

    counters.forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var start = parseFloat(el.getAttribute('data-count-from')) || 0;
      var duration = parseFloat(el.getAttribute('data-count-duration')) || 1;
      var suffix = el.getAttribute('data-count-suffix') || '';
      var prefix = el.getAttribute('data-count-prefix') || '';
      var decimals = parseInt(el.getAttribute('data-count-decimals'), 10) || 0;

      if (isNaN(target)) return;

      // If reduced motion, show final value immediately
      if (prefersReducedMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }

      // Set initial display value
      el.textContent = prefix + start.toFixed(decimals) + suffix;

      var counterObj = { value: start };

      var tweenVars = {
        value: target,
        duration: duration,
        ease: 'power1.out',
        onUpdate: function () {
          el.textContent = prefix + counterObj.value.toFixed(decimals) + suffix;
        }
      };

      // Use ScrollTrigger if available
      if (typeof ScrollTrigger !== 'undefined' || (gsap.ScrollTrigger)) {
        tweenVars.scrollTrigger = {
          trigger: el,
          start: 'top 85%',
          once: true
        };
      }

      gsap.to(counterObj, tweenVars);
    });
  }

  /* ------------------------------------------
     HERO ANIMATION
     Staggers in the hero section elements in
     sequence: .hero-badge, h1, .hero-subtitle,
     .btn, and .module-card elements.
  ------------------------------------------ */
  function initHeroAnimation() {
    if (typeof gsap === 'undefined') return;

    // Find the hero section
    var hero = document.querySelector('.hero, .module-hero');
    if (!hero) return;

    // If reduced motion, skip the animation
    if (prefersReducedMotion) return;

    // Build the ordered list of elements to animate
    var targets = [];
    var selectors = [
      '.hero-badge, .module-number-badge',
      'h1',
      '.hero-subtitle, .module-hero-subtitle',
      '.btn',
      '.module-card'
    ];

    selectors.forEach(function (selector) {
      var els = hero.querySelectorAll(selector);
      els.forEach(function (el) {
        targets.push(el);
      });
    });

    if (targets.length === 0) return;

    // Set initial state: hidden and shifted down
    gsap.set(targets, { opacity: 0, y: 30 });

    // Create a timeline for sequenced animation
    var tl = gsap.timeline({
      delay: 0.1,
      defaults: {
        duration: 0.35,
        ease: 'back.out(1.7)'
      }
    });

    // Stagger each element in
    targets.forEach(function (target, index) {
      tl.to(target, {
        opacity: 1,
        y: 0
      }, index * 0.06); // 0.06s offset per element
    });
  }

  /* ------------------------------------------
     PARALLAX ELEMENTS
     Adds a subtle parallax scroll effect to
     elements with [data-parallax-speed].
  ------------------------------------------ */
  function initParallax() {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;
    if (window.innerWidth < 768) return;
    if (typeof ScrollTrigger === 'undefined' && !gsap.ScrollTrigger) return;

    var parallaxEls = document.querySelectorAll('[data-parallax-speed]');
    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.5;

      gsap.to(el, {
        y: function () { return speed * 100; },
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  /* ------------------------------------------
     SVG PATH DRAWING
     Animates SVG paths with the class
     .svg-draw-path on scroll into view.
  ------------------------------------------ */
  function initPathDrawing() {
    if (typeof gsap === 'undefined') return;

    var paths = document.querySelectorAll('.svg-draw-path');
    if (paths.length === 0) return;

    if (prefersReducedMotion) {
      paths.forEach(function (path) {
        path.classList.add('is-drawn');
      });
      return;
    }

    paths.forEach(function (path) {
      // Calculate and set path length
      var length = path.getTotalLength ? path.getTotalLength() : 1000;
      path.style.setProperty('--path-length', length);
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;

      var tweenVars = {
        strokeDashoffset: 0,
        duration: 1,
        ease: 'power2.out',
        onComplete: function () {
          path.classList.add('is-drawn');
        }
      };

      if (typeof ScrollTrigger !== 'undefined' || (gsap.ScrollTrigger)) {
        tweenVars.scrollTrigger = {
          trigger: path,
          start: 'top 85%',
          once: true
        };
      }

      gsap.to(path, tweenVars);
    });
  }

  /* ------------------------------------------
     CUTE HOVER ANIMATIONS
     Adds gentle bounce/pop hover and scroll
     effects to cards, stats, and callouts.
  ------------------------------------------ */
  function initCuteHoverAnimations() {
    if (typeof gsap === 'undefined' || prefersReducedMotion) return;

    // Module cards: gentle bounce on hover
    var cards = document.querySelectorAll('.module-card');
    cards.forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        gsap.to(card, { scale: 1.02, duration: 0.15, ease: 'back.out(2)' });
      });
      card.addEventListener('mouseleave', function() {
        gsap.to(card, { scale: 1, duration: 0.15, ease: 'power2.out' });
      });
    });

    // Stat cards: pop effect on scroll into view
    var statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(function(card) {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 85%',
          once: true,
          onEnter: function() {
            gsap.from(card, { scale: 0.8, opacity: 0, duration: 0.25, ease: 'back.out(2)' });
          }
        });
      }
    });

    // Callouts: gentle entrance on scroll
    var callouts = document.querySelectorAll('.callout');
    callouts.forEach(function(callout) {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.create({
          trigger: callout,
          start: 'top 85%',
          once: true,
          onEnter: function() {
            gsap.from(callout, {
              x: -10, opacity: 0, duration: 0.3,
              ease: 'back.out(1.5)'
            });
          }
        });
      }
    });
  }

  /* ------------------------------------------
     SPARKLE ON CLICK
     Creates small colorful sparkle particles
     when clicking interactive elements.
  ------------------------------------------ */
  function initSparkleOnClick() {
    if (prefersReducedMotion) return;

    document.addEventListener('click', function(e) {
      var target = e.target.closest('.btn, .module-card, .quiz-option, .nav-logo');
      if (!target) return;
      createSparkles(e.clientX, e.clientY, 5);
    });
  }

  function createSparkles(x, y, count) {
    var colors = ['#FF85A3', '#C08ADE', '#FFBE85', '#5CC99B', '#66B3FF'];
    for (var i = 0; i < count; i++) {
      var sparkle = document.createElement('div');
      sparkle.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;' +
        'left:' + x + 'px;top:' + y + 'px;' +
        'width:8px;height:8px;border-radius:50%;' +
        'background:' + colors[Math.floor(Math.random() * colors.length)] + ';';
      document.body.appendChild(sparkle);

      if (typeof gsap !== 'undefined') {
        gsap.to(sparkle, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80 - 30,
          scale: 0,
          opacity: 0,
          duration: 0.3 + Math.random() * 0.15,
          ease: 'power2.out',
          onComplete: function() {
            if (sparkle.parentNode) sparkle.parentNode.removeChild(sparkle);
          }
        });
      } else {
        setTimeout(function() {
          if (sparkle.parentNode) sparkle.parentNode.removeChild(sparkle);
        }, 400);
      }
    }
  }

  /* ------------------------------------------
     INITIALIZATION
     Registers plugins and runs all animation
     init functions on DOMContentLoaded.
  ------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    var gsapAvailable = registerPlugins();
    if (!gsapAvailable) {
      // Fallback: make all [data-animate] elements visible
      document.querySelectorAll('[data-animate]').forEach(function (el) {
        el.classList.add('is-visible');
        el.style.opacity = '1';
      });
      return;
    }

    initScrollAnimations();
    initCounterAnimations();
    initHeroAnimation();
    initParallax();
    initPathDrawing();
    initCuteHoverAnimations();
    initSparkleOnClick();

    console.log('[GrowingMinds] Cute animations initialized! \u2728' +
      (prefersReducedMotion ? ' (reduced motion)' : ''));
  });

})();
