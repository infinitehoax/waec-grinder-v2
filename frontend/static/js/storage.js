// ============================================
// WAEC GRINDER — Storage Module
// Handles ALL localStorage interactions
// ============================================

const KEYS = {
  CURRENT_SUBJECT: 'wg_current_subject',
  CURRENT_BATCH:   'wg_current_batch',
  CURRENT_IDX:     'wg_current_idx',
  STUDY_MODE:      'wg_study_mode',
  STREAK:          'wg_streak',
  LAST_STUDY_DATE: 'wg_last_study_date',
  GLOBAL_STATS:    'wg_global_stats',
  ACHIEVEMENTS:    'wg_achievements',
  SUBJECTS_STARTED: 'wg_subjects_started',
  MULTIPLAYER_DONE: 'wg_multiplayer_done',
};

const SUB_KEYS = {
  UNSEEN_OBJ:    'unseen_obj',
  UNSEEN_THEORY: 'unseen_theory',
  FAILED_OBJ:    'failed_obj',
  FAILED_THEORY: 'failed_theory',
  STATS:         'stats',
};

const Storage = {
  // ---- Raw helpers ----
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ---- Subject-scoped helpers ----
  _getScoped(subject, key) {
    const data = this._get(`wg_sub_${subject}`) || {};
    return data[key];
  },
  _setScoped(subject, key, val) {
    const data = this._get(`wg_sub_${subject}`) || {};
    data[key] = val;
    this._set(`wg_sub_${subject}`, data);
  },

  // ---- Initialise from loaded question data ----
  initSession(data, mode) {
    const subject = data.subject || 'Unknown Subject';
    this._set(KEYS.CURRENT_SUBJECT, subject);
    this._set(KEYS.STUDY_MODE, mode);

    if (mode === 'obj' || mode === 'both') {
      if (!this._getScoped(subject, SUB_KEYS.UNSEEN_OBJ)) {
        this._setScoped(subject, SUB_KEYS.UNSEEN_OBJ, data.obj || []);
      }
    }
    if (mode === 'theory' || mode === 'both') {
      if (!this._getScoped(subject, SUB_KEYS.UNSEEN_THEORY)) {
        this._setScoped(subject, SUB_KEYS.UNSEEN_THEORY, data.theory || []);
      }
    }

    if (!this._getScoped(subject, SUB_KEYS.FAILED_OBJ))    this._setScoped(subject, SUB_KEYS.FAILED_OBJ, []);
    if (!this._getScoped(subject, SUB_KEYS.FAILED_THEORY)) this._setScoped(subject, SUB_KEYS.FAILED_THEORY, []);

    if (!this._getScoped(subject, SUB_KEYS.STATS)) {
      this._setScoped(subject, SUB_KEYS.STATS, { mastered: 0, failed_total: 0, sessions: 0 });
    }
  },

  // ---- Force reset (re-study all questions for a subject) ----
  clearSubjectProgress(subject) {
    localStorage.removeItem(`wg_sub_${subject}`);
    if (this.getSubject() === subject) {
      localStorage.removeItem(KEYS.CURRENT_BATCH);
      localStorage.removeItem(KEYS.CURRENT_IDX);
      localStorage.removeItem(KEYS.STUDY_MODE);
    }
  },

  hardReset() {
    // This now clears EVERYTHING
    localStorage.clear();
  },

  // ---- Soft reset (keep subject/mode, clear queues) ----
  softReset(data, mode) {
    const subject = data.subject || 'Unknown Subject';
    const stats = this.getStats(subject);
    stats.sessions += 1;

    localStorage.removeItem(`wg_sub_${subject}`);
    localStorage.removeItem(KEYS.CURRENT_BATCH);
    localStorage.removeItem(KEYS.CURRENT_IDX);

    this.initSession(data, mode);
    this._setScoped(subject, SUB_KEYS.STATS, stats);
  },

  // ---- Queue accessors ----
  getUnseenObj(sub)    { return this._getScoped(sub || this.getSubject(), SUB_KEYS.UNSEEN_OBJ)    || []; },
  getUnseenTheory(sub) { return this._getScoped(sub || this.getSubject(), SUB_KEYS.UNSEEN_THEORY) || []; },
  getFailedObj(sub)    { return this._getScoped(sub || this.getSubject(), SUB_KEYS.FAILED_OBJ)    || []; },
  getFailedTheory(sub) { return this._getScoped(sub || this.getSubject(), SUB_KEYS.FAILED_THEORY) || []; },

  getMode()    { return this._get(KEYS.STUDY_MODE) || 'both'; },
  getSubject() { return this._get(KEYS.CURRENT_SUBJECT) || 'Unknown Subject'; },
  getStats(sub)   { return this._getScoped(sub || this.getSubject(), SUB_KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0 }; },

  // ---- Queue mutators ----
  pushFailedObj(q) {
    const sub = this.getSubject();
    const arr = this.getFailedObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.FAILED_OBJ, arr);
  },
  pushFailedTheory(q) {
    const sub = this.getSubject();
    const arr = this.getFailedTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.FAILED_THEORY, arr);
  },
  pushUnseenObj(q) {
    const sub = this.getSubject();
    const arr = this.getUnseenObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
  },
  pushUnseenTheory(q) {
    const sub = this.getSubject();
    const arr = this.getUnseenTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
  },
  removeFailedObj(id) {
    const sub = this.getSubject();
    this._setScoped(sub, SUB_KEYS.FAILED_OBJ, this.getFailedObj(sub).filter(q => q.id !== id));
  },
  removeFailedTheory(id) {
    const sub = this.getSubject();
    this._setScoped(sub, SUB_KEYS.FAILED_THEORY, this.getFailedTheory(sub).filter(q => q.id !== id));
  },
  shiftUnseenObj() {
    const sub = this.getSubject();
    const arr = this.getUnseenObj(sub);
    const q = arr.shift();
    this._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
    return q;
  },
  shiftUnseenTheory() {
    const sub = this.getSubject();
    const arr = this.getUnseenTheory(sub);
    const q = arr.shift();
    this._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
    return q;
  },

  // ---- Stats updaters ----
  incrementMastered(count = 1) {
    const sub = this.getSubject();
    const s = this.getStats(sub);
    s.mastered += count;
    this._setScoped(sub, SUB_KEYS.STATS, s);
  },
  incrementFailed(count = 1) {
    const sub = this.getSubject();
    const s = this.getStats(sub);
    s.failed_total += count;
    this._setScoped(sub, SUB_KEYS.STATS, s);
  },

  // ---- Batch state ----
  saveBatch(batch) {
    this._set(KEYS.CURRENT_BATCH, batch);
  },
  loadBatch() {
    return this._get(KEYS.CURRENT_BATCH) || null;
  },
  clearBatch() {
    localStorage.removeItem(KEYS.CURRENT_BATCH);
    localStorage.removeItem(KEYS.CURRENT_IDX);
  },
  saveIdx(idx) {
    this._set(KEYS.CURRENT_IDX, idx);
  },
  loadIdx() {
    const v = this._get(KEYS.CURRENT_IDX);
    return v !== null ? v : 0;
  },

  // ---- Progress calculations ----
  getTotalRemaining(mode) {
    let total = 0;
    if (mode === 'obj' || mode === 'both') {
      total += this.getUnseenObj().length + this.getFailedObj().length;
    }
    if (mode === 'theory' || mode === 'both') {
      total += this.getUnseenTheory().length + this.getFailedTheory().length;
    }
    return total;
  },

  isAllDone(mode) {
    return this.getTotalRemaining(mode) === 0;
  },

  hasExistingSession() {
    return !!(this._get(KEYS.STUDY_MODE));
  },

  getSessionSummary() {
    const mode = this.getMode();
    return {
      mode,
      subject: this.getSubject(),
      unseen_obj: this.getUnseenObj().length,
      unseen_theory: this.getUnseenTheory().length,
      failed_obj: this.getFailedObj().length,
      failed_theory: this.getFailedTheory().length,
      stats: this.getStats(),
    };
  },

  // ---- Gamification ----
  getStreak() {
    const s = this._get(KEYS.STREAK);
    return (s !== null && !isNaN(s)) ? Number(s) : 0;
  },

  updateStreak() {
    const today = new Date().toDateString();
    const lastDate = this._get(KEYS.LAST_STUDY_DATE);

    // Already updated today
    if (lastDate === today) return this.getStreak();

    let streak = this.getStreak();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastDate === yesterdayStr) {
      // Continued streak from yesterday
      streak += 1;
    } else {
      // First time ever or broke the chain
      streak = 1;
    }

    this._set(KEYS.STREAK, streak);
    this._set(KEYS.LAST_STUDY_DATE, today);
    return streak;
  },

  getGlobalStats() {
    return this._get(KEYS.GLOBAL_STATS) || { mastered_obj: 0, mastered_theory: 0 };
  },

  incrementGlobalStat(key, count = 1) {
    const stats = this.getGlobalStats();
    stats[key] = (stats[key] || 0) + count;
    this._set(KEYS.GLOBAL_STATS, stats);
    return stats;
  },

  trackSubjectStarted(subject) {
    let subjects = this._get(KEYS.SUBJECTS_STARTED) || [];
    if (!subjects.includes(subject)) {
      subjects.push(subject);
      this._set(KEYS.SUBJECTS_STARTED, subjects);
    }
    return subjects.length;
  },

  getSubjectsStartedCount() {
    return (this._get(KEYS.SUBJECTS_STARTED) || []).length;
  },

  setMultiplayerDone() {
    this._set(KEYS.MULTIPLAYER_DONE, true);
  },

  isMultiplayerDone() {
    return !!this._get(KEYS.MULTIPLAYER_DONE);
  },

  getAchievements() {
    return this._get(KEYS.ACHIEVEMENTS) || [];
  },

  saveAchievement(id) {
    const achievements = this.getAchievements();
    if (!achievements.includes(id)) {
      achievements.push(id);
      this._set(KEYS.ACHIEVEMENTS, achievements);
      return true;
    }
    return false;
  },
};

export default Storage;
