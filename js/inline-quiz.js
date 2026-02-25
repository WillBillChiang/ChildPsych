/* ========================================
   CHILD PSYCHOLOGY COURSE — INLINE-QUIZ.JS
   Lightweight quiz engine for knowledge checks
   embedded within content sections.
   ======================================== */

(function () {
  'use strict';

  var QUIZ_DATA_URL = 'data/quizzes.json';
  var quizData = null;

  /* ------------------------------------------
     LOAD QUIZ DATA
  ------------------------------------------ */
  function loadData(callback) {
    if (quizData) { callback(quizData); return; }
    fetch(QUIZ_DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        quizData = data;
        callback(data);
      })
      .catch(function () {
        /* silently fail — inline quizzes are optional enhancement */
      });
  }

  /* ------------------------------------------
     RENDER A SINGLE INLINE QUIZ
  ------------------------------------------ */
  function renderInlineQuiz(container, question) {
    var html = '';

    html += '<div class="inline-quiz-label">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>';
    html += 'Quick Check';
    html += '</div>';

    html += '<div class="quiz-question">' + question.question + '</div>';
    html += '<div class="quiz-options">';

    question.options.forEach(function (opt) {
      html += '<button class="quiz-option" data-option-id="' + opt.id + '" role="radio" aria-checked="false">';
      html += '<span class="quiz-option-marker">' + opt.id.toUpperCase() + '</span>';
      html += '<span>' + opt.text + '</span>';
      html += '</button>';
    });

    html += '</div>';
    html += '<div class="quiz-feedback" style="display:none;" aria-live="polite"></div>';

    container.innerHTML = html;

    // Wire up click handlers
    var options = container.querySelectorAll('.quiz-option');
    var feedbackEl = container.querySelector('.quiz-feedback');
    var answered = false;

    options.forEach(function (optBtn) {
      optBtn.addEventListener('click', function () {
        if (answered) return;
        answered = true;

        var selectedId = optBtn.getAttribute('data-option-id');
        var isCorrect = selectedId === question.correctAnswer;

        // Mark all options
        options.forEach(function (o) {
          o.style.pointerEvents = 'none';
          var oId = o.getAttribute('data-option-id');
          if (oId === question.correctAnswer) {
            o.classList.add(oId === selectedId ? 'is-correct' : 'is-correct-answer');
          } else if (oId === selectedId) {
            o.classList.add('is-incorrect');
          }
        });

        // Show feedback
        feedbackEl.style.display = '';
        feedbackEl.className = 'quiz-feedback ' + (isCorrect ? 'is-correct' : 'is-incorrect');

        var icon = isCorrect ? '&#10003;' : '&#10007;';
        var title = isCorrect ? 'Correct!' : 'Not quite';
        feedbackEl.innerHTML =
          '<div class="quiz-feedback-title">' + icon + ' ' + title + '</div>' +
          '<p>' + (question.explanation || '') + '</p>';

        // Record XP
        if (window.gamification) {
          window.gamification.recordInteraction('inlineQuiz', isCorrect);
        }
      });

      optBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          optBtn.click();
        }
      });
    });
  }

  /* ------------------------------------------
     INIT: FIND ALL INLINE QUIZ PLACEHOLDERS
     AND POPULATE WITH QUIZ DATA
  ------------------------------------------ */
  function init() {
    var placeholders = document.querySelectorAll('.inline-quiz[data-module][data-section]');
    if (placeholders.length === 0) return;

    loadData(function (data) {
      if (!data || !data.modules) return;

      placeholders.forEach(function (el) {
        var moduleId = el.getAttribute('data-module');
        var sectionId = el.getAttribute('data-section');

        // Find module data
        var moduleData = null;
        for (var i = 0; i < data.modules.length; i++) {
          if (data.modules[i].moduleId === moduleId) {
            moduleData = data.modules[i];
            break;
          }
        }
        if (!moduleData || !moduleData.inlineQuizzes) return;

        // Find inline quiz for this section
        var inlineQuiz = null;
        for (var j = 0; j < moduleData.inlineQuizzes.length; j++) {
          if (moduleData.inlineQuizzes[j].sectionId === sectionId) {
            inlineQuiz = moduleData.inlineQuizzes[j];
            break;
          }
        }
        if (!inlineQuiz || !inlineQuiz.questions || inlineQuiz.questions.length === 0) return;

        // Render first question
        renderInlineQuiz(el, inlineQuiz.questions[0]);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
