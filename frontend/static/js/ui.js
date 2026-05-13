// ============================================
// WAEC GRINDER — UI Module
// DOM manipulation, rendering, transitions
// ============================================

import Storage from './storage.js';
import Engine from './engine.js';
import APP_CONFIG from './config.js';

// ---- Toast system ----
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ---- Nav stats update ----
function updateNavStats() {
  const mode = Storage.getMode();
  const failedEl = document.getElementById('nav-failed');
  const unseenEl = document.getElementById('nav-unseen');
  const masteredEl = document.getElementById('nav-mastered');
  if (failedEl) {
    const failed = Storage.getFailedObj().length + Storage.getFailedTheory().length;
    failedEl.textContent = failed;
  }
  if (unseenEl) {
    const unseen = Storage.getUnseenObj().length + Storage.getUnseenTheory().length;
    unseenEl.textContent = unseen;
  }
  if (masteredEl) {
    masteredEl.textContent = Storage.getStats().mastered;
  }
}

// ---- Render a single OBJ question ----
function renderObjQuestion(q, idx, total) {
  const fromFailed = q._from_failed;
  return `
    <div class="question-card card animate-fade-in ${fromFailed ? 'type--failed' : ''}">
      <div class="question-meta">
        <span class="q-number">Question ${idx + 1} / ${total}</span>
        <span class="badge badge--accent">OBJ</span>
        ${fromFailed ? '<span class="badge badge--fail">⟳ Repeat</span>' : ''}
      </div>
      <p class="question-text">${escapeHtml(q.question)}</p>
      <div class="options-grid" id="options-grid" data-correct="${escapeHtml(q.correct_option)}" data-explanation="${escapeAttr(q.explanation || '')}">
        ${Object.entries(q.options).map(([letter, text]) => `
          <button class="option-btn" data-letter="${letter}" onclick="UI.selectOption(this, '${letter}')">
            <span class="option-letter">${letter}</span>
            <span class="option-text">${escapeHtml(text)}</span>
          </button>
        `).join('')}
      </div>
      <div class="result-banner" id="result-banner">
        <span class="result-banner__icon"></span>
        <div class="result-banner__body">
          <div class="result-banner__title"></div>
          <div class="result-banner__sub"></div>
        </div>
      </div>
      <div class="explanation-block" id="explanation-block">
        <div class="explanation-block__label">📖 Explanation</div>
        <div class="explanation-block__text"></div>
      </div>
      <div class="action-bar">
        <div class="action-bar__left">
          <button class="btn btn--ghost btn--sm" onclick="UI.skipQuestion()">Skip</button>
        </div>
        <div class="action-bar__right">
          <button class="btn btn--primary" id="next-btn" style="display:none" onclick="UI.nextQuestion()">
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Render a single Theory question ----
function renderTheoryQuestion(q, idx, total) {
  const fromFailed = q._from_failed;
  const totalMaxMarks = q.sub_questions.reduce((s, sq) => s + sq.max_marks, 0);
  return `
    <div class="question-card card type--theory animate-fade-in ${fromFailed ? 'type--failed' : ''}">
      <div class="question-meta">
        <span class="q-number">Question ${idx + 1} / ${total}</span>
        <span class="badge badge--neutral">THEORY</span>
        ${fromFailed ? '<span class="badge badge--fail">⟳ Repeat</span>' : ''}
        <span class="badge badge--accent">${totalMaxMarks} marks</span>
      </div>
      <div class="question-context">${escapeHtml(q.main_context)}</div>
      <div class="theory-section" id="theory-section">
        ${q.sub_questions.map(sub => renderSubQuestion(sub)).join('')}
      </div>
      <div class="grading-overlay hidden" id="grading-overlay">
        <div class="spinner"></div>
        <span id="grading-status">Sending to AI examiner...</span>
      </div>
      <div class="result-banner" id="result-banner">
        <span class="result-banner__icon"></span>
        <div class="result-banner__body">
          <div class="result-banner__title"></div>
          <div class="result-banner__sub"></div>
        </div>
      </div>
      <div class="action-bar">
        <div class="action-bar__left">
          <button class="btn btn--ghost btn--sm" onclick="UI.skipQuestion()">Skip</button>
          <span class="score-tally hidden" id="score-tally">
            Score: <strong id="score-val">0</strong> / ${totalMaxMarks}
          </span>
        </div>
        <div class="action-bar__right">
          <button class="btn btn--primary" id="submit-theory-btn" onclick="UI.submitTheory()">
            ✦ Submit for Grading
          </button>
          <button class="btn btn--primary" id="next-btn" style="display:none" onclick="UI.nextQuestion()">
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSubQuestion(sub) {
  return `
    <div class="sub-question-block" id="sub-block-${sub.sub_id}">
      <div class="sub-question-header">
        <div style="flex:1">
          <div class="sub-label">${escapeHtml(sub.label)}</div>
          <div class="sub-question-text">${escapeHtml(sub.question)}</div>
        </div>
        <div class="sub-marks-badge">${sub.max_marks} mark${sub.max_marks !== 1 ? 's' : ''}</div>
      </div>
      <div class="sub-answer-area">
        <textarea
          id="answer-${sub.sub_id}"
          placeholder="Write your answer here..."
          rows="4"
        ></textarea>
      </div>
      <div class="sub-feedback" id="feedback-${sub.sub_id}">
        <span class="sub-feedback-score" id="fscore-${sub.sub_id}"></span>
        <span class="sub-feedback-text" id="ftext-${sub.sub_id}"></span>
      </div>
    </div>
  `;
}

// ---- Helpers ----
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ---- Main UI controller ----
const UI = {
  batch: [],
  currentIdx: 0,
  _gradingActive: false,

  init(batch) {
    this.batch = batch;
    this.currentIdx = Storage.loadIdx();
    this.renderCurrent();
    this.updateProgress();
    updateNavStats();
  },

  renderCurrent() {
    const wrapper = document.getElementById('question-wrapper');
    if (!wrapper) return;

    if (this.currentIdx >= this.batch.length) {
      this.showBatchComplete();
      return;
    }

    const q = this.batch[this.currentIdx];
    wrapper.classList.add('transitioning');
    setTimeout(() => {
      wrapper.innerHTML = q._type === 'obj'
        ? renderObjQuestion(q, this.currentIdx, this.batch.length)
        : renderTheoryQuestion(q, this.currentIdx, this.batch.length);
      wrapper.classList.remove('transitioning');
    }, 200);

    this.updateStepDots();
  },

  updateProgress() {
    const bar = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    const pct = this.batch.length > 0
      ? Math.round((this.currentIdx / this.batch.length) * 100)
      : 0;
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${this.currentIdx} / ${this.batch.length}`;
  },

  updateStepDots() {
    const container = document.getElementById('step-dots');
    if (!container) return;
    container.innerHTML = this.batch.map((q, i) => {
      let cls = 'step-dot';
      if (i < this.currentIdx) cls += ' done';
      else if (i === this.currentIdx) cls += ' active';
      return `<span class="${cls}"></span>`;
    }).join('');
  },

  // ---- OBJ: select an option ----
  selectOption(btn, letter) {
    if (btn.disabled) return;

    const grid = btn.closest('#options-grid');
    const correct = grid ? grid.dataset.correct : '';
    const explanation = grid ? grid.dataset.explanation : '';

    // Disable all options
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

    const passed = letter === correct;
    btn.classList.add(passed ? 'correct' : 'wrong');

    if (!passed) {
      const correctBtn = document.querySelector(`.option-btn[data-letter="${correct}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    // Show result banner
    const banner = document.getElementById('result-banner');
    if (banner) {
      banner.classList.add('visible', passed ? 'pass' : 'fail');
      banner.querySelector('.result-banner__icon').textContent = passed ? '✅' : '❌';
      banner.querySelector('.result-banner__title').textContent = passed ? 'Correct!' : 'Wrong Answer';
      banner.querySelector('.result-banner__sub').textContent = passed
        ? 'Well done. Moving on.'
        : `The correct answer was (${correct}).`;
    }

    // Show explanation
    if (explanation) {
      const expBlock = document.getElementById('explanation-block');
      if (expBlock) {
        expBlock.classList.add('visible');
        expBlock.querySelector('.explanation-block__text').textContent =
          explanation.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      }
    }

    // Record result
    const q = this.batch[this.currentIdx];
    Engine.markObjResult(q, passed);
    updateNavStats();

    // Show next button
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.style.display = 'flex';
  },

  // ---- Theory: submit all sub-questions ----
  async submitTheory() {
    if (this._gradingActive) return;
    this._gradingActive = true;

    const q = this.batch[this.currentIdx];
    const answers = {};
    for (const sub of q.sub_questions) {
      const el = document.getElementById(`answer-${sub.sub_id}`);
      answers[sub.sub_id] = el ? el.value.trim() : '';
    }

    // Lock textareas
    q.sub_questions.forEach(sub => {
      const ta = document.getElementById(`answer-${sub.sub_id}`);
      if (ta) ta.disabled = true;
    });

    const submitBtn = document.getElementById('submit-theory-btn');
    if (submitBtn) submitBtn.style.display = 'none';

    const gradingOverlay = document.getElementById('grading-overlay');
    if (gradingOverlay) gradingOverlay.classList.remove('hidden');

    let runningTotal = 0;
    const totalMax = q.sub_questions.reduce((s, sub) => s + sub.max_marks, 0);

    const { totalScore, maxScore, passed } = await Engine.gradeTheoryQuestion(
      q,
      answers,
      (subId, result) => {
        // Update per-sub feedback
        const block = document.getElementById(`sub-block-${subId}`);
        const fScore = document.getElementById(`fscore-${subId}`);
        const fText = document.getElementById(`ftext-${subId}`);
        const feedback = document.getElementById(`feedback-${subId}`);
        const gradingStatus = document.getElementById('grading-status');

        const subPassed = result.score >= result.max_marks * APP_CONFIG.PASS_THRESHOLD;
        if (block) {
          block.classList.add(subPassed ? 'graded-pass' : 'graded-fail');
          block.classList.remove('grading');
        }
        if (fScore) fScore.textContent = `${result.score}/${result.max_marks}`;
        if (fText) fText.textContent = result.feedback;
        if (feedback) {
          feedback.classList.add('visible', subPassed ? 'pass' : 'fail');
        }

        runningTotal += result.score;
        const scoreTally = document.getElementById('score-tally');
        const scoreVal = document.getElementById('score-val');
        if (scoreTally) scoreTally.classList.remove('hidden');
        if (scoreVal) scoreVal.textContent = runningTotal;

        // Update grading status for next sub
        const subIdx = q.sub_questions.findIndex(s => s.sub_id === subId);
        if (gradingStatus && subIdx < q.sub_questions.length - 1) {
          const next = q.sub_questions[subIdx + 1];
          gradingStatus.textContent = `Grading ${next.label}...`;
          const nextBlock = document.getElementById(`sub-block-${next.sub_id}`);
          if (nextBlock) nextBlock.classList.add('grading');
        }
      }
    );

    if (gradingOverlay) gradingOverlay.classList.add('hidden');

    // Show result banner
    const banner = document.getElementById('result-banner');
    if (banner) {
      banner.classList.add('visible', passed ? 'pass' : 'fail');
      banner.querySelector('.result-banner__icon').textContent = passed ? '✅' : '❌';
      banner.querySelector('.result-banner__title').textContent = passed
        ? `Passed! (${totalScore}/${maxScore})`
        : `Needs Work (${totalScore}/${maxScore})`;
      banner.querySelector('.result-banner__sub').textContent = passed
        ? 'Great answer. This question is marked as mastered.'
        : `Below ${Math.round(APP_CONFIG.PASS_THRESHOLD * 100)}% — this question will repeat next batch.`;
    }

    updateNavStats();
    this._gradingActive = false;

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.style.display = 'flex';
  },

  skipQuestion() {
    const q = this.batch[this.currentIdx];
    // Push skipped unseen questions back to unseen queue (don't count as failed)
    if (!q._from_failed) {
      if (q._type === 'obj') Storage.pushFailedObj(q);
      else Storage.pushFailedTheory(q);
    }
    this.nextQuestion();
  },

  nextQuestion() {
    this.currentIdx++;
    Storage.saveIdx(this.currentIdx);
    this.renderCurrent();
    this.updateProgress();
    updateNavStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showBatchComplete() {
    const wrapper = document.getElementById('question-wrapper');
    if (!wrapper) return;
    Storage.clearBatch();

    const mode = Storage.getMode();
    const allDone = Storage.isAllDone(mode);
    const summary = Storage.getSessionSummary();

    if (allDone) {
      wrapper.innerHTML = `
        <div class="mastery-screen animate-bounce-in">
          <span class="mastery-screen__trophy">🏆</span>
          <h1>Mastery Achieved!</h1>
          <p>You have worked through every question in both the unseen and failed queues.
             Your consistency is exactly what separates WAEC candidates who pass from those who don't.</p>
          <div class="stats-grid" style="max-width:500px;margin:0 auto 32px">
            <div class="stat-card stat--accent">
              <div class="stat-card__value">${summary.stats.mastered}</div>
              <div class="stat-card__label">Mastered</div>
            </div>
            <div class="stat-card stat--fail">
              <div class="stat-card__value">${summary.stats.failed_total}</div>
              <div class="stat-card__label">Total Attempts</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn--primary btn--lg" onclick="UI.restartSession()">🔄 Study Again</button>
            <a href="/" class="btn btn--ghost btn--lg">← Dashboard</a>
          </div>
        </div>
      `;
    } else {
      const failed = summary.failed_obj + summary.failed_theory;
      const unseen = summary.unseen_obj + summary.unseen_theory;
      wrapper.innerHTML = `
        <div class="card animate-bounce-in" style="text-align:center;padding:48px 32px">
          <div style="font-size:3.5rem;margin-bottom:16px">🎯</div>
          <h2 style="margin-bottom:8px">Batch Complete!</h2>
          <p style="margin-bottom:28px">Good work grinding through that batch. Keep the momentum going.</p>
          <div class="stats-grid" style="max-width:500px;margin:0 auto 32px">
            <div class="stat-card stat--fail">
              <div class="stat-card__value">${failed}</div>
              <div class="stat-card__label">In Failed Queue</div>
            </div>
            <div class="stat-card stat--neutral">
              <div class="stat-card__value">${unseen}</div>
              <div class="stat-card__label">Unseen Left</div>
            </div>
            <div class="stat-card stat--accent">
              <div class="stat-card__value">${summary.stats.mastered}</div>
              <div class="stat-card__label">Mastered</div>
            </div>
          </div>
          <button class="btn btn--primary btn--lg" onclick="UI.nextBatch()">Next Batch &rarr;</button>
          <br><br>
          <a href="/" class="btn btn--ghost">← Dashboard</a>
        </div>
      `;
    }
  },

  async nextBatch() {
    const wrapper = document.getElementById('question-wrapper');
    if (wrapper) wrapper.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Building next batch...</p></div>`;
    const mode = Storage.getMode();
    const batch = Engine.buildBatch(mode);
    if (batch.length === 0) {
      this.showBatchComplete();
      return;
    }
    Engine.consumeBatch(batch);
    Storage.saveBatch(batch);
    Storage.saveIdx(0);
    this.init(batch);
  },

  restartSession() {
    // Pull fresh questions from the server and do a soft reset
    import('./api.js').then(({ default: API }) => {
      API.getQuestions().then(data => {
        const mode = Storage.getMode();
        Storage.softReset(data, mode);
        const batch = Engine.buildBatch(mode);
        Engine.consumeBatch(batch);
        Storage.saveBatch(batch);
        Storage.saveIdx(0);
        this.init(batch);
      }).catch(() => showToast('Could not reload questions.', 'error'));
    });
  },
};

// Expose UI globally so inline onclick handlers work
window.UI = UI;

export { UI, updateNavStats, showToast };
