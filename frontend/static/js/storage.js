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
  TIMER_REMAINING: 'wg_timer_remaining', // remaining ms
  BATCH_SIZE:      'wg_batch_size',
  FOCUS_TOPIC:     'wg_focus_topic',
  RANDOMIZE_QUESTIONS: 'wg_randomize_questions',
  RANDOMIZE_OPTIONS: 'wg_randomize_options',
  BATCH_START_TIME: 'wg_batch_start_time',
  QUESTION_STATS:  'wg_question_stats',
  LAST_BATCH_PERF: 'wg_last_batch_perf',
  MULTI_STATS:     'wg_multi_stats',
  SYSTEM_STATS:    'wg_system_stats',
  SUBJECTS_MASTERED: 'wg_subjects_mastered',
  AI_CONSECUTIVE_PERFECT: 'wg_ai_consecutive_perfect',
  LEADERBOARD_ENABLED: 'wg_leaderboard_enabled',
  LEADERBOARD_CACHE:   'wg_leaderboard_cache',
  LEADERBOARD_NEEDS_UPDATE: 'wg_leaderboard_needs_update',
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

// In-memory cache to reduce localStorage I/O and redundant JSON.parse calls
const _cache = new Map();

// Helper to deep clone objects to prevent accidental cache mutations.
// Uses structuredClone for performance with a JSON-based fallback.
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return structuredClone(obj);
  } catch (e) {
    return JSON.parse(JSON.stringify(obj));
  }
}

