// ============================================
// WAEC GRINDER — Engine Module
// Core logic: Batching, grading, queues, repetition
// ============================================

import APP_CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';

const Engine = {
  /**
   * Helper to interleave items from multiple subjects in a round-robin fashion.
   * @param {string[]} subjects - List of subject names.
   * @param {number} limit - Max items to return.
   * @param {Function} getItemsFn - Callback (subject) => array of available items.
   * @returns {Array} Interleaved items.
   */
  _getInterleaved(subjects, limit, getItemsFn) {
    const result = [];
    const pools = {};
    let activeSubjects = [];

    subjects.forEach(sub => {
      const items = getItemsFn(sub);
      if (items && items.length > 0) {
        pools[sub] = [...items]; // Clone to avoid mutation
        activeSubjects.push(sub);
      }
    });

    while (result.length < limit && activeSubjects.length > 0) {
      // Shuffle active subjects in each round for "probability engine" feel
      for (let i = activeSubjects.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeSubjects[i], activeSubjects[j]] = [activeSubjects[j], activeSubjects[i]];
      }

      const nextActive = [];
      for (const sub of activeSubjects) {
        if (result.length >= limit) break;

        const item = pools[sub].shift();
        if (item) {
          result.push(item);
          if (pools[sub].length > 0) {
            nextActive.push(sub);
          }
        }
      }
      // Only subjects that still have items go into the next round
      activeSubjects = nextActive;
    }

    return result;
  },

  /**
   * Build a batch of up to BATCH_SIZE questions.
   * Priority: failed queue first, then unseen queue.
   * Returns array of question objects tagged with { _type: 'obj'|'theory', _from_failed: bool }
   */
  buildBatch(mode) {
    const batch = [];
    const isTimed = !!Storage.getTimeLimit();
    const customBatchSize = Storage.getBatchSize();

    // customBatchSize takes precedence if set, otherwise fallback to TIMED_BATCH_SIZE (if timed) or default BATCH_SIZE
    const limit = customBatchSize || (isTimed ? APP_CONFIG.TIMED_BATCH_SIZE : APP_CONFIG.BATCH_SIZE);
    const focusTopic = Storage.getFocusTopic();
    const subjects = Storage.getSubjects();

    // Review Mode: Pull exclusively from mastered queues
    if (mode === 'review') {
      return this._getInterleaved(subjects, limit, (sub) => {
        const obj = Storage.getMasteredObj(sub).map(q => ({ ...q, _type: 'obj', _from_failed: false, _is_review: true, _subject: sub }));
        const theory = Storage.getMasteredTheory(sub).map(q => ({ ...q, _type: 'theory', _from_failed: false, _is_review: true, _subject: sub }));
        const pool = [...obj, ...theory];

        // Shuffle each subject pool to pick random mastered questions
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool;
      });
    }

    // 1. Failed OBJ
    if (mode === 'obj' || mode === 'both') {
      const interleaved = this._getInterleaved(subjects, limit - batch.length, (sub) => {
        // Optimization: Pass clone=false as items are mapped into new objects immediately
        let qs = Storage.getFailedObj(sub, false);
        if (focusTopic) qs = qs.filter(q => q.topic === focusTopic);
        return qs.map(q => ({ ...q, _type: 'obj', _from_failed: true, _subject: sub }));
      });
      batch.push(...interleaved);
    }
    // 2. Failed Theory
    if ((mode === 'theory' || mode === 'both') && batch.length < limit) {
      const interleaved = this._getInterleaved(subjects, limit - batch.length, (sub) => {
        // Optimization: Pass clone=false as items are mapped into new objects immediately
        let qs = Storage.getFailedTheory(sub, false);
        if (focusTopic) qs = qs.filter(q => q.topic === focusTopic);
        return qs.map(q => ({ ...q, _type: 'theory', _from_failed: true, _subject: sub }));
      });
      batch.push(...interleaved);
    }
    // 3. Unseen OBJ
    if ((mode === 'obj' || mode === 'both') && batch.length < limit) {
      const interleaved = this._getInterleaved(subjects, limit - batch.length, (sub) => {
        // Optimization: Pass clone=false as items are mapped into new objects immediately
        let qs = Storage.getUnseenObj(sub, false);
        if (focusTopic) qs = qs.filter(q => q.topic === focusTopic);
        return qs.map(q => ({ ...q, _type: 'obj', _from_failed: false, _subject: sub }));
      });
      batch.push(...interleaved);
    }
    // 4. Unseen Theory
    if ((mode === 'theory' || mode === 'both') && batch.length < limit) {
      const interleaved = this._getInterleaved(subjects, limit - batch.length, (sub) => {
        // Optimization: Pass clone=false as items are mapped into new objects immediately
        let qs = Storage.getUnseenTheory(sub, false);
        if (focusTopic) qs = qs.filter(q => q.topic === focusTopic);
        return qs.map(q => ({ ...q, _type: 'theory', _from_failed: false, _subject: sub }));
      });
      batch.push(...interleaved);
    }

    // Only shuffle if randomization is enabled to ensure failed questions appear at random positions
    if (Storage.isRandomizedQuestions()) {
      // Fisher-Yates shuffle
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
    }

    return batch;
  },

  /**
   * Consume the batch from the queues:
   * Remove items pulled from unseen queues so they aren't double-counted.
   */
  consumeBatch(batch) {
    Storage.drainBatchFromUnseen(batch);
  },

  /**
   * Mark an OBJ question result.
   * @param {object} q - question object with _type and _from_failed
   * @param {boolean} passed
   */
  markObjResult(q, passed) {
    q._passed = passed;
    // Review mode is low-stakes: no stats or queue changes
    if (q._is_review || Storage.getMode() === 'review' || q._is_multiplayer) return;

    Storage.recordQuestionResult(q, passed);
  },

  /**
   * Mark a Theory question result.
   * @param {object} q - question object
   * @param {number} totalScore
   * @param {number} maxScore
   */
  markTheoryResult(q, totalScore, maxScore) {
    const pct = maxScore > 0 ? totalScore / maxScore : 0;
    const passed = pct >= APP_CONFIG.PASS_THRESHOLD;
    q._passed = passed;

    if (q._is_review || Storage.getMode() === 'review' || q._is_multiplayer) return passed;

    Storage.recordQuestionResult(q, passed);

    return passed;
  },

  /**
   * Grade all sub-questions for a theory question via API.
   * Calls onSubGraded(subId, result) as each sub-question returns.
   * Returns { totalScore, maxScore, passed }
   */
  async gradeTheoryQuestion(q, answers, onSubGraded) {
    let totalScore = 0;
    let maxScore = 0;
    q._theory_results = {};

    const gradingPromises = q.sub_questions.map(async (sub) => {
      const answer = answers[sub.sub_id] || "";
      const result = await API.gradeSubQuestion({
        sub_question: sub.question,
        student_answer: answer,
        rubric: sub.rubric,
        max_marks: sub.max_marks,
      });

      q._theory_results[sub.sub_id] = {
        score: result.score,
        max_marks: result.max_marks,
        feedback: result.feedback,
        answer: answer
      };

      if (onSubGraded) onSubGraded(sub.sub_id, result);
      return result;
    });

    const results = await Promise.all(gradingPromises);
    results.forEach(res => {
      totalScore += res.score;
      maxScore += res.max_marks;
    });

    const passed = this.markTheoryResult(q, totalScore, maxScore);
    return { totalScore, maxScore, passed };
  },
};

export default Engine;
