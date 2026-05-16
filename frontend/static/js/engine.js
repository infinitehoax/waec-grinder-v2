// ============================================
// WAEC GRINDER — Engine Module
// Core logic: Batching, grading, queues, repetition
// ============================================

import APP_CONFIG from './config.js';
import Storage from './storage.js';
import API from './api.js';

const Engine = {
  /**
   * Build a batch of up to BATCH_SIZE questions.
   * Priority: failed queue first, then unseen queue.
   * Returns array of question objects tagged with { _type: 'obj'|'theory', _from_failed: bool }
   */
  buildBatch(mode) {
    const batch = [];
    const isTimed = !!Storage.getTimeLimit();
    const limit = isTimed ? APP_CONFIG.TIMED_BATCH_SIZE : APP_CONFIG.BATCH_SIZE;
    const limit = APP_CONFIG.BATCH_SIZE;
    const focusTopic = Storage.getFocusTopic();

    // Helper to tag and push
    const push = (q, type, fromFailed) => {
      if (batch.length < limit) {
        // Filter by focus topic if active
        if (focusTopic && q.topic !== focusTopic) return false;

        batch.push({ ...q, _type: type, _from_failed: fromFailed });
        return true;
      }
      return false;
    };

    // 1. Failed OBJ
    if (mode === 'obj' || mode === 'both') {
      for (const q of Storage.getFailedObj()) {
        push(q, 'obj', true);
        if (batch.length >= limit) break;
      }
    }
    // 2. Failed Theory
    if ((mode === 'theory' || mode === 'both') && batch.length < limit) {
      for (const q of Storage.getFailedTheory()) {
        push(q, 'theory', true);
        if (batch.length >= limit) break;
      }
    }
    // 3. Unseen OBJ
    if ((mode === 'obj' || mode === 'both') && batch.length < limit) {
      const unseenObj = Storage.getUnseenObj();
      for (const q of unseenObj) {
        push(q, 'obj', false);
        if (batch.length >= limit) break;
      }
    }
    // 4. Unseen Theory
    if ((mode === 'theory' || mode === 'both') && batch.length < limit) {
      const unseenTheory = Storage.getUnseenTheory();
      for (const q of unseenTheory) {
        push(q, 'theory', false);
        if (batch.length >= limit) break;
      }
    }

    return batch;
  },

  /**
   * Consume the batch from the queues:
   * Remove items pulled from unseen queues so they aren't double-counted.
   */
  consumeBatch(batch) {
    const sub = Storage.getSubject();
    const batchIds = {
      obj: batch.filter(q => q._type === 'obj' && !q._from_failed).map(q => q.id),
      theory: batch.filter(q => q._type === 'theory' && !q._from_failed).map(q => q.id),
    };

    // Drain unseen queues of batch items
    if (batchIds.obj.length > 0) {
      const unseen = Storage.getUnseenObj(sub).filter(q => !batchIds.obj.includes(q.id));
      Storage._setScoped(sub, 'unseen_obj', unseen);
    }
    if (batchIds.theory.length > 0) {
      const unseen = Storage.getUnseenTheory(sub).filter(q => !batchIds.theory.includes(q.id));
      Storage._setScoped(sub, 'unseen_theory', unseen);
    }
  },

  /**
   * Mark an OBJ question result.
   * @param {object} q - question object with _type and _from_failed
   * @param {boolean} passed
   */
  markObjResult(q, passed) {
    q._passed = passed;
    Storage.updateTopicStats(q.topic, passed);
    if (passed) {
      // Passed: remove from failed if it was there, do not re-add
      Storage.removeFailedObj(q.id);
      Storage.incrementMastered(1);
      Storage.incrementGlobalStat('mastered_obj', 1);
    } else {
      // Failed: push to failed queue
      Storage.pushFailedObj(q);
      Storage.incrementFailed(1);
    }
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
    Storage.updateTopicStats(q.topic, passed);
    if (passed) {
      Storage.removeFailedTheory(q.id);
      Storage.incrementMastered(1);
      Storage.incrementGlobalStat('mastered_theory', 1);
    } else {
      Storage.pushFailedTheory(q);
      Storage.incrementFailed(1);
    }
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

    for (const sub of q.sub_questions) {
      const answer = answers[sub.sub_id] || '';
      const result = await API.gradeSubQuestion({
        sub_question: sub.question,
        student_answer: answer,
        rubric: sub.rubric,
        max_marks: sub.max_marks,
      });
      totalScore += result.score;
      maxScore += sub.max_marks;
      if (onSubGraded) onSubGraded(sub.sub_id, result);
    }

    const passed = this.markTheoryResult(q, totalScore, maxScore);
    return { totalScore, maxScore, passed };
  },
};

export default Engine;