const Storage = {
  // ---- Raw helpers ----
  _getRaw(key) {
    if (_cache.has(key)) return _cache.get(key);
    try {
      const val = localStorage.getItem(key);
      if (val === null) return null;
      const parsed = JSON.parse(val);
      _cache.set(key, parsed);
      return parsed;
    } catch { return null; }
  },
  _get(key) {
    const val = Storage._getRaw(key);
    // Optimization: Skip deepClone for primitives (immutable) and null to reduce CPU overhead
    if (val === null || typeof val !== 'object') return val;
    return deepClone(val);
  },
  _set(key, val) {
    const str = JSON.stringify(val);
    localStorage.setItem(key, str);
    try {
      // Use structuredClone for cache if possible, else reuse the stringified version
      _cache.set(key, structuredClone(val));
    } catch (e) {
      _cache.set(key, JSON.parse(str));
    }
  },
  _remove(key) {
    _cache.delete(key);
    localStorage.removeItem(key);
  },

  getPlayerUuid() {
    let uuid = Storage._get('wg_player_uuid');
    if (!uuid) {
      uuid = 'p_' + Math.random().toString(36).substr(2, 9);
      Storage._set('wg_player_uuid', uuid);
    }
    return uuid;
  },

  getPlayerName() {
    return Storage._get('wg_player_name') || 'Student';
  },

  setPlayerName(name) {
    Storage._set('wg_player_name', name);
  },

  // ---- Subject-scoped helpers ----
  _getScoped(subject, key) {
    const data = Storage._getRaw(`wg_sub_${subject}`) || {};
    return deepClone(data[key]);
  },
  _setScoped(subject, key, val) {
    const data = Storage._get(`wg_sub_${subject}`) || {};
    data[key] = val;
    Storage._set(`wg_sub_${subject}`, data);
  },

  /**
   * Performs an atomic update on subject-scoped data.
   * updateFn(data) should modify the data object in-place.
   */
  updateSubjectData(subject, updateFn) {
    const key = `wg_sub_${subject}`;
    const data = Storage._get(key) || {};
    updateFn(data);
    Storage._set(key, data);
  },

  /**
   * Atomically records a question result for a subject.
   * Consolidates queue moves and stat updates into one write.
   */
  recordQuestionResult(q, passed) {
    const subject = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!subject) return;

    let isFullyMastered = false;

    Storage.updateSubjectData(subject, (data) => {
      // 1. Initialize stats if missing
      if (!data.stats) data.stats = { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };

      // 2. Topic stats
      if (q.topic) {
        if (!data.stats.topic_stats) data.stats.topic_stats = {};
        if (!data.stats.topic_stats[q.topic]) data.stats.topic_stats[q.topic] = { correct: 0, total: 0 };
        data.stats.topic_stats[q.topic].total += 1;
        if (passed) data.stats.topic_stats[q.topic].correct += 1;
      }

      const qKey = q._type === 'obj' ? 'failed_obj' : 'failed_theory';
      const mKey = q._type === 'obj' ? 'mastered_obj' : 'mastered_theory';

      if (passed) {
        // 3. Remove from failed
        if (data[qKey]) {
          data[qKey] = data[qKey].filter(x => x.id !== q.id);
        }

        // 4. Add to mastered
        if (!data[mKey]) data[mKey] = [];
        if (!data[mKey].find(x => x.id === q.id)) {
          data[mKey].push(q);
        }
      } else {
        // 5. Add to failed
        if (!data[qKey]) data[qKey] = [];
        if (!data[qKey].find(x => x.id === q.id)) {
          data[qKey].push(q);
          data.stats.failed_total = (data.stats.failed_total || 0) + 1;
        }
      }

      // 6. SINGLE SOURCE OF TRUTH: Derive mastered count directly from array lengths
      data.stats.mastered = (data.mastered_obj?.length || 0) + (data.mastered_theory?.length || 0);

      // 7. Check for subject completion within the same atomic update
      const remaining = (data.unseen_obj?.length || 0) +
                        (data.unseen_theory?.length || 0) +
                        (data.failed_obj?.length || 0) +
                        (data.failed_theory?.length || 0);
      if (remaining === 0) {
        isFullyMastered = true;
      }
    });

    // Handle cross-key updates and achievement tracking outside the atomic subject write
    if (passed) {
      Storage.incrementGlobalStat(q._type === 'obj' ? 'mastered_obj' : 'mastered_theory', 1);
      q._fails_before_pass = Storage.trackQuestionPass(q.id, subject);
      if (isFullyMastered) {
        Storage.trackSubjectMastered(subject);
      }
    } else {
      Storage.trackQuestionFail(q.id, subject);
    }
  },

  /**
   * Atomically removes multiple questions from unseen queues of their respective subjects.
   */
  drainBatchFromUnseen(batch) {
    const bySubject = {};
    batch.forEach(q => {
      if (q._from_failed) return;
      if (!bySubject[q._subject]) bySubject[q._subject] = { obj: [], theory: [] };
      bySubject[q._subject][q._type].push(q.id);
    });

    for (const [sub, ids] of Object.entries(bySubject)) {
      Storage.updateSubjectData(sub, (data) => {
        if (ids.obj.length > 0 && data.unseen_obj) {
          data.unseen_obj = data.unseen_obj.filter(q => !ids.obj.includes(q.id));
        }
        if (ids.theory.length > 0 && data.unseen_theory) {
          data.unseen_theory = data.unseen_theory.filter(q => !ids.theory.includes(q.id));
        }
      });
    }
  },

  // ---- Initialise from loaded question data ----
  initSession(data, mode) {
    // data can be a single subject object OR an array of subject objects
    const subjectsData = Array.isArray(data) ? data : [data];
    const subjectNames = subjectsData.map(s => s.subject);

    // If multiple subjects, current subject is an array
    Storage._set(KEYS.CURRENT_SUBJECT, subjectNames.length === 1 ? subjectNames[0] : subjectNames);
    Storage._set(KEYS.STUDY_MODE, mode);

    subjectsData.forEach(subData => {
      // Ensure the subject is tracked in the index for faster lookups
      Storage.trackSubjectStarted(subData.subject);

      Storage.updateSubjectData(subData.subject, (d) => {
        if (mode === 'obj' || mode === 'both') {
          if (!d.unseen_obj) d.unseen_obj = subData.obj || [];
        }
        if (mode === 'theory' || mode === 'both') {
          if (!d.unseen_theory) d.unseen_theory = subData.theory || [];
        }
        if (!d.failed_obj) d.failed_obj = [];
        if (!d.failed_theory) d.failed_theory = [];
        if (!d.mastered_obj) d.mastered_obj = [];
        if (!d.mastered_theory) d.mastered_theory = [];
        if (!d.stats) d.stats = { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };
      });
    });
  },

  // ---- Force reset (re-study all questions for a subject) ----
  clearSubjectProgress(subject) {
    Storage._remove(`wg_sub_${subject}`);
    const current = Storage.getSubject();
    const isCurrent = Array.isArray(current) ? current.includes(subject) : current === subject;

    if (isCurrent) {
      Storage._remove(KEYS.CURRENT_BATCH);
      Storage._remove(KEYS.CURRENT_IDX);
      Storage._remove(KEYS.STUDY_MODE);
      Storage.clearTimer();
    }
  },

  hardReset() {
    // This now clears EVERYTHING
    _cache.clear();
    localStorage.clear();
  },

  // ---- Soft reset (keep subject/mode, clear queues) ----
  softReset(data, mode) {
    const subjectsData = Array.isArray(data) ? data : [data];

    subjectsData.forEach(subData => {
      const subject = subData.subject;
      const stats = Storage.getStats(subject);
      stats.sessions += 1;

      Storage._remove(`wg_sub_${subject}`);
      Storage._setScoped(subject, SUB_KEYS.STATS, stats);
    });

    Storage._remove(KEYS.CURRENT_BATCH);
    Storage._remove(KEYS.CURRENT_IDX);

    Storage.initSession(data, mode);
  },

  // ---- Queue accessors ----
  getUnseenObj(sub)    {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.UNSEEN_OBJ) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.UNSEEN_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.UNSEEN_OBJ) || []), []);
  },
  getUnseenTheory(sub) {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.UNSEEN_THEORY) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.UNSEEN_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.UNSEEN_THEORY) || []), []);
  },
  getFailedObj(sub)    {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.FAILED_OBJ) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.FAILED_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.FAILED_OBJ) || []), []);
  },
  getFailedTheory(sub) {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.FAILED_THEORY) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.FAILED_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.FAILED_THEORY) || []), []);
  },
  getMasteredObj(sub) {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.MASTERED_OBJ) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.MASTERED_OBJ) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.MASTERED_OBJ) || []), []);
  },
  getMasteredTheory(sub) {
    if (sub) return Storage._getScoped(sub, SUB_KEYS.MASTERED_THEORY) || [];
    const subjects = Storage.getSubjects();
    if (subjects.length === 1) return Storage._getScoped(subjects[0], SUB_KEYS.MASTERED_THEORY) || [];
    return subjects.reduce((acc, s) => acc.concat(Storage._getScoped(s, SUB_KEYS.MASTERED_THEORY) || []), []);
  },

  getMode()    { return Storage._get(KEYS.STUDY_MODE) || 'both'; },
  getSubject() { return Storage._get(KEYS.CURRENT_SUBJECT); },
  getSubjects() {
    // Optimization: Use _getRaw to avoid redundant cloning of the subject list array
    const s = Storage._getRaw(KEYS.CURRENT_SUBJECT);
    return Array.isArray(s) ? s : [s];
  },
  getStats(sub)   {
    if (sub) {
      const data = Storage._getRaw(`wg_sub_${sub}`) || {};
      // Bug Fix: Ensure we return a clone of stats so UI mutations don't pollute the cache.
      // Also derive 'mastered' directly from primary arrays to ensure consistency.
      const stats = deepClone(data.stats || { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} });
      stats.mastered = (data.mastered_obj?.length || 0) + (data.mastered_theory?.length || 0);
      return stats;
    }

    const subjects = Storage.getSubjects().filter(s => s !== null);
    if (subjects.length === 0) return { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };

    // Aggregate stats for multiple subjects
    const aggregate = { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} };
    subjects.forEach(s => {
      const data = Storage._getRaw(`wg_sub_${s}`) || {};
      const stats = data.stats || {};
      aggregate.mastered += (data.mastered_obj?.length || 0) + (data.mastered_theory?.length || 0);
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

  getTimeLimit() { return Storage._get(KEYS.TIME_LIMIT); },
  setTimeLimit(v) { Storage._set(KEYS.TIME_LIMIT, v); },
  getBatchSize() { return Storage._get(KEYS.BATCH_SIZE); },
  setBatchSize(v) { Storage._set(KEYS.BATCH_SIZE, v); },
  getTimerEnd() { return Storage._get(KEYS.TIMER_END); },
  setTimerEnd(v) { Storage._set(KEYS.TIMER_END, v); },
  getTimerRemaining() { return Storage._get(KEYS.TIMER_REMAINING); },
  setTimerRemaining(v) { Storage._set(KEYS.TIMER_REMAINING, v); },
  clearTimerRemaining() { Storage._remove(KEYS.TIMER_REMAINING); },
  clearTimer() {
    Storage._remove(KEYS.TIME_LIMIT);
    Storage._remove(KEYS.TIMER_END);
    Storage._remove(KEYS.TIMER_REMAINING);
  },

  getBatchStartTime() { return Storage._get(KEYS.BATCH_START_TIME); },
  setBatchStartTime(v) { Storage._set(KEYS.BATCH_START_TIME, v); },
  clearBatchStartTime() { Storage._remove(KEYS.BATCH_START_TIME); },

  isRandomizedQuestions() { return !!Storage._get(KEYS.RANDOMIZE_QUESTIONS); },
  setRandomizedQuestions(v) { Storage._set(KEYS.RANDOMIZE_QUESTIONS, !!v); },

  isRandomizedOptions() { return !!Storage._get(KEYS.RANDOMIZE_OPTIONS); },
  setRandomizedOptions(v) { Storage._set(KEYS.RANDOMIZE_OPTIONS, !!v); },

  isLeaderboardEnabled() {
    const v = Storage._get(KEYS.LEADERBOARD_ENABLED);
    return v === null ? true : !!v;
  },
  setLeaderboardEnabled(v) { Storage._set(KEYS.LEADERBOARD_ENABLED, !!v); },

  getLeaderboardCache() { return Storage._get(KEYS.LEADERBOARD_CACHE); },
  setLeaderboardCache(v) { Storage._set(KEYS.LEADERBOARD_CACHE, v); },

  leaderboardNeedsUpdate() { return !!Storage._get(KEYS.LEADERBOARD_NEEDS_UPDATE); },
  setLeaderboardNeedsUpdate(v) { Storage._set(KEYS.LEADERBOARD_NEEDS_UPDATE, !!v); },

  // ---- Queue mutators ----
  pushFailedObj(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getFailedObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.FAILED_OBJ, arr);
  },
  pushFailedTheory(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getFailedTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.FAILED_THEORY, arr);
  },
  pushUnseenObj(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getUnseenObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
  },
  pushUnseenTheory(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getUnseenTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
  },
  pushMasteredObj(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getMasteredObj(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.MASTERED_OBJ, arr);
  },
  pushMasteredTheory(q) {
    const sub = q._subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const arr = Storage.getMasteredTheory(sub);
    if (!arr.find(x => x.id === q.id)) arr.push(q);
    Storage._setScoped(sub, SUB_KEYS.MASTERED_THEORY, arr);
  },
  removeFailedObj(id, subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    Storage._setScoped(sub, SUB_KEYS.FAILED_OBJ, Storage.getFailedObj(sub).filter(q => q.id !== id));
  },
  removeFailedTheory(id, subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    Storage._setScoped(sub, SUB_KEYS.FAILED_THEORY, Storage.getFailedTheory(sub).filter(q => q.id !== id));
  },
  shiftUnseenObj(subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return null;
    const arr = Storage.getUnseenObj(sub);
    const q = arr.shift();
    Storage._setScoped(sub, SUB_KEYS.UNSEEN_OBJ, arr);
    return q;
  },
  shiftUnseenTheory(subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return null;
    const arr = Storage.getUnseenTheory(sub);
    const q = arr.shift();
    Storage._setScoped(sub, SUB_KEYS.UNSEEN_THEORY, arr);
    return q;
  },

  // ---- Stats updaters ----
  incrementMastered(count = 1, subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const s = Storage.getStats(sub);
    s.mastered += count;
    Storage._setScoped(sub, SUB_KEYS.STATS, s);
  },
  incrementFailed(count = 1, subject) {
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const s = Storage.getStats(sub);
    s.failed_total += count;
    Storage._setScoped(sub, SUB_KEYS.STATS, s);
  },

  updateTopicStats(topic, passed, subject) {
    if (!topic) return;
    const sub = subject || (Array.isArray(Storage.getSubject()) ? null : Storage.getSubject());
    if (!sub) return;
    const s = Storage.getStats(sub);
    if (!s.topic_stats) s.topic_stats = {};
    if (!s.topic_stats[topic]) s.topic_stats[topic] = { correct: 0, total: 0 };
    s.topic_stats[topic].total += 1;
    if (passed) s.topic_stats[topic].correct += 1;
    Storage._setScoped(sub, SUB_KEYS.STATS, s);
  },


  // ---- Focus Topic (Weakness sessions) ----
  setFocusTopic(topic) {
    Storage._set(KEYS.FOCUS_TOPIC, topic);
  },
  getFocusTopic() {
    return Storage._get(KEYS.FOCUS_TOPIC) || null;
  },

  // ---- Batch state ----
  saveBatch(batch) {
    Storage._set(KEYS.CURRENT_BATCH, batch);
  },
  loadBatch() {
    return Storage._get(KEYS.CURRENT_BATCH) || null;
  },
  clearBatch() {
    Storage._remove(KEYS.CURRENT_BATCH);
    Storage._remove(KEYS.CURRENT_IDX);
    Storage.clearBatchStartTime();
  },
  saveIdx(idx) {
    Storage._set(KEYS.CURRENT_IDX, idx);
  },
  loadIdx() {
    const v = Storage._get(KEYS.CURRENT_IDX);
    return v !== null ? v : 0;
  },

  // ---- Progress calculations ----
  getTotalRemaining(mode) {
    let total = 0;
    const subjects = Storage.getSubjects();
    subjects.forEach(sub => {
      // Optimization: Aggregate counts directly from raw cache objects.
      // This bypasses expensive deep clones triggered by high-level queue accessors.
      const data = Storage._getRaw(`wg_sub_${sub}`) || {};
      if (mode === 'obj' || mode === 'both') {
        total += (data.unseen_obj?.length || 0) + (data.failed_obj?.length || 0);
      }
      if (mode === 'theory' || mode === 'both') {
        total += (data.unseen_theory?.length || 0) + (data.failed_theory?.length || 0);
      }
      if (mode === 'review') {
        total += (data.mastered_obj?.length || 0) + (data.mastered_theory?.length || 0);
      }
    });
    return total;
  },
  isAllDone(mode) {
    return Storage.getTotalRemaining(mode) === 0;
  },

  hasExistingSession() {
    return !!(Storage._get(KEYS.STUDY_MODE));
  },

  getSessionSummary() {
    const mode = Storage.getMode();
    const subjects = Storage.getSubjects();
    const counts = { unseen_obj: 0, unseen_theory: 0, failed_obj: 0, failed_theory: 0 };

    // Optimization: Access .length directly via _getRaw to minimize object cloning during summary updates.
    subjects.forEach(s => {
      const data = Storage._getRaw(`wg_sub_${s}`) || {};
      counts.unseen_obj += (data.unseen_obj?.length || 0);
      counts.unseen_theory += (data.unseen_theory?.length || 0);
      counts.failed_obj += (data.failed_obj?.length || 0);
      counts.failed_theory += (data.failed_theory?.length || 0);
    });

    return {
      mode,
      subject: Storage.getSubject(),
      ...counts,
      stats: Storage.getStats(),
    };
  },

  // ---- Gamification ----
  getStreak() {
    const s = Storage._get(KEYS.STREAK);
    return (s !== null && !isNaN(s)) ? Number(s) : 0;
  },

  updateStreak() {
    const today = new Date().toDateString();
    const lastDate = Storage._get(KEYS.LAST_STUDY_DATE);

    // Already updated today
    if (lastDate === today) return Storage.getStreak();

    let streak = Storage.getStreak();
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

    Storage._set(KEYS.STREAK, streak);
    Storage._set(KEYS.LAST_STUDY_DATE, today);
    return streak;
  },

  getGlobalStats() {
    return Storage._get(KEYS.GLOBAL_STATS) || { mastered_obj: 0, mastered_theory: 0 };
  },

  incrementGlobalStat(key, count = 1) {
    const stats = Storage.getGlobalStats();
    stats[key] = (stats[key] || 0) + count;
    Storage._set(KEYS.GLOBAL_STATS, stats);
    return stats;
  },

  trackSubjectStarted(subject) {
    let subjects = Storage._get(KEYS.SUBJECTS_STARTED) || [];
    if (!subjects.includes(subject)) {
      subjects.push(subject);
      Storage._set(KEYS.SUBJECTS_STARTED, subjects);
    }
    return subjects.length;
  },

  getSubjectsStartedCount() {
    return (Storage._get(KEYS.SUBJECTS_STARTED) || []).length;
  },

  setMultiplayerDone() {
    Storage._set(KEYS.MULTIPLAYER_DONE, true);
  },

  isMultiplayerDone() {
    return !!Storage._get(KEYS.MULTIPLAYER_DONE);
  },

  getAchievements() {
    return Storage._get(KEYS.ACHIEVEMENTS) || [];
  },

  saveAchievement(id) {
    const achievements = Storage.getAchievements();
    if (!achievements.includes(id)) {
      achievements.push(id);
      Storage._set(KEYS.ACHIEVEMENTS, achievements);
      return true;
    }
    return false;
  },

  // ---- Achievement Helpers ----
  // BUG FIX: Use composite keys (subject|qid) for question-specific stats to avoid collisions
  // between different subjects that share the same question ID.
  getQuestionStats(qid, subject) {
    const stats = Storage._get(KEYS.QUESTION_STATS) || {};
    const key = subject ? `${subject}|${qid}` : qid;
    return stats[key] || { fails: 0, passed: false };
  },
  trackQuestionFail(qid, subject) {
    const stats = Storage._get(KEYS.QUESTION_STATS) || {};
    const key = subject ? `${subject}|${qid}` : qid;
    if (!stats[key]) stats[key] = { fails: 0, passed: false };
    stats[key].fails++;
    Storage._set(KEYS.QUESTION_STATS, stats);
  },
  trackQuestionPass(qid, subject) {
    const stats = Storage._get(KEYS.QUESTION_STATS) || {};
    const key = subject ? `${subject}|${qid}` : qid;
    if (!stats[key]) stats[key] = { fails: 0, passed: false };
    stats[key].passed = true;
    Storage._set(KEYS.QUESTION_STATS, stats);
    return stats[key].fails;
  },

  getLastBatchPerf() { return Storage._get(KEYS.LAST_BATCH_PERF); },
  setLastBatchPerf(perf) { Storage._set(KEYS.LAST_BATCH_PERF, perf); },

  getMultiStats() {
    return Storage._get(KEYS.MULTI_STATS) || {
      rooms_hosted: 0, games_played: 0, wins: 0, win_streak: 0,
      max_capacity_rooms: 0, chat_messages: 0, top_3_finishes: 0
    };
  },
  incrementMultiStat(key, val = 1) {
    const s = Storage.getMultiStats();
    s[key] = (s[key] || 0) + val;
    Storage._set(KEYS.MULTI_STATS, s);
  },

  getSystemStats() {
    return Storage._get(KEYS.SYSTEM_STATS) || {
      explain_simpler_count: 0, api_calls: 0, total_study_time_ms: 0,
      review_sessions_count: 0, weakness_starts: 0, custom_batch_starts: 0
    };
  },
  incrementSystemStat(key, val = 1) {
    const s = Storage.getSystemStats();
    s[key] = (s[key] || 0) + val;
    Storage._set(KEYS.SYSTEM_STATS, s);
  },

  trackSubjectMastered(subject) {
    const mastered = Storage._get(KEYS.SUBJECTS_MASTERED) || [];
    if (!mastered.includes(subject)) {
      mastered.push(subject);
      Storage._set(KEYS.SUBJECTS_MASTERED, mastered);
    }
  },
  getSubjectsMastered() { return Storage._get(KEYS.SUBJECTS_MASTERED) || []; },

  getQuickCounts() {
    // Fast path for UI updates: aggregates stats without redundant deepClones
    const subjects = Storage.getSubjects().filter(s => s !== null);
    const results = { failed: 0, unseen: 0, mastered: 0, streak: Storage.getStreak() };

    subjects.forEach(s => {
      const data = Storage._getRaw(`wg_sub_${s}`) || {};

      results.failed += (data.failed_obj?.length || 0) + (data.failed_theory?.length || 0);
      results.unseen += (data.unseen_obj?.length || 0) + (data.unseen_theory?.length || 0);
      results.mastered += (data.mastered_obj?.length || 0) + (data.mastered_theory?.length || 0);
    });

    return results;
  },

  getSubjectsWithMasteryCount() {
    // Optimization: Use the 'wg_subjects_started' index to only check subjects the user has interacted with.
    // This avoids an O(N) scan of all localStorage keys, which can be expensive.
    let count = 0;
    const subjects = this._getRaw(KEYS.SUBJECTS_STARTED) || [];
    subjects.forEach(subject => {
      const subData = this._getRaw(`wg_sub_${subject}`);
      if (subData && subData.stats && subData.stats.mastered > 0) {
        count++;
      }
    });
    return count;
  },

  getAiConsecutivePerfect() { return Storage._get(KEYS.AI_CONSECUTIVE_PERFECT) || 0; },
  setAiConsecutivePerfect(v) { Storage._set(KEYS.AI_CONSECUTIVE_PERFECT, v); },
  incrementAiConsecutivePerfect() {
    const v = Storage.getAiConsecutivePerfect() + 1;
    Storage.setAiConsecutivePerfect(v);
    return v;
  },

  getAllMasteredIds() {
    // Optimization: Instead of iterating through ALL localStorage keys (which can be many),
    // we use the 'wg_subjects_started' index to only look at subjects the user has actually interacted with.
    // This improves performance for users with many stored items in localStorage.
    // BUG FIX: Returns composite IDs (subject|id) to ensure uniqueness across subjects
    // during multiplayer mastered-question filtering.
    const ids = new Set();
    const subjects = this._getRaw(KEYS.SUBJECTS_STARTED) || [];

    subjects.forEach(subject => {
      const data = this._getRaw(`wg_sub_${subject}`);
      if (data) {
        if (data[SUB_KEYS.MASTERED_OBJ]) {
          data[SUB_KEYS.MASTERED_OBJ].forEach(q => { if (q.id) ids.add(`${subject}|${q.id}`); });
        }
        if (data[SUB_KEYS.MASTERED_THEORY]) {
          data[SUB_KEYS.MASTERED_THEORY].forEach(q => { if (q.id) ids.add(`${subject}|${q.id}`); });
        }
      }
    });

    return Array.from(ids);
  },
};

// Sync cache if localStorage is updated from another tab
window.addEventListener('storage', (e) => {
  if (e.newValue === null) {
    _cache.delete(e.key);
  } else {
    try {
      _cache.set(e.key, JSON.parse(e.newValue));
    } catch {
      _cache.delete(e.key);
    }
  }
});

export default Storage;
