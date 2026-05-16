// ============================================
// WAEC GRINDER — Storage Module
// Handles ALL localStorage interactions
// ============================================

const KEYS = {
  CURRENT_SUBJECT: 'wg_current_subject',
  CURRENT_BATCH:   'wg_current_batch',
  CURRENT_IDX:     'wg_current_idx',
  STUDY_MODE:      'wg_study_mode',
  TIME_LIMIT:      'wg_time_limit', // in minutes
  TIMER_END:       'wg_timer_end',   // timestamp
  FOCUS_TOPIC:     'wg_focus_topic',
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
      this._setScoped(subject, SUB_KEYS.STATS, { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} });
    }
  },

  // ---- Force reset (re-study all questions for a subject) ----
  clearSubjectProgress(subject) {
    localStorage.removeItem(`wg_sub_${subject}`);
    if (this.getSubject() === subject) {
      localStorage.removeItem(KEYS.CURRENT_BATCH);
      localStorage.removeItem(KEYS.CURRENT_IDX);
      localStorage.removeItem(KEYS.STUDY_MODE);
      this.clearTimer();
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
  getStats(sub)   { return this._getScoped(sub || this.getSubject(), SUB_KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} }; },

  getTimeLimit() { return this._get(KEYS.TIME_LIMIT); },
  setTimeLimit(v) { this._set(KEYS.TIME_LIMIT, v); },
  getTimerEnd() { return this._get(KEYS.TIMER_END); },
  setTimerEnd(v) { this._set(KEYS.TIMER_END, v); },
  clearTimer() {
    localStorage.removeItem(KEYS.TIME_LIMIT);
    localStorage.removeItem(KEYS.TIMER_END);
  },

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

  updateTopicStats(topic, passed) {
    if (!topic) return;
    const sub = this.getSubject();
    const s = this.getStats(sub);
    if (!s.topic_stats) s.topic_stats = {};
    if (!s.topic_stats[topic]) s.topic_stats[topic] = { correct: 0, total: 0 };
    s.topic_stats[topic].total += 1;
    if (passed) s.topic_stats[topic].correct += 1;
    this._setScoped(sub, SUB_KEYS.STATS, s);
  },

  // ---- Focus Topic (Weakness sessions) ----
  setFocusTopic(topic) {
    this._set(KEYS.FOCUS_TOPIC, topic);
  },
  getFocusTopic() {
    return this._get(KEYS.FOCUS_TOPIC) || null;
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
