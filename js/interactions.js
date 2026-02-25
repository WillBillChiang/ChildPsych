/* ========================================
   CHILD PSYCHOLOGY COURSE — INTERACTIONS.JS
   In-content micro-interaction components:
   Think prompts, reveal facts, scenario cards,
   flip cards, tabbed panels, interactive timelines
   ======================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------
     THINK ABOUT IT PROMPTS
     Expandable reflection questions with
     hidden answer reveals.
  ------------------------------------------ */
  function initThinkPrompts() {
    var prompts = document.querySelectorAll('.think-prompt');
    prompts.forEach(function (prompt) {
      var toggle = prompt.querySelector('.think-prompt-toggle');
      var answer = prompt.querySelector('.think-prompt-answer');
      if (!toggle || !answer) return;

      toggle.addEventListener('click', function () {
        var isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isExpanded));
        answer.setAttribute('aria-hidden', String(isExpanded));
        answer.classList.toggle('is-revealed');

        var textEl = toggle.querySelector('.think-prompt-toggle-text');
        if (textEl) {
          textEl.textContent = isExpanded ? 'Reveal Insight' : 'Hide Insight';
        }

        if (!isExpanded && window.gamification) {
          window.gamification.recordInteraction('think');
        }
      });

      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    });
  }

  /* ------------------------------------------
     CLICK-TO-REVEAL FACTS
     Enticing teaser cards that reveal
     surprising answers on click.
  ------------------------------------------ */
  function initRevealFacts() {
    var facts = document.querySelectorAll('.reveal-fact');
    facts.forEach(function (fact) {
      function reveal() {
        if (fact.classList.contains('is-revealed')) return;
        fact.classList.add('is-revealed');
        var back = fact.querySelector('.reveal-fact-back');
        if (back) back.setAttribute('aria-hidden', 'false');

        if (window.gamification) {
          window.gamification.recordInteraction('reveal');
        }
      }

      fact.addEventListener('click', reveal);
      fact.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reveal();
        }
      });

      if (!fact.getAttribute('tabindex')) {
        fact.setAttribute('tabindex', '0');
        fact.setAttribute('role', 'button');
      }
    });
  }

  /* ------------------------------------------
     SCENARIO CARDS
     "What Would You Do?" interactive scenarios
     with multiple choices and feedback.
  ------------------------------------------ */
  function initScenarioCards() {
    var cards = document.querySelectorAll('.scenario-card');
    cards.forEach(function (card) {
      var choices = card.querySelectorAll('.scenario-choice');
      var feedbackEl = card.querySelector('.scenario-card-feedback');
      var answered = false;

      choices.forEach(function (choice) {
        choice.addEventListener('click', function () {
          if (answered) return;
          answered = true;

          choice.classList.add('is-selected');
          choices.forEach(function (c) {
            if (c !== choice) c.classList.add('is-locked');
          });

          var feedback = choice.getAttribute('data-feedback');
          if (feedbackEl && feedback) {
            feedbackEl.innerHTML = '<p>' + feedback + '</p>';
            feedbackEl.setAttribute('aria-hidden', 'false');
            feedbackEl.classList.add('is-visible');
          }

          if (window.gamification) {
            window.gamification.recordInteraction('scenario');
          }
        });

        choice.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choice.click();
          }
        });
      });
    });
  }

  /* ------------------------------------------
     FLIP CARDS
     Key concept cards with CSS 3D flip
     effect revealing definitions.
  ------------------------------------------ */
  function initFlipCards() {
    var cards = document.querySelectorAll('.flip-card');
    cards.forEach(function (card) {
      function toggle() {
        card.classList.toggle('is-flipped');
        var isFlipped = card.classList.contains('is-flipped');
        card.setAttribute('aria-expanded', String(isFlipped));

        if (isFlipped && window.gamification) {
          window.gamification.recordInteraction('flip');
        }
      }

      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      if (!card.getAttribute('tabindex')) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------
     TABBED PANELS
     Content organized into switchable tabs
     for comparisons and dense info.
  ------------------------------------------ */
  function initTabbedPanels() {
    var panels = document.querySelectorAll('.tabbed-panel');
    panels.forEach(function (panel) {
      var tabs = panel.querySelectorAll('.tabbed-panel-tab');
      var contents = panel.querySelectorAll('.tabbed-panel-content');

      function activate(tabId) {
        tabs.forEach(function (t) {
          var isActive = t.getAttribute('data-tab') === tabId;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });
        contents.forEach(function (c) {
          var isActive = c.getAttribute('data-tab-content') === tabId;
          if (isActive) {
            c.removeAttribute('hidden');
          } else {
            c.setAttribute('hidden', '');
          }
        });
      }

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var tabId = tab.getAttribute('data-tab');
          activate(tabId);
        });
      });
    });
  }

  /* ------------------------------------------
     INTERACTIVE TIMELINES
     Enhanced timelines with click-to-expand
     detail panels on each node.
  ------------------------------------------ */
  function initInteractiveTimelines() {
    var items = document.querySelectorAll('.visual-timeline-item.is-expandable');
    items.forEach(function (item) {
      var detail = item.querySelector('.visual-timeline-detail');
      if (!detail) return;

      item.addEventListener('click', function () {
        var wasExpanded = item.classList.contains('is-expanded');

        // Close siblings
        var siblings = item.parentElement.querySelectorAll('.visual-timeline-item.is-expanded');
        siblings.forEach(function (s) {
          s.classList.remove('is-expanded');
        });

        if (!wasExpanded) {
          item.classList.add('is-expanded');
        }
      });
    });
  }

  /* ------------------------------------------
     INIT ALL
  ------------------------------------------ */
  function init() {
    initThinkPrompts();
    initRevealFacts();
    initScenarioCards();
    initFlipCards();
    initTabbedPanels();
    initInteractiveTimelines();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
