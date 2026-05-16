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
  TIME_LIMIT:      'wg_time_limit', // in minutes
  TIMER_END:       'wg_timer_end',   // timestamp
  BATCH_SIZE:      'wg_batch_size',
  FOCUS_TOPIC:     'wg_focus_topic',
  RANDOMIZE:       'wg_randomize',
};

const SUB_KEYS = {
  UNSEEN_OBJ:    'unseen_obj',
  UNSEEN_THEORY: 'unseen_theory',
  FAILED_OBJ:    'failed_obj',
  FAILED_THEORY: 'failed_theory',
  MASTERED_OBJ:  'mastered_obj',
  MASTERED_THEORY: 'mastered_theory',
  STATS:         'stats',
};

const Storage = {
  // ---- Raw helpers ----
  _get(key) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return null;
      return JSON.parse(val);
    } catch { return null; }
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
    // data can be a single subject object OR an array of subject objects
    const subjectsData = Array.isArray(data) ? data : [data];
    const subjectNames = subjectsData.map(s => s.subject);

    // If multiple subjects, current subject is an array
    this._set(KEYS.CURRENT_SUBJECT, subjectNames.length === 1 ? subjectNames[0] : subjectNames);
    this._set(KEYS.STUDY_MODE, mode);

    subjectsData.forEach(subData => {
      const subject = subData.subject;
      if (mode === 'obj' || mode === 'both') {
        if (!this._getScoped(subject, SUB_KEYS.UNSEEN_OBJ)) {
          this._setScoped(subject, SUB_KEYS.UNSEEN_OBJ, subData.obj || []);
        }
      }
      if (mode === 'theory' || mode === 'both') {
        if (!this._getScoped(subject, SUB_KEYS.UNSEEN_THEORY)) {
          this._setScoped(subject, SUB_KEYS.UNSEEN_THEORY, subData.theory || []);
        }
      }

      if (!this._getScoped(subject, SUB_KEYS.FAILED_OBJ))    this._setScoped(subject, SUB_KEYS.FAILED_OBJ, []);
      if (!this._getScoped(subject, SUB_KEYS.FAILED_THEORY)) this._setScoped(subject, SUB_KEYS.FAILED_THEORY, []);
      if (!this._getScoped(subject, SUB_KEYS.MASTERED_OBJ))  this._setScoped(subject, SUB_KEYS.MASTERED_OBJ, []);
      if (!this._getScoped(subject, SUB_KEYS.MASTERED_THEORY)) this._setScoped(subject, SUB_KEYS.MASTERED_THEORY, []);

      if (!this._getScoped(subject, SUB_KEYS.STATS)) {
        this._setScoped(subject, SUB_KEYS.STATS, { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} });
      }
    });
  },

  // ---- Force reset (re-study all questions for a subject) ----
  clearSubjectProgress(subject) {
    localStorage.removeItem(`wg_sub_${subject}`);
    const current = this.getSubject();
    const isCurrent = Array.isArray(current) ? current.includes(subject) : current === subject;

    if (isCurrent) {
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
    const subjectsData = Array.isArray(data) ? data : [data];

    subjectsData.forEach(subData => {
      const subject = subData.subject;
      const stats = this.getStats(subject);
      stats.sessions += 1;

      localStorage.removeItem(`wg_sub_${subject}`);
      this._setScoped(subject, SUB_KEYS.STATS, stats);
    });

    localStorage.removeItem(KEYS.CURRENT_BATCH);
    localStorage.removeItem(KEYS.CURRENT_IDX);

    this.initSession(data, mode);
  },

  // ---- Queue accessors ----
  getUnseenObj(sub)    {
    if (sub) return this._getScoped(sub, SUB_KEYS.UNSEEN_OBJ) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.UNSEEN_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.UNSEEN_OBJ) || []), []);
  },
  getUnseenTheory(sub) {
    if (sub) return this._getScoped(sub, SUB_KEYS.UNSEEN_THEORY) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.UNSEEN_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.UNSEEN_THEORY) || []), []);
  },
  getFailedObj(sub)    {
    if (sub) return this._getScoped(sub, SUB_KEYS.FAILED_OBJ) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.FAILED_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.FAILED_OBJ) || []), []);
  },
  getFailedTheory(sub) {
    if (sub) return this._getScoped(sub, SUB_KEYS.FAILED_THEORY) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.FAILED_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.FAILED_THEORY) || []), []);
  },
  getMasteredObj(sub) {
    if (sub) return this._getScoped(sub, SUB_KEYS.MASTERED_OBJ) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.MASTERED_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.MASTERED_OBJ) || []), []);
  },
  getMasteredTheory(sub) {
    if (sub) return this._getScoped(sub, SUB_KEYS.MASTERED_THEORY) || [];
    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.MASTERED_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(this._getScoped(s, SUB_KEYS.MASTERED_THEORY) || []), []);
  },

  getMode()    { return this._get(KEYS.STUDY_MODE) || 'both'; },
  getSubject() { return this._get(KEYS.CURRENT_SUBJECT); },
  getSubjects() {
    const s = this.getSubject();
    return Array.isArray(s) ? s : [s];
  },
  getStats(sub)   {
    if (sub) return this._getScoped(sub, SUB_KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };

    const subjects = this.getSubjects();
    if (subjects.length === 1) return this._getScoped(subjects[0], SUB_KEYS.STATS) || { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };

    // Aggregate stats for multiple subjects
    const aggregate = { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };
    subjects.forEach(s => {
      const stats = this._getScoped(s, SUB_KEYS.STATS) || {};
      aggregate.mastered += (stats.mastered || 0);
      aggregate.failed_total += (stats.failed_total || 0);
      aggregate.sessions = Math.max(aggregate.sessions, stats.sessions || 0);
      if (stats.topic_stats) {
        Object.entries(stats.topic_stats).forEach(([topic, s2]) => {
          if (!aggregate.topic_stats[topic]) aggregate.topic_stats[topic] = { correct: 0, total: 0 };
          aggregate.topic_stats[topic].correct += s2.correct;
          aggregate.topic_stats[topic].total += s2.total;
        });
      }
    });
    return aggregate;
  },

  getTimeLimit() { return this._get(KEYS.TIME_LIMIT); },
  setTimeLimit(v) { this._set(KEYS.TIME_LIMIT, v); },
  getBatchSize() { return this._get(KEYS.BATCH_SIZE); },
  setBatchSize(v) { this._set(KEYS.BATCH_SIZE, v); },
  getTimerEnd() { return this._get(KEYS.TIMER_END); },
  setTimerEnd(v) { this._set(KEYS.TIMER_END, v); },
  clearTimer() {
    localStorage.removeItem(KEYS.TIME_LIMIT);
    localStorage.removeItem(KEYS.TIMER_END);
  },

  isRandomized() { return !!this._get(KEYS.RANDOMIZE); },
  setRandomized(v) { this._set(KEYS.RANDOMIZE, !!v); },

  // ---- Queue mutators ----
  pushFailedObj(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getFailedObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.FAILED_OBJ, arr);
  },
  pushFailedTheory(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getFailedTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.FAILED_THEORY, arr);
  },
  pushUnseenObj(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getUnseenObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
  },
  pushUnseenTheory(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getUnseenTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
  },
  pushMasteredObj(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getMasteredObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.MASTERED_OBJ, arr);
  },
  pushMasteredTheory(q) {
    const sub = q._subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const arr = this.getMasteredTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    this._setScoped(sub, SUB_KEYS.MASTERED_THEORY, arr);
  },
  removeFailedObj(id, subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    this._setScoped(sub, SUB_KEYS.FAILED_OBJ, this.getFailedObj(sub).filter(q => q.id !== id));
  },
  removeFailedTheory(id, subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    this._setScoped(sub, SUB_KEYS.FAILED_THEORY, this.getFailedTheory(sub).filter(q => q.id !== id));
  },
  shiftUnseenObj(subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return null;
    const arr = this.getUnseenObj(sub);
    const q = arr.shift();
    this._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
    return q;
  },
  shiftUnseenTheory(subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return null;
    const arr = this.getUnseenTheory(sub);
    const q = arr.shift();
    this._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
    return q;
  },

  // ---- Stats updaters ----
  incrementMastered(count = 1, subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const s = this.getStats(sub);
    s.mastered += count;
    this._setScoped(sub, SUB_KEYS.STATS, s);
  },
  incrementFailed(count = 1, subject) {
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
    const s = this.getStats(sub);
    s.failed_total += count;
    this._setScoped(sub, SUB_KEYS.STATS, s);
  },

  updateTopicStats(topic, passed, subject) {
    if (!topic) return;
    const sub = subject || (Array.isArray(this.getSubject()) ? null : this.getSubject());
    if (!sub) return;
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
    const subjects = this.getSubjects();
    subjects.forEach(sub => {
      if (mode === 'obj' || mode === 'both') {
        total += this.getUnseenObj(sub).length + this.getFailedObj(sub).length;
      }
      if (mode === 'theory' || mode === 'both') {
        total += this.getUnseenTheory(sub).length + this.getFailedTheory(sub).length;
      }
    });
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
