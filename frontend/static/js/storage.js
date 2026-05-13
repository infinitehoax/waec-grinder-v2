// ============================================
// WAEC GRINDER — Storage Module
// Handles ALL localStorage interactions
// ============================================

const KEYS = {
  UNSEEN_OBJ:    'wg_unseen_obj',
  UNSEEN_THEORY: 'wg_unseen_theory',
  FAILED_OBJ:    'wg_failed_obj',
  FAILED_THEORY: 'wg_failed_theory',
  STATS:         'wg_stats',
  CURRENT_BATCH: 'wg_current_batch',
  CURRENT_IDX:   'wg_current_idx',
  STUDY_MODE:    'wg_study_mode',
  SUBJECT:       'wg_subject',
};

const Storage = {
  // ---- Raw helpers ----
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  _set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // ---- Initialise from loaded question data ----
  initSession(data, mode) {
    this._set(KEYS.SUBJECT, data.subject || 'Unknown Subject');
    this._set(KEYS.STUDY_MODE, mode);

    if (mode === 'obj' || mode === 'both') {
      // Only reset unseen if not already initialised
      if (!this._get(KEYS.UNSEEN_OBJ)) {
        this._set(KEYS.UNSEEN_OBJ, data.obj || []);
      }
    }
    if (mode === 'theory' || mode === 'both') {
      if (!this._get(KEYS.UNSEEN_THEORY)) {
        this._set(KEYS.UNSEEN_THEORY, data.theory || []);
      }
    }

    // Ensure failed queues exist
    if (!this._get(KEYS.FAILED_OBJ))    this._set(KEYS.FAILED_OBJ, []);
    if (!this._get(KEYS.FAILED_THEORY)) this._set(KEYS.FAILED_THEORY, []);

    // Ensure stats exist
    if (!this._get(KEYS.STATS)) {
      this._set(KEYS.STATS, { mastered: 0, failed_total: 0, sessions: 0 });
    }
  },

  // ---- Force reset (re-study all questions) ----
  hardReset() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },

  // ---- Soft reset (keep subject/mode, clear queues) ----
  softReset(data, mode) {
    localStorage.removeItem(KEYS.UNSEEN_OBJ);
    localStorage.removeItem(KEYS.UNSEEN_THEORY);
    localStorage.removeItem(KEYS.FAILED_OBJ);
    localStorage.removeItem(KEYS.FAILED_THEORY);
    localStorage.removeItem(KEYS.CURRENT_BATCH);
    localStorage.removeItem(KEYS.CURRENT_IDX);
    const stats = this._get(KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0 };
    stats.sessions += 1;
    this._set(KEYS.STATS, stats);
    this.initSession(data, mode);
  },

  // ---- Queue accessors ----
  getUnseenObj()    { return this._get(KEYS.UNSEEN_OBJ)    || []; },
  getUnseenTheory() { return this._get(KEYS.UNSEEN_THEORY) || []; },
  getFailedObj()    { return this._get(KEYS.FAILED_OBJ)    || []; },
  getFailedTheory() { return this._get(KEYS.FAILED_THEORY) || []; },

  getMode()    { return this._get(KEYS.STUDY_MODE) || 'both'; },
  getSubject() { return this._get(KEYS.SUBJECT) || 'Unknown Subject'; },
  getStats()   { return this._get(KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0 }; },

  // ---- Queue mutators ----
  pushFailedObj(q) {
    const arr = this.getFailedObj();
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._set(KEYS.FAILED_OBJ, arr);
  },
  pushFailedTheory(q) {
    const arr = this.getFailedTheory();
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._set(KEYS.FAILED_THEORY, arr);
  },
  removeFailedObj(id) {
    this._set(KEYS.FAILED_OBJ, this.getFailedObj().filter(q => q.id !== id));
  },
  removeFailedTheory(id) {
    this._set(KEYS.FAILED_THEORY, this.getFailedTheory().filter(q => q.id !== id));
  },
  shiftUnseenObj() {
    const arr = this.getUnseenObj();
    const q = arr.shift();
    this._set(KEYS.UNSEEN_OBJ, arr);
    return q;
  },
  shiftUnseenTheory() {
    const arr = this.getUnseenTheory();
    const q = arr.shift();
    this._set(KEYS.UNSEEN_THEORY, arr);
    return q;
  },

  // ---- Stats updaters ----
  incrementMastered(count = 1) {
    const s = this.getStats();
    s.mastered += count;
    this._set(KEYS.STATS, s);
  },
  incrementFailed(count = 1) {
    const s = this.getStats();
    s.failed_total += count;
    this._set(KEYS.STATS, s);
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
};

export default Storage;
