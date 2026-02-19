/* ========================================
   CHILD PSYCHOLOGY COURSE — QUIZ ENGINE
   Interactive quiz system with multiple
   question types, feedback, and scoring.
   ======================================== */

(function () {
  'use strict';

  /* ========================================
     QUIZ ENGINE CLASS
     ======================================== */

  /**
   * @param {string} moduleId — e.g. "module1"
   */
  function QuizEngine(moduleId) {
    this.moduleId = moduleId;
    this.container = null;
    this.questions = [];
    this.moduleTitle = '';
    this.passingScore = 70;

    // State
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.score = 0;
    this.isComplete = false;
    this.selectedOptionId = null;
    this.hasChecked = false;

    // Drag-match state
    this.dragSelectedSource = null;
    this.matchedPairs = {};

    // Load quiz data
    this._loadQuizData();
  }

  /* ------------------------------------------
     DATA LOADING
     Fetches quizzes.json, finds the matching
     module, and kicks off first render.
  ------------------------------------------ */
  QuizEngine.prototype._loadQuizData = function () {
    var self = this;

    // Determine the base path to data/quizzes.json relative to the page
    var basePath = this._resolveDataPath();

    fetch(basePath)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load quiz data: ' + response.status);
        return response.json();
      })
      .then(function (data) {
        var moduleData = null;
        for (var i = 0; i < data.modules.length; i++) {
          if (data.modules[i].moduleId === self.moduleId) {
            moduleData = data.modules[i];
            break;
          }
        }

        if (!moduleData) {
          console.error('[QuizEngine] Module not found: ' + self.moduleId);
          self._renderError('Quiz data not found for this module.');
          return;
        }

        self.questions = moduleData.questions;
        self.moduleTitle = moduleData.title;
        self.passingScore = moduleData.passingScore || 70;
        self.answers = new Array(self.questions.length).fill(null);

        // Render the first question
        if (self.container) {
          self.render(self.container);
        }
      })
      .catch(function (err) {
        console.error('[QuizEngine] Error loading quiz data:', err);
        self._renderError('Could not load quiz. Please refresh the page.');
      });
  };

  /**
   * Resolves the path to data/quizzes.json.
   * Works whether the page is at root or in a subdirectory.
   */
  QuizEngine.prototype._resolveDataPath = function () {
    // Check for a data-quiz-path attribute on the container
    if (this.container && this.container.getAttribute('data-quiz-path')) {
      return this.container.getAttribute('data-quiz-path');
    }

    // Default: try common relative paths
    // If there's a <base> tag, use relative from root
    var base = document.querySelector('base[href]');
    if (base) {
      return base.getAttribute('href').replace(/\/$/, '') + '/data/quizzes.json';
    }

    // Detect depth from pathname
    var path = window.location.pathname;
    var segments = path.split('/').filter(function (s) { return s.length > 0 && !s.endsWith('.html'); });

    // If we appear to be in a subdirectory (e.g., /modules/module1.html), go up
    if (segments.length > 0) {
      var prefix = '';
      for (var i = 0; i < segments.length; i++) {
        prefix += '../';
      }
      return prefix + 'data/quizzes.json';
    }

    return 'data/quizzes.json';
  };

  /* ------------------------------------------
     MAIN RENDER
     Entry point: renders the current state
     into the given container element.
  ------------------------------------------ */
  QuizEngine.prototype.render = function (container) {
    this.container = container;

    // If data hasn't loaded yet, show skeleton
    if (this.questions.length === 0) {
      container.innerHTML = this._renderSkeleton();
      return;
    }

    // If quiz is complete, show results
    if (this.isComplete) {
      this.showResults();
      return;
    }

    var question = this.questions[this.currentQuestionIndex];
    var html = '';

    // Header
    html += '<div class="quiz-header">';
    html += '<span class="quiz-progress-text">Question ' +
            (this.currentQuestionIndex + 1) + ' of ' + this.questions.length + '</span>';
    html += '<span class="quiz-progress-text">' + this._escapeHtml(this.moduleTitle) + '</span>';
    html += '</div>';

    // Progress bar
    html += this.renderProgressBar();

    // Question body wrapper (for slide transitions)
    html += '<div class="quiz-body" role="group" aria-labelledby="quiz-question-text">';

    // Question text
    html += '<p class="quiz-question" id="quiz-question-text">' +
            this._escapeHtml(question.question) + '</p>';

    // Render by type
    switch (question.type) {
      case 'multiple-choice':
        html += this.renderMultipleChoice(question);
        break;
      case 'true-false':
        html += this.renderTrueFalse(question);
        break;
      case 'drag-match':
        html += this.renderDragMatch(question);
        break;
      default:
        html += this.renderMultipleChoice(question);
    }

    // Feedback area (hidden until answer is checked)
    html += '<div class="quiz-feedback-area" id="quiz-feedback-area"></div>';

    // Action buttons
    html += '<div class="quiz-actions" style="margin-top: 1.5rem; display: flex; gap: 0.75rem;">';
    html += '<button class="quiz-btn quiz-btn-check" id="quiz-btn-check" disabled ' +
            'aria-label="Check your answer">Check Answer</button>';
    html += '<button class="quiz-btn quiz-btn-next" id="quiz-btn-next" ' +
            'style="display: none;" aria-label="Go to next question">' +
            (this.currentQuestionIndex < this.questions.length - 1 ? 'Next Question' : 'See Results') +
            '</button>';
    html += '</div>';

    html += '</div>'; // .quiz-body

    container.innerHTML = html;

    // Bind events
    this._bindEvents();

    // If this is a drag-match question, initialize drag behavior
    if (question.type === 'drag-match') {
      this._initDragMatch();
    }

    // Animate in
    this._animateIn();
  };

  /* ------------------------------------------
     RENDER: MULTIPLE CHOICE
     Renders MC question with lettered options
     (A, B, C, D). Each option is a clickable
     div with class `quiz-option`.
  ------------------------------------------ */
  QuizEngine.prototype.renderMultipleChoice = function (question) {
    var markers = ['A', 'B', 'C', 'D', 'E', 'F'];
    var html = '<div class="quiz-options" role="radiogroup" aria-label="Answer options">';

    for (var i = 0; i < question.options.length; i++) {
      var opt = question.options[i];
      html += '<div class="quiz-option" data-option-id="' + opt.id + '" ' +
              'role="radio" aria-checked="false" tabindex="0">';
      html += '<span class="quiz-option-marker">' + markers[i] + '</span>';
      html += '<span class="quiz-option-text">' + this._escapeHtml(opt.text) + '</span>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  };

  /* ------------------------------------------
     RENDER: TRUE / FALSE
     Renders as two clickable options.
  ------------------------------------------ */
  QuizEngine.prototype.renderTrueFalse = function (question) {
    var html = '<div class="quiz-options" role="radiogroup" aria-label="True or False">';

    html += '<div class="quiz-option" data-option-id="true" role="radio" aria-checked="false" tabindex="0">';
    html += '<span class="quiz-option-marker">T</span>';
    html += '<span class="quiz-option-text">True</span>';
    html += '</div>';

    html += '<div class="quiz-option" data-option-id="false" role="radio" aria-checked="false" tabindex="0">';
    html += '<span class="quiz-option-marker">F</span>';
    html += '<span class="quiz-option-text">False</span>';
    html += '</div>';

    html += '</div>';
    return html;
  };

  /* ------------------------------------------
     RENDER: DRAG MATCH
     Two columns — draggable source items on
     left, drop zone targets on right.
     Falls back to click-to-select matching.
  ------------------------------------------ */
  QuizEngine.prototype.renderDragMatch = function (question) {
    var html = '<div class="drag-match-container">';

    // Source column
    html += '<div class="drag-match-sources">';
    html += '<div class="drag-match-label">Items</div>';
    var shuffledSources = this._shuffle(question.sources.slice());
    for (var i = 0; i < shuffledSources.length; i++) {
      var src = shuffledSources[i];
      html += '<div class="drag-item" data-source-id="' + src.id + '" tabindex="0">' +
              this._escapeHtml(src.text) + '</div>';
    }
    html += '</div>';

    // Target column
    html += '<div class="drag-match-targets">';
    html += '<div class="drag-match-label">Match To</div>';
    for (var j = 0; j < question.targets.length; j++) {
      var tgt = question.targets[j];
      html += '<div class="drop-zone" data-target-id="' + tgt.id + '" tabindex="0">';
      html += '<span class="drop-zone-label">' + this._escapeHtml(tgt.text) + '</span>';
      html += '<span class="drop-zone-matched" style="display:none;"></span>';
      html += '</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  };

  /* ------------------------------------------
     RENDER: PROGRESS BAR
     Segmented progress bar, one segment
     per question. Shows correct/incorrect/current.
  ------------------------------------------ */
  QuizEngine.prototype.renderProgressBar = function () {
    var html = '<div class="quiz-progress-bar" role="progressbar" ' +
               'aria-valuenow="' + (this.currentQuestionIndex + 1) + '" ' +
               'aria-valuemin="1" aria-valuemax="' + this.questions.length + '">';

    for (var i = 0; i < this.questions.length; i++) {
      var segClass = 'quiz-progress-segment';
      if (i < this.currentQuestionIndex) {
        // Already answered
        if (this.answers[i] && this.answers[i].correct) {
          segClass += ' is-correct';
        } else if (this.answers[i]) {
          segClass += ' is-incorrect';
        }
      } else if (i === this.currentQuestionIndex) {
        segClass += ' is-current';
      }
      html += '<div class="' + segClass + '"></div>';
    }

    html += '</div>';
    return html;
  };

  /* ------------------------------------------
     RENDER: SKELETON (Loading State)
  ------------------------------------------ */
  QuizEngine.prototype._renderSkeleton = function () {
    var html = '<div class="quiz-container" style="max-width:700px;margin:0 auto;padding:2rem 0;">';
    html += '<div class="skeleton" style="height:20px;width:40%;margin-bottom:1.5rem;"></div>';
    html += '<div class="skeleton" style="height:4px;width:100%;margin-bottom:2rem;"></div>';
    html += '<div class="skeleton" style="height:28px;width:90%;margin-bottom:1.5rem;"></div>';
    for (var i = 0; i < 4; i++) {
      html += '<div class="skeleton" style="height:52px;width:100%;margin-bottom:0.75rem;"></div>';
    }
    html += '</div>';
    return html;
  };

  /* ------------------------------------------
     RENDER: ERROR
  ------------------------------------------ */
  QuizEngine.prototype._renderError = function (message) {
    if (!this.container) return;
    this.container.innerHTML =
      '<div style="text-align:center;padding:3rem;">' +
      '<p style="color:var(--error);font-weight:600;font-size:var(--text-lg);">' +
      this._escapeHtml(message) + '</p>' +
      '<button class="quiz-btn quiz-btn-check" onclick="location.reload()" ' +
      'style="margin-top:1rem;">Retry</button>' +
      '</div>';
  };

  /* ------------------------------------------
     EVENT BINDING
     Wires up click/keyboard handlers after
     each render cycle.
  ------------------------------------------ */
  QuizEngine.prototype._bindEvents = function () {
    var self = this;
    var question = this.questions[this.currentQuestionIndex];

    // Option selection (MC and TF)
    if (question.type !== 'drag-match') {
      var options = this.container.querySelectorAll('.quiz-option');
      options.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (self.hasChecked) return; // locked after checking
          self.selectOption(opt.getAttribute('data-option-id'));
        });
        opt.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (self.hasChecked) return;
            self.selectOption(opt.getAttribute('data-option-id'));
          }
        });
      });
    }

    // Check Answer button
    var checkBtn = this.container.querySelector('#quiz-btn-check');
    if (checkBtn) {
      checkBtn.addEventListener('click', function () {
        self.checkAnswer();
      });
    }

    // Next Question button
    var nextBtn = this.container.querySelector('#quiz-btn-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        self.nextQuestion();
      });
    }
  };

  /* ------------------------------------------
     SELECT OPTION
     Highlights the selected option and
     enables the "Check Answer" button.
  ------------------------------------------ */
  QuizEngine.prototype.selectOption = function (optionId) {
    if (this.hasChecked) return;

    this.selectedOptionId = optionId;

    // Update visual state
    var options = this.container.querySelectorAll('.quiz-option');
    options.forEach(function (opt) {
      var id = opt.getAttribute('data-option-id');
      if (id === optionId) {
        opt.classList.add('is-selected');
        opt.setAttribute('aria-checked', 'true');
        if (typeof gsap !== 'undefined') {
          gsap.from(opt, { scale: 0.95, duration: 0.1, ease: 'back.out(3)' });
        }
      } else {
        opt.classList.remove('is-selected');
        opt.setAttribute('aria-checked', 'false');
      }
    });

    // Enable check button
    var checkBtn = this.container.querySelector('#quiz-btn-check');
    if (checkBtn) {
      checkBtn.disabled = false;
    }
  };

  /* ------------------------------------------
     CHECK ANSWER
     Compares selected answer to correct answer.
     Shows feedback with explanation.
  ------------------------------------------ */
  QuizEngine.prototype.checkAnswer = function () {
    if (this.hasChecked) return;

    var question = this.questions[this.currentQuestionIndex];
    var isCorrect = false;

    // Determine correctness based on question type
    if (question.type === 'drag-match') {
      isCorrect = this._checkDragMatch(question);
    } else if (question.type === 'true-false') {
      var selectedBool = this.selectedOptionId === 'true';
      isCorrect = selectedBool === question.correctAnswer;
    } else {
      // multiple-choice
      isCorrect = this.selectedOptionId === question.correctAnswer;
    }

    this.hasChecked = true;

    // Record answer
    this.answers[this.currentQuestionIndex] = {
      selected: question.type === 'drag-match' ? this.matchedPairs : this.selectedOptionId,
      correct: isCorrect
    };

    // Update score
    if (isCorrect) {
      this.score++;
    }

    // Update options visual state
    if (question.type !== 'drag-match') {
      this._showOptionFeedback(question, isCorrect);
    }

    // Show feedback panel
    this._showFeedback(question, isCorrect);

    // Update progress bar segment
    this._updateProgressSegment(isCorrect);

    // Swap buttons: hide Check, show Next
    var checkBtn = this.container.querySelector('#quiz-btn-check');
    var nextBtn = this.container.querySelector('#quiz-btn-next');
    if (checkBtn) checkBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = '';
  };

  /* ------------------------------------------
     SHOW OPTION FEEDBACK
     Marks correct/incorrect options visually
     after checking the answer.
  ------------------------------------------ */
  QuizEngine.prototype._showOptionFeedback = function (question, isCorrect) {
    var self = this;
    var options = this.container.querySelectorAll('.quiz-option');
    var correctId;

    if (question.type === 'true-false') {
      correctId = question.correctAnswer ? 'true' : 'false';
    } else {
      correctId = question.correctAnswer;
    }

    options.forEach(function (opt) {
      var id = opt.getAttribute('data-option-id');
      opt.style.pointerEvents = 'none'; // lock all options

      if (id === self.selectedOptionId) {
        if (isCorrect) {
          opt.classList.remove('is-selected');
          opt.classList.add('is-correct');
          // Replace marker with checkmark
          var marker = opt.querySelector('.quiz-option-marker');
          if (marker) marker.innerHTML = '&#10003;';
        } else {
          opt.classList.remove('is-selected');
          opt.classList.add('is-incorrect');
          // Replace marker with X
          var marker = opt.querySelector('.quiz-option-marker');
          if (marker) marker.innerHTML = '&#10007;';
          // CSS shake animation
          self._shakeElement(opt);
        }
      }

      // Always highlight the correct answer
      if (id === correctId && !isCorrect) {
        opt.classList.add('is-correct-answer');
        var marker = opt.querySelector('.quiz-option-marker');
        if (marker) {
          marker.innerHTML = '&#10003;';
          marker.style.borderColor = 'var(--success)';
          marker.style.color = 'var(--success)';
        }
      }
    });
  };

  /* ------------------------------------------
     SHOW FEEDBACK
     Displays an explanation panel below the
     question with correct/incorrect styling.
  ------------------------------------------ */
  QuizEngine.prototype._showFeedback = function (question, isCorrect) {
    var feedbackArea = this.container.querySelector('#quiz-feedback-area');
    if (!feedbackArea) return;

    var html = '<div class="quiz-feedback ' + (isCorrect ? 'is-correct' : 'is-incorrect') + '" ' +
               'role="alert" style="opacity:0;transform:translateY(10px);transition:all 0.15s var(--ease-out);">';

    html += '<div class="quiz-feedback-title">';
    if (isCorrect) {
      html += '<span>&#10003;</span> \u2728 Correct!';
    } else {
      html += '<span>&#10007;</span> Not Quite';
    }
    html += '</div>';

    html += '<p>' + this._escapeHtml(question.explanation) + '</p>';
    html += '</div>';

    feedbackArea.innerHTML = html;

    // Animate feedback in
    requestAnimationFrame(function () {
      var panel = feedbackArea.querySelector('.quiz-feedback');
      if (panel) {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }
    });
  };

  /* ------------------------------------------
     UPDATE PROGRESS SEGMENT
     Updates the current progress bar segment
     to reflect correct/incorrect.
  ------------------------------------------ */
  QuizEngine.prototype._updateProgressSegment = function (isCorrect) {
    var segments = this.container.querySelectorAll('.quiz-progress-segment');
    var seg = segments[this.currentQuestionIndex];
    if (!seg) return;

    seg.classList.remove('is-current');
    seg.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
  };

  /* ------------------------------------------
     NEXT QUESTION
     Advances to the next question with a
     slide-out / slide-in transition.
  ------------------------------------------ */
  QuizEngine.prototype.nextQuestion = function () {
    var self = this;

    // Check if that was the last question
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      this.isComplete = true;
      this._animateOut(function () {
        self.showResults();
      });
      return;
    }

    // Reset per-question state
    this.currentQuestionIndex++;
    this.selectedOptionId = null;
    this.hasChecked = false;
    this.dragSelectedSource = null;
    this.matchedPairs = {};

    // Slide transition
    this._animateOut(function () {
      self.render(self.container);
    });
  };

  /* ------------------------------------------
     SHOW RESULTS
     Displays final score with animated counter,
     pass/fail message, and retry button.
  ------------------------------------------ */
  QuizEngine.prototype.showResults = function () {
    var self = this;
    var scorePercent = Math.round((this.score / this.questions.length) * 100);
    var isPassing = scorePercent >= this.passingScore;

    // Save score via progressManager
    if (window.progressManager && typeof window.progressManager.saveQuizScore === 'function') {
      window.progressManager.saveQuizScore(this.moduleId, scorePercent);
    }

    var html = '<div class="quiz-results">';

    // Animated score
    html += '<div class="quiz-results-score ' + (isPassing ? 'is-passing' : 'is-failing') + '" ' +
            'id="quiz-score-counter" aria-live="polite">0%</div>';

    // Label
    html += '<div class="quiz-results-label">';
    if (isPassing) {
      html += 'Excellent! You passed this module quiz.';
    } else {
      html += 'You need ' + this.passingScore + '% to pass. Keep learning!';
    }
    html += '</div>';

    // Score breakdown
    html += '<p style="color:var(--neutral-500);font-size:var(--text-sm);margin-bottom:2rem;">' +
            'You got ' + this.score + ' out of ' + this.questions.length + ' questions correct.</p>';

    // Buttons
    html += '<div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">';
    html += '<button class="quiz-btn quiz-btn-check" id="quiz-btn-retry" aria-label="Retry quiz">Try Again</button>';
    html += '</div>';

    html += '</div>';

    this.container.innerHTML = html;

    // Bind retry button
    var retryBtn = this.container.querySelector('#quiz-btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        self.retry();
      });
    }

    // Animate counter
    this._animateCounter(0, scorePercent, 600);

    // Animate the results panel in
    var resultsEl = this.container.querySelector('.quiz-results');
    if (resultsEl) {
      resultsEl.style.opacity = '0';
      resultsEl.style.transform = 'translateY(20px)';
      resultsEl.style.transition = 'all 0.25s var(--ease-out)';
      requestAnimationFrame(function () {
        resultsEl.style.opacity = '1';
        resultsEl.style.transform = 'translateY(0)';
      });
    }

    // Celebrate if passing
    if (isPassing) {
      self._celebratePass();
    }
  };

  /* ------------------------------------------
     RETRY
     Resets quiz state and re-renders from
     question 1.
  ------------------------------------------ */
  QuizEngine.prototype.retry = function () {
    this.currentQuestionIndex = 0;
    this.answers = new Array(this.questions.length).fill(null);
    this.score = 0;
    this.isComplete = false;
    this.selectedOptionId = null;
    this.hasChecked = false;
    this.dragSelectedSource = null;
    this.matchedPairs = {};

    this.render(this.container);
  };

  /* ------------------------------------------
     CELEBRATE PASS
     Emoji confetti effect when user passes quiz.
  ------------------------------------------ */
  QuizEngine.prototype._celebratePass = function() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var emojis = ['\u2728', '\u2B50', '\uD83C\uDF89', '\uD83D\uDC9C', '\uD83C\uDF1F', '\uD83C\uDF8A'];
    var container = this.container;
    var rect = container.getBoundingClientRect();

    for (var i = 0; i < 30; i++) {
      (function(index) {
        setTimeout(function() {
          var particle = document.createElement('div');
          particle.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;font-size:' +
            (12 + Math.random() * 16) + 'px;' +
            'left:' + (rect.left + Math.random() * rect.width) + 'px;' +
            'top:' + (rect.top - 20) + 'px;';
          particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          document.body.appendChild(particle);

          if (typeof gsap !== 'undefined') {
            gsap.to(particle, {
              y: 120 + Math.random() * 200,
              x: (Math.random() - 0.5) * 100,
              rotation: Math.random() * 360,
              opacity: 0,
              duration: 0.75 + Math.random() * 0.5,
              ease: 'power2.out',
              onComplete: function() {
                if (particle.parentNode) particle.parentNode.removeChild(particle);
              }
            });
          } else {
            setTimeout(function() {
              if (particle.parentNode) particle.parentNode.removeChild(particle);
            }, 1000);
          }
        }, index * 25);
      })(i);
    }
  };

  /* ========================================
     DRAG-MATCH HELPERS
     ======================================== */

  /**
   * Initializes drag-match interaction.
   * Uses GSAP Draggable if available, otherwise
   * falls back to click-to-select matching.
   */
  QuizEngine.prototype._initDragMatch = function () {
    var self = this;
    var question = this.questions[this.currentQuestionIndex];

    // Reset match state
    this.matchedPairs = {};
    this.dragSelectedSource = null;

    var sources = this.container.querySelectorAll('.drag-item');
    var targets = this.container.querySelectorAll('.drop-zone');

    // On small screens, prefer click-to-select over drag for better touch UX
    if (window.innerWidth <= 640) {
      this._initClickMatch(sources, targets, question);
    } else if (window.gsap && window.Draggable) {
      this._initGSAPDrag(sources, targets, question);
    } else {
      // Click-to-select fallback
      this._initClickMatch(sources, targets, question);
    }
  };

  /**
   * GSAP Draggable initialization.
   */
  QuizEngine.prototype._initGSAPDrag = function (sources, targets, question) {
    var self = this;

    sources.forEach(function (srcEl) {
      var sourceId = srcEl.getAttribute('data-source-id');

      Draggable.create(srcEl, {
        type: 'x,y',
        bounds: self.container,
        onDragStart: function () {
          srcEl.classList.add('is-dragging');
        },
        onDrag: function () {
          // Highlight overlapping drop zones
          targets.forEach(function (tgtEl) {
            if (self._isOverlapping(srcEl, tgtEl)) {
              tgtEl.classList.add('is-highlight');
            } else {
              tgtEl.classList.remove('is-highlight');
            }
          });
        },
        onDragEnd: function () {
          srcEl.classList.remove('is-dragging');

          // Find the drop zone we landed on
          var matched = false;
          targets.forEach(function (tgtEl) {
            tgtEl.classList.remove('is-highlight');

            if (self._isOverlapping(srcEl, tgtEl)) {
              var targetId = tgtEl.getAttribute('data-target-id');

              // Record match
              self.matchedPairs[sourceId] = targetId;
              srcEl.classList.add('is-matched');
              tgtEl.classList.add('is-matched');

              // Show matched text in drop zone
              var matchedSpan = tgtEl.querySelector('.drop-zone-matched');
              if (matchedSpan) {
                matchedSpan.textContent = srcEl.textContent;
                matchedSpan.style.display = '';
              }

              matched = true;
            }
          });

          // Snap back if not dropped on target
          gsap.to(srcEl, {
            x: 0,
            y: 0,
            duration: 0.15,
            ease: 'power2.out'
          });

          // Enable check button if all pairs matched
          self._checkDragMatchReady(question);
        }
      });
    });
  };

  /**
   * Click-to-select fallback for drag matching.
   */
  QuizEngine.prototype._initClickMatch = function (sources, targets, question) {
    var self = this;

    sources.forEach(function (srcEl) {
      srcEl.addEventListener('click', function () {
        if (self.hasChecked) return;
        if (srcEl.classList.contains('is-matched')) return;

        // Deselect previous
        sources.forEach(function (s) { s.classList.remove('is-selected'); });
        srcEl.classList.add('is-selected');
        self.dragSelectedSource = srcEl.getAttribute('data-source-id');

        // Highlight targets
        targets.forEach(function (t) {
          if (!t.classList.contains('is-matched')) {
            t.classList.add('is-highlight');
          }
        });
      });

      srcEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          srcEl.click();
        }
      });
    });

    targets.forEach(function (tgtEl) {
      tgtEl.addEventListener('click', function () {
        if (self.hasChecked) return;
        if (!self.dragSelectedSource) return;
        if (tgtEl.classList.contains('is-matched')) return;

        var sourceId = self.dragSelectedSource;
        var targetId = tgtEl.getAttribute('data-target-id');

        // Record match
        self.matchedPairs[sourceId] = targetId;

        // Visual updates
        var srcEl = self.container.querySelector('.drag-item[data-source-id="' + sourceId + '"]');
        if (srcEl) {
          srcEl.classList.remove('is-selected');
          srcEl.classList.add('is-matched');
        }
        tgtEl.classList.remove('is-highlight');
        tgtEl.classList.add('is-matched');

        // Show matched text
        var matchedSpan = tgtEl.querySelector('.drop-zone-matched');
        if (matchedSpan && srcEl) {
          matchedSpan.textContent = srcEl.textContent;
          matchedSpan.style.display = '';
        }

        // Reset selection
        self.dragSelectedSource = null;
        sources.forEach(function (s) { s.classList.remove('is-selected'); });
        targets.forEach(function (t) {
          if (!t.classList.contains('is-matched')) {
            t.classList.remove('is-highlight');
          }
        });

        // Check if all pairs are matched
        self._checkDragMatchReady(question);
      });

      tgtEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tgtEl.click();
        }
      });
    });
  };

  /**
   * Enables Check Answer once all source items are matched.
   */
  QuizEngine.prototype._checkDragMatchReady = function (question) {
    var totalSources = question.sources.length;
    var matchedCount = Object.keys(this.matchedPairs).length;

    if (matchedCount >= totalSources) {
      var checkBtn = this.container.querySelector('#quiz-btn-check');
      if (checkBtn) checkBtn.disabled = false;
    }
  };

  /**
   * Evaluates drag-match correctness.
   * Returns true if all pairs are correctly matched.
   */
  QuizEngine.prototype._checkDragMatch = function (question) {
    var correctPairs = question.correctPairs;
    var allCorrect = true;

    for (var sourceId in correctPairs) {
      if (correctPairs.hasOwnProperty(sourceId)) {
        if (this.matchedPairs[sourceId] !== correctPairs[sourceId]) {
          allCorrect = false;
          break;
        }
      }
    }

    // Visual feedback on pairs
    var self = this;
    for (var sId in this.matchedPairs) {
      if (this.matchedPairs.hasOwnProperty(sId)) {
        var srcEl = this.container.querySelector('.drag-item[data-source-id="' + sId + '"]');
        var tgtId = this.matchedPairs[sId];
        var tgtEl = this.container.querySelector('.drop-zone[data-target-id="' + tgtId + '"]');

        if (correctPairs[sId] === tgtId) {
          if (srcEl) srcEl.style.borderColor = 'var(--success)';
          if (tgtEl) tgtEl.style.borderColor = 'var(--success)';
        } else {
          if (srcEl) {
            srcEl.style.borderColor = 'var(--error)';
            self._shakeElement(srcEl);
          }
          if (tgtEl) tgtEl.style.borderColor = 'var(--error)';
        }
      }
    }

    return allCorrect;
  };

  /**
   * Checks if two elements overlap (for drag-and-drop).
   */
  QuizEngine.prototype._isOverlapping = function (el1, el2) {
    var r1 = el1.getBoundingClientRect();
    var r2 = el2.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
  };

  /* ========================================
     ANIMATION HELPERS
     ======================================== */

  /**
   * Animate quiz body in (slide up + fade).
   */
  QuizEngine.prototype._animateIn = function () {
    var body = this.container.querySelector('.quiz-body');
    if (!body) return;

    body.style.opacity = '0';
    body.style.transform = 'translateX(30px)';
    body.style.transition = 'opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out)';

    requestAnimationFrame(function () {
      body.style.opacity = '1';
      body.style.transform = 'translateX(0)';
    });
  };

  /**
   * Animate quiz body out, then call callback.
   */
  QuizEngine.prototype._animateOut = function (callback) {
    var body = this.container.querySelector('.quiz-body');
    if (!body) {
      if (callback) callback();
      return;
    }

    body.style.transition = 'opacity 0.125s var(--ease-out), transform 0.125s var(--ease-out)';
    body.style.opacity = '0';
    body.style.transform = 'translateX(-30px)';

    setTimeout(function () {
      if (callback) callback();
    }, 130);
  };

  /**
   * CSS shake animation on an element.
   */
  QuizEngine.prototype._shakeElement = function (el) {
    // Inject shake keyframes if not already present
    if (!document.getElementById('quiz-shake-style')) {
      var style = document.createElement('style');
      style.id = 'quiz-shake-style';
      style.textContent =
        '@keyframes quiz-shake {' +
        '0%, 100% { transform: translateX(0); }' +
        '10%, 50%, 90% { transform: translateX(-4px); }' +
        '30%, 70% { transform: translateX(4px); }' +
        '}';
      document.head.appendChild(style);
    }

    el.style.animation = 'quiz-shake 0.25s ease-in-out';
    el.addEventListener('animationend', function handler() {
      el.style.animation = '';
      el.removeEventListener('animationend', handler);
    });
  };

  /**
   * Animates a score counter from startVal to endVal.
   */
  QuizEngine.prototype._animateCounter = function (startVal, endVal, duration) {
    var counterEl = this.container.querySelector('#quiz-score-counter');
    if (!counterEl) return;

    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);

      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(startVal + (endVal - startVal) * eased);
      counterEl.textContent = current + '%';

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  };

  /* ========================================
     UTILITY METHODS
     ======================================== */

  /**
   * Escapes HTML entities for safe insertion.
   */
  QuizEngine.prototype._escapeHtml = function (str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  /**
   * Fisher-Yates shuffle (returns new array).
   */
  QuizEngine.prototype._shuffle = function (arr) {
    var shuffled = arr.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return shuffled;
  };

  /* ========================================
     BUTTON STYLING
     Injects minimal quiz button styles if
     not already defined in the stylesheet.
  ======================================== */
  function injectButtonStyles() {
    if (document.getElementById('quiz-btn-styles')) return;

    var style = document.createElement('style');
    style.id = 'quiz-btn-styles';
    style.textContent =
      '.quiz-btn {' +
      '  display: inline-flex; align-items: center; justify-content: center;' +
      '  padding: 0.75rem 1.75rem;' +
      '  border: none; border-radius: var(--radius-lg, 12px);' +
      '  font-family: var(--font-heading, sans-serif);' +
      '  font-weight: 700; font-size: var(--text-base, 1rem);' +
      '  cursor: pointer; transition: all 0.1s;' +
      '  min-width: 160px;' +
      '}' +
      '.quiz-btn:disabled {' +
      '  opacity: 0.45; cursor: not-allowed;' +
      '}' +
      '.quiz-btn-check {' +
      '  background: var(--primary-500, #8B5CF6); color: white;' +
      '}' +
      '.quiz-btn-check:hover:not(:disabled) {' +
      '  background: var(--primary-600, #9B5BBF);' +
      '  transform: translateY(-1px);' +
      '  box-shadow: 0 4px 12px rgba(155,91,191,0.3);' +
      '}' +
      '.quiz-btn-next {' +
      '  background: var(--secondary-500, #3EB589); color: white;' +
      '}' +
      '.quiz-btn-next:hover {' +
      '  background: var(--secondary-600, #2FA07A);' +
      '  transform: translateY(-1px);' +
      '  box-shadow: 0 4px 12px rgba(20,184,166,0.3);' +
      '}' +
      '.quiz-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }' +
      '.drag-item.is-selected {' +
      '  border-color: var(--primary-500, #8B5CF6);' +
      '  background: var(--primary-50, #FAF5FF);' +
      '  box-shadow: 0 0 0 3px rgba(139,92,246,0.15);' +
      '}' +
      '@media (max-width: 480px) {' +
      '  .quiz-btn { min-width: auto; width: 100%; padding: 0.875rem 1.25rem; }' +
      '  .quiz-actions { flex-direction: column; }' +
      '}';
    document.head.appendChild(style);
  }

  /* ========================================
     AUTO-INITIALIZATION
     On DOMContentLoaded, if a #quiz-container
     exists with a data-module attribute,
     creates a QuizEngine instance.
  ======================================== */
  function autoInit() {
    var container = document.getElementById('quiz-container');
    if (!container) return;

    var moduleId = container.getAttribute('data-module');
    if (!moduleId) {
      console.warn('[QuizEngine] #quiz-container found but missing data-module attribute.');
      return;
    }

    injectButtonStyles();

    var engine = new QuizEngine(moduleId);
    engine.container = container;
    engine.render(container);

    // Expose on the container element for external access
    container.quizEngine = engine;

    // Also expose globally for debugging
    window.quizEngine = engine;

    console.log('[QuizEngine] Initialized for ' + moduleId);
  }

  document.addEventListener('DOMContentLoaded', autoInit);

  // Expose class globally for manual instantiation
  window.QuizEngine = QuizEngine;

})();
