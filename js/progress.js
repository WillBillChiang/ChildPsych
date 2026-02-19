/* ========================================
   CHILD PSYCHOLOGY COURSE — PROGRESS.JS
   localStorage-based progress tracking system
   ======================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'childPsych_progress';
  var CURRENT_VERSION = '1.0';

  /* Total sections per module (used for percentage calculations) */
  var MODULE_TOTAL_SECTIONS = {
    module1: 10,
    module2: 10,
    module3: 11,
    module4: 11,
    module5: 12,
    module6: 11,
    module7: 11,
    module8: 13,
    module9: 11,
    module10: 11
  };

  /* ------------------------------------------
     PROGRESS MANAGER CLASS
     Handles all read/write operations for
     course progress data in localStorage.
  ------------------------------------------ */
  function ProgressManager() {
    this.data = this.load();
  }

  /* ------------------------------------------
     createDefault()
     Returns a fresh progress data structure
     with all modules initialized to empty.
  ------------------------------------------ */
  ProgressManager.prototype.createDefault = function () {
    var modules = {};
    for (var i = 1; i <= 10; i++) {
      var moduleKey = 'module' + i;
      modules[moduleKey] = {
        status: 'not-started',        // not-started | in-progress | completed
        sectionsCompleted: [],         // array of section IDs that have been read
        quizScore: null,               // latest quiz score (0-100)
        quizAttempts: 0                // number of quiz attempts
      };
    }

    return {
      version: CURRENT_VERSION,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      modules: modules,
      overallProgress: 0
    };
  };

  /* ------------------------------------------
     markSectionComplete(moduleId, sectionId)
     Adds the sectionId to the module's
     sectionsCompleted array if not already present.
     Updates module status to 'in-progress'.
  ------------------------------------------ */
  ProgressManager.prototype.markSectionComplete = function (moduleId, sectionId) {
    // Ensure the module exists
    if (!this.data.modules[moduleId]) {
      console.warn('[ChildPsych] Unknown module: ' + moduleId);
      return;
    }

    var module = this.data.modules[moduleId];

    // Only add if not already completed
    if (module.sectionsCompleted.indexOf(sectionId) === -1) {
      module.sectionsCompleted.push(sectionId);
    }

    // Update status — at minimum 'in-progress'
    if (module.status === 'not-started') {
      module.status = 'in-progress';
    }

    // Check if module should be auto-completed
    // (all sections done AND quiz passed)
    this._checkModuleCompletion(moduleId);

    this.save();

    // Dispatch a custom event for UI updates
    this._dispatchProgressEvent(moduleId);
  };

  /* ------------------------------------------
     saveQuizScore(moduleId, score)
     Saves the quiz score for a module,
     increments the attempt counter.
     If score >= 70, marks module as 'completed'.
  ------------------------------------------ */
  ProgressManager.prototype.saveQuizScore = function (moduleId, score) {
    if (!this.data.modules[moduleId]) {
      console.warn('[ChildPsych] Unknown module: ' + moduleId);
      return;
    }

    var module = this.data.modules[moduleId];
    module.quizScore = score;
    module.quizAttempts += 1;

    // Mark as completed if passing score
    if (score >= 70) {
      module.status = 'completed';
    } else if (module.status === 'not-started') {
      module.status = 'in-progress';
    }

    this.save();

    // Dispatch a custom event for UI updates
    this._dispatchProgressEvent(moduleId);
  };

  /* ------------------------------------------
     getModuleProgress(moduleId)
     Returns a percentage (0-100) based on
     the sections completed and quiz score.
     Sections count for 70%, quiz for 30%.
  ------------------------------------------ */
  ProgressManager.prototype.getModuleProgress = function (moduleId) {
    if (!this.data.modules[moduleId]) return 0;

    var module = this.data.modules[moduleId];
    var totalSections = MODULE_TOTAL_SECTIONS[moduleId] || 5;

    // Sections weight: 70% of total progress
    var sectionProgress = (module.sectionsCompleted.length / totalSections);
    sectionProgress = Math.min(sectionProgress, 1); // cap at 100%

    // Quiz weight: 30% of total progress (only counts if passed)
    var quizProgress = 0;
    if (module.quizScore !== null && module.quizScore >= 70) {
      quizProgress = 1;
    } else if (module.quizScore !== null) {
      quizProgress = module.quizScore / 100;
    }

    var totalProgress = (sectionProgress * 70) + (quizProgress * 30);
    return Math.round(totalProgress);
  };

  /* ------------------------------------------
     getOverallProgress()
     Returns the average progress across all
     10 modules as a percentage (0-100).
  ------------------------------------------ */
  ProgressManager.prototype.getOverallProgress = function () {
    var total = 0;
    var moduleCount = 0;

    for (var moduleId in this.data.modules) {
      if (this.data.modules.hasOwnProperty(moduleId)) {
        total += this.getModuleProgress(moduleId);
        moduleCount++;
      }
    }

    if (moduleCount === 0) return 0;
    return Math.round(total / moduleCount);
  };

  /* ------------------------------------------
     getModuleStatus(moduleId)
     Returns the status string for a module.
  ------------------------------------------ */
  ProgressManager.prototype.getModuleStatus = function (moduleId) {
    if (!this.data.modules[moduleId]) return 'not-started';
    return this.data.modules[moduleId].status;
  };

  /* ------------------------------------------
     getModuleData(moduleId)
     Returns the full data object for a module.
  ------------------------------------------ */
  ProgressManager.prototype.getModuleData = function (moduleId) {
    return this.data.modules[moduleId] || null;
  };

  /* ------------------------------------------
     resetModule(moduleId)
     Resets a single module's progress to default.
  ------------------------------------------ */
  ProgressManager.prototype.resetModule = function (moduleId) {
    if (!this.data.modules[moduleId]) return;

    this.data.modules[moduleId] = {
      status: 'not-started',
      sectionsCompleted: [],
      quizScore: null,
      quizAttempts: 0
    };

    this.save();
    this._dispatchProgressEvent(moduleId);
  };

  /* ------------------------------------------
     resetAll()
     Resets all progress data to defaults.
  ------------------------------------------ */
  ProgressManager.prototype.resetAll = function () {
    this.data = this.createDefault();
    this.save();
    this._dispatchProgressEvent('all');
  };

  /* ------------------------------------------
     save()
     Writes the current progress data to
     localStorage as a JSON string.
  ------------------------------------------ */
  ProgressManager.prototype.save = function () {
    try {
      this.data.lastUpdated = new Date().toISOString();
      this.data.overallProgress = this.getOverallProgress();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[ChildPsych] Could not save progress to localStorage:', e.message);
    }
  };

  /* ------------------------------------------
     load()
     Reads progress data from localStorage.
     Returns the parsed data or creates a new
     default if nothing is found or data is corrupt.
  ------------------------------------------ */
  ProgressManager.prototype.load = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.createDefault();

      var parsed = JSON.parse(raw);

      // Version check — if outdated, migrate or reset
      if (!parsed.version || parsed.version !== CURRENT_VERSION) {
        console.info('[ChildPsych] Progress data version mismatch. Creating fresh data.');
        return this.createDefault();
      }

      // Validate structure — ensure all modules exist
      if (!parsed.modules) return this.createDefault();
      for (var i = 1; i <= 10; i++) {
        var key = 'module' + i;
        if (!parsed.modules[key]) {
          parsed.modules[key] = {
            status: 'not-started',
            sectionsCompleted: [],
            quizScore: null,
            quizAttempts: 0
          };
        }
        // Ensure sectionsCompleted is always an array
        if (!Array.isArray(parsed.modules[key].sectionsCompleted)) {
          parsed.modules[key].sectionsCompleted = [];
        }
      }

      return parsed;
    } catch (e) {
      console.warn('[ChildPsych] Could not load progress from localStorage:', e.message);
      return this.createDefault();
    }
  };

  /* ------------------------------------------
     _checkModuleCompletion(moduleId)
     Internal: checks if all sections are done
     and quiz is passed, then marks as completed.
  ------------------------------------------ */
  ProgressManager.prototype._checkModuleCompletion = function (moduleId) {
    var module = this.data.modules[moduleId];
    if (!module) return;

    var totalSections = MODULE_TOTAL_SECTIONS[moduleId] || 5;
    var allSectionsDone = module.sectionsCompleted.length >= totalSections;
    var quizPassed = module.quizScore !== null && module.quizScore >= 70;

    if (allSectionsDone && quizPassed) {
      module.status = 'completed';
    }
  };

  /* ------------------------------------------
     _dispatchProgressEvent(moduleId)
     Internal: fires a custom event so UI
     components can react to progress changes.
  ------------------------------------------ */
  ProgressManager.prototype._dispatchProgressEvent = function (moduleId) {
    var event;
    try {
      event = new CustomEvent('progressUpdated', {
        detail: {
          moduleId: moduleId,
          overallProgress: this.getOverallProgress(),
          moduleProgress: moduleId !== 'all' ? this.getModuleProgress(moduleId) : null
        }
      });
    } catch (e) {
      // Fallback for older browsers
      event = document.createEvent('CustomEvent');
      event.initCustomEvent('progressUpdated', true, true, {
        moduleId: moduleId,
        overallProgress: this.getOverallProgress()
      });
    }
    document.dispatchEvent(event);
  };

  /* ------------------------------------------
     PROGRESS UI UPDATER
     Updates visual progress indicators on the
     current page based on stored progress data.
  ------------------------------------------ */
  function initProgressUI() {
    if (!window.progressManager) return;

    var pm = window.progressManager;

    /* --- Progress Ring Circles --- */
    /* SVG circle elements with class .progress-ring-fill
       Expected attributes:
         data-module="module1" (or "overall")
         r="<radius>" (the circle radius)
         Standard SVG cx, cy, r attributes
    */
    var rings = document.querySelectorAll('.progress-ring-fill');
    rings.forEach(function (ring) {
      var moduleId = ring.getAttribute('data-module');
      var radius = parseFloat(ring.getAttribute('r')) || 18;
      var circumference = 2 * Math.PI * radius;

      // Set the full circumference as the dash array
      ring.style.strokeDasharray = circumference;

      // Calculate progress
      var progress = 0;
      if (moduleId === 'overall') {
        progress = pm.getOverallProgress();
      } else if (moduleId) {
        progress = pm.getModuleProgress(moduleId);
      }

      // Set the offset (inversely proportional to progress)
      var offset = circumference - (progress / 100) * circumference;
      ring.style.strokeDashoffset = offset;

      // Update any associated text label
      var parentSvg = ring.closest('svg');
      if (parentSvg) {
        var label = parentSvg.parentElement.querySelector('.progress-ring-text');
        if (label) {
          label.textContent = progress + '%';
        }
      }
    });

    /* --- Progress Bars --- */
    /* Elements with class .progress-bar-fill
       Expected attribute: data-module="module1" (or "overall")
    */
    var bars = document.querySelectorAll('.progress-bar-fill');
    bars.forEach(function (bar) {
      var moduleId = bar.getAttribute('data-module');

      var progress = 0;
      if (moduleId === 'overall') {
        progress = pm.getOverallProgress();
      } else if (moduleId) {
        progress = pm.getModuleProgress(moduleId);
      }

      bar.style.width = progress + '%';

      // Update any associated percentage label
      var parent = bar.closest('.progress-bar');
      if (parent) {
        var label = parent.parentElement.querySelector('.progress-bar-text');
        if (label) {
          label.textContent = progress + '%';
        }
      }
    });

    /* --- Module Card Status Badges --- */
    /* Elements with [data-module-status] on module cards */
    var statusBadges = document.querySelectorAll('[data-module-status]');
    statusBadges.forEach(function (badge) {
      var moduleId = badge.getAttribute('data-module-status');
      if (!moduleId) return;

      var status = pm.getModuleStatus(moduleId);
      var progress = pm.getModuleProgress(moduleId);

      // Clear existing status classes
      badge.classList.remove('status-not-started', 'status-in-progress', 'status-completed');
      badge.classList.add('status-' + status);

      // Update badge text
      switch (status) {
        case 'completed':
          badge.textContent = 'Completed';
          break;
        case 'in-progress':
          badge.textContent = progress + '% Complete';
          break;
        default:
          badge.textContent = 'Not Started';
      }
    });

    /* --- Overall Progress Display --- */
    var overallEls = document.querySelectorAll('.overall-progress-value');
    overallEls.forEach(function (el) {
      el.textContent = pm.getOverallProgress() + '%';
    });
  }

  /* ------------------------------------------
     LISTEN FOR PROGRESS UPDATES
     Re-render UI whenever progress changes.
  ------------------------------------------ */
  document.addEventListener('progressUpdated', function () {
    initProgressUI();
  });

  /* ------------------------------------------
     INITIALIZATION
     Create the global ProgressManager instance
     and update the UI on page load.
  ------------------------------------------ */

  // Expose globally so other scripts can use it
  window.progressManager = new ProgressManager();

  // Also expose the UI initializer
  window.initProgressUI = initProgressUI;

  document.addEventListener('DOMContentLoaded', function () {
    initProgressUI();
    console.log('[ChildPsych] Progress system initialized — Overall: ' +
      window.progressManager.getOverallProgress() + '%');
  });

})();
