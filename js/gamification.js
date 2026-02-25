/* ========================================
   CHILD PSYCHOLOGY COURSE — GAMIFICATION.JS
   XP points, badges, streaks, celebrations,
   and interaction tracking.
   ======================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'childPsych_gamification';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------
     XP VALUES
  ------------------------------------------ */
  var XP_VALUES = {
    section: 5,
    think: 10,
    reveal: 5,
    scenario: 15,
    flip: 3,
    inlineQuiz: 20,
    inlineQuizWrong: 5,
    quizQuestion: 10,
    quizPass: 50
  };

  /* XP per level — each level needs more XP */
  var XP_PER_LEVEL = 100;

  /* ------------------------------------------
     BADGE DEFINITIONS
  ------------------------------------------ */
  var BADGES = [
    { id: 'first-steps',   icon: '\uD83D\uDC63', name: 'First Steps',   desc: 'Complete your first module section',   condition: function (d) { return d.interactions.total >= 1; } },
    { id: 'curious-mind',  icon: '\uD83D\uDD0D', name: 'Curious Mind',  desc: 'Interact with 10 learning elements',   condition: function (d) { return d.interactions.total >= 10; } },
    { id: 'quiz-ace',      icon: '\u2B50',        name: 'Quiz Ace',      desc: 'Score 100% on any module quiz',        condition: function (d) { return d.perfectQuiz; } },
    { id: 'deep-thinker',  icon: '\uD83E\uDDE0', name: 'Deep Thinker',  desc: 'Answer 5 Think About It prompts',      condition: function (d) { return d.interactions.think >= 5; } },
    { id: 'fact-finder',   icon: '\uD83D\uDCA1', name: 'Fact Finder',   desc: 'Reveal 10 hidden facts',               condition: function (d) { return d.interactions.reveal >= 10; } },
    { id: 'streak-3',      icon: '\uD83D\uDD25', name: 'On Fire',       desc: 'Learn 3 days in a row',                condition: function (d) { return d.streak.current >= 3; } },
    { id: 'streak-7',      icon: '\uD83C\uDF1F', name: 'Streak Master', desc: 'Learn 7 days in a row',                condition: function (d) { return d.streak.current >= 7; } },
    { id: 'explorer',      icon: '\uD83E\uDDED', name: 'Explorer',      desc: 'Visit all 10 modules',                 condition: function (d) { return d.modulesVisited.length >= 10; } }
  ];

  /* ------------------------------------------
     GAMIFICATION MANAGER CLASS
  ------------------------------------------ */
  function GamificationManager() {
    this.data = this.load();
    this.updateStreak();
    this.toastEl = null;
    this.xpBarEl = null;
    this.pendingToasts = [];
    this.toastShowing = false;
  }

  /* ------------------------------------------
     DATA PERSISTENCE
  ------------------------------------------ */
  GamificationManager.prototype.createDefault = function () {
    return {
      xp: 0,
      level: 1,
      streak: { current: 0, lastDate: null, longest: 0 },
      badges: {},
      interactions: { think: 0, reveal: 0, scenario: 0, flip: 0, inlineQuiz: 0, total: 0 },
      modulesVisited: [],
      perfectQuiz: false
    };
  };

  GamificationManager.prototype.load = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Merge with defaults for forward compat
        var defaults = this.createDefault();
        for (var k in defaults) {
          if (!(k in parsed)) parsed[k] = defaults[k];
        }
        if (!parsed.interactions.total) parsed.interactions.total = 0;
        return parsed;
      }
    } catch (e) { /* ignore */ }
    return this.createDefault();
  };

  GamificationManager.prototype.save = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* ignore */ }
  };

  /* ------------------------------------------
     STREAK TRACKING
  ------------------------------------------ */
  GamificationManager.prototype.updateStreak = function () {
    var today = new Date().toISOString().split('T')[0];
    var last = this.data.streak.lastDate;

    if (last === today) return; // already counted today

    if (last) {
      var lastDate = new Date(last);
      var todayDate = new Date(today);
      var diff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        this.data.streak.current += 1;
      } else if (diff > 1) {
        this.data.streak.current = 1;
      }
    } else {
      this.data.streak.current = 1;
    }

    this.data.streak.lastDate = today;
    if (this.data.streak.current > this.data.streak.longest) {
      this.data.streak.longest = this.data.streak.current;
    }
    this.save();
    this.checkBadges();
  };

  /* ------------------------------------------
     MODULE VISIT TRACKING
  ------------------------------------------ */
  GamificationManager.prototype.trackModuleVisit = function () {
    var moduleId = document.body.getAttribute('data-module-id');
    if (!moduleId) return;
    if (this.data.modulesVisited.indexOf(moduleId) === -1) {
      this.data.modulesVisited.push(moduleId);
      this.save();
      this.checkBadges();
    }
  };

  /* ------------------------------------------
     XP MANAGEMENT
  ------------------------------------------ */
  GamificationManager.prototype.addXP = function (amount, sourceEl) {
    this.data.xp += amount;

    var newLevel = Math.floor(this.data.xp / XP_PER_LEVEL) + 1;
    var leveledUp = newLevel > this.data.level;
    this.data.level = newLevel;

    this.save();
    this.updateXPBar();

    if (sourceEl && !prefersReducedMotion) {
      this.showXPPopup(amount, sourceEl);
    }

    if (leveledUp) {
      this.showToast('\uD83C\uDF89', 'Level Up!', 'You reached level ' + newLevel + '!');
    }
  };

  GamificationManager.prototype.showXPPopup = function (amount, sourceEl) {
    var popup = document.createElement('div');
    popup.className = 'xp-popup animate-xp-float';
    popup.textContent = '+' + amount + ' XP';

    var rect = sourceEl.getBoundingClientRect();
    popup.style.left = (rect.left + rect.width / 2) + 'px';
    popup.style.top = (rect.top + window.scrollY - 10) + 'px';

    document.body.appendChild(popup);
    setTimeout(function () {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 1000);
  };

  /* ------------------------------------------
     INTERACTION RECORDING
  ------------------------------------------ */
  GamificationManager.prototype.recordInteraction = function (type, extra) {
    if (this.data.interactions[type] !== undefined) {
      this.data.interactions[type] += 1;
    }
    this.data.interactions.total += 1;

    var xp = 0;
    if (type === 'inlineQuiz') {
      xp = extra ? XP_VALUES.inlineQuiz : XP_VALUES.inlineQuizWrong;
    } else if (XP_VALUES[type]) {
      xp = XP_VALUES[type];
    }

    this.save();
    if (xp > 0) {
      this.addXP(xp);
    }
    this.checkBadges();
  };

  /* ------------------------------------------
     QUIZ COMPLETION HOOK
  ------------------------------------------ */
  GamificationManager.prototype.onQuizComplete = function (score, totalQuestions, correctCount) {
    var xp = (correctCount * XP_VALUES.quizQuestion);
    if (score >= 70) xp += XP_VALUES.quizPass;
    if (score === 100) this.data.perfectQuiz = true;

    this.save();
    this.addXP(xp);
    this.checkBadges();
  };

  /* ------------------------------------------
     BADGE CHECKING
  ------------------------------------------ */
  GamificationManager.prototype.checkBadges = function () {
    var self = this;
    BADGES.forEach(function (badge) {
      if (self.data.badges[badge.id]) return; // already earned
      if (badge.condition(self.data)) {
        self.data.badges[badge.id] = { earned: true, earnedAt: new Date().toISOString() };
        self.save();
        self.showToast(badge.icon, badge.name + ' Earned!', badge.desc);
        self.updateBadgeGallery();
      }
    });
  };

  /* ------------------------------------------
     TOAST NOTIFICATIONS
  ------------------------------------------ */
  GamificationManager.prototype.ensureToastEl = function () {
    if (this.toastEl) return;
    var el = document.createElement('div');
    el.className = 'badge-toast';
    el.setAttribute('role', 'alert');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML =
      '<div class="badge-toast-icon"></div>' +
      '<div class="badge-toast-content">' +
      '  <div class="badge-toast-title"></div>' +
      '  <div class="badge-toast-desc"></div>' +
      '</div>';
    document.body.appendChild(el);
    this.toastEl = el;
  };

  GamificationManager.prototype.showToast = function (icon, title, desc) {
    this.pendingToasts.push({ icon: icon, title: title, desc: desc });
    if (!this.toastShowing) this.processNextToast();
  };

  GamificationManager.prototype.processNextToast = function () {
    if (this.pendingToasts.length === 0) { this.toastShowing = false; return; }
    this.toastShowing = true;
    var self = this;
    var toast = this.pendingToasts.shift();

    this.ensureToastEl();
    this.toastEl.querySelector('.badge-toast-icon').textContent = toast.icon;
    this.toastEl.querySelector('.badge-toast-title').textContent = toast.title;
    this.toastEl.querySelector('.badge-toast-desc').textContent = toast.desc;
    this.toastEl.classList.add('is-visible');

    setTimeout(function () {
      self.toastEl.classList.remove('is-visible');
      setTimeout(function () {
        self.processNextToast();
      }, 350);
    }, 3000);
  };

  /* ------------------------------------------
     XP BAR UI
  ------------------------------------------ */
  GamificationManager.prototype.initXPBar = function () {
    // Insert XP bar into nav
    var navInner = document.querySelector('.nav-inner');
    if (!navInner) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'xp-bar-wrapper';
    wrapper.innerHTML =
      '<span class="xp-level">' + this.data.level + '</span>' +
      '<div class="xp-bar"><div class="xp-bar-fill"></div></div>' +
      '<span class="xp-text">' + this.data.xp + ' XP</span>';

    // Insert after nav-logo, before nav-links
    var navLinks = navInner.querySelector('.nav-links');
    if (navLinks) {
      navInner.insertBefore(wrapper, navLinks);
    } else {
      navInner.appendChild(wrapper);
    }

    this.xpBarEl = wrapper;
    this.updateXPBar();

    // Add streak display if streak > 0
    if (this.data.streak.current > 0) {
      var streakEl = document.createElement('span');
      streakEl.className = 'streak-display';
      streakEl.innerHTML = '\uD83D\uDD25 ' + this.data.streak.current;
      streakEl.title = this.data.streak.current + ' day streak';
      wrapper.appendChild(streakEl);
    }
  };

  GamificationManager.prototype.updateXPBar = function () {
    if (!this.xpBarEl) return;
    var xpInLevel = this.data.xp % XP_PER_LEVEL;
    var percent = (xpInLevel / XP_PER_LEVEL) * 100;

    var fill = this.xpBarEl.querySelector('.xp-bar-fill');
    if (fill) fill.style.width = percent + '%';

    var levelEl = this.xpBarEl.querySelector('.xp-level');
    if (levelEl) levelEl.textContent = this.data.level;

    var textEl = this.xpBarEl.querySelector('.xp-text');
    if (textEl) textEl.textContent = this.data.xp + ' XP';
  };

  /* ------------------------------------------
     BADGE GALLERY (index page)
  ------------------------------------------ */
  GamificationManager.prototype.updateBadgeGallery = function () {
    var gallery = document.querySelector('.badge-gallery');
    if (!gallery) return;
    var self = this;

    gallery.innerHTML = '';
    BADGES.forEach(function (badge) {
      var isEarned = self.data.badges[badge.id];
      var el = document.createElement('div');
      el.className = 'badge-item' + (isEarned ? ' is-earned' : '');
      el.title = badge.desc;
      el.innerHTML =
        '<div class="badge-item-icon">' + badge.icon + '</div>' +
        '<div class="badge-item-name">' + badge.name + '</div>';
      gallery.appendChild(el);
    });
  };

  /* ------------------------------------------
     INIT
  ------------------------------------------ */
  function init() {
    var gm = new GamificationManager();
    gm.trackModuleVisit();
    gm.initXPBar();
    gm.updateBadgeGallery();

    // Expose for other scripts
    window.gamification = gm;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
