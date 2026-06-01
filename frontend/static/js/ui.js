// ============================================
// WAEC GRINDER — UI Module
// DOM manipulation, rendering, transitions
// ============================================

import Storage from './storage.js';
import Engine from './engine.js';
import APP_CONFIG from './config.js';
import AchievementEngine from './achievements.js';

// ---- Toast system ----
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ---- Nav stats update ----
function updateNavStats() {
  const failedEl = document.getElementById('nav-failed');
  const unseenEl = document.getElementById('nav-unseen');
  const masteredEl = document.getElementById('nav-mastered');
  const streakEl = document.getElementById('nav-streak');

  if (!failedEl && !unseenEl && !masteredEl && !streakEl) return;

  const counts = Storage.getQuickCounts();

  if (failedEl)   failedEl.textContent = counts.failed;
  if (unseenEl)   unseenEl.textContent = counts.unseen;
  if (masteredEl) masteredEl.textContent = counts.mastered;
  if (streakEl)   streakEl.textContent = counts.streak;
}

// ---- Render a single OBJ question ----
function renderObjQuestion(q, idx, total) {
  const fromFailed = q._from_failed;
  const showSubject = Storage.getSubjects().length > 1;

  let optionsToRender = Object.entries(q.options);
  let correctOption = q.correct_option;

  if (Storage.isRandomizedOptions()) {
    const correctText = q.options[q.correct_option];
    const entries = Object.entries(q.options);
    // Shuffle
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }
    // Re-assign letters to keep A, B, C, D order
    const letters = Object.keys(q.options).sort();
    optionsToRender = entries.map((entry, i) => [letters[i], entry[1]]);
    // Find new correct letter
    const found = optionsToRender.find(e => e[1] === correctText);
    if (found) correctOption = found[0];
  }

  return `
    <div class="question-card card animate-fade-in ${fromFailed ? 'type--failed' : ''}" tabindex="-1">
      <div class="question-meta">
        <span class="q-number">Question ${idx + 1} / ${total}</span>
        <span class="badge badge--accent">OBJ</span>
        ${showSubject ? `<span class="badge badge--neutral">${escapeHtml(q._subject)}</span>` : ''}
        ${q.topic ? `<span class="badge badge--neutral">${escapeHtml(q.topic)}</span>` : ''}
        ${fromFailed ? '<span class="badge badge--fail">⟳ Repeat</span>' : ''}
      </div>
      <div class="question-text">${formatText(q.question)}</div>
      <div class="options-grid" id="options-grid" data-correct="${escapeHtml(correctOption)}" data-explanation="${escapeAttr(q.explanation || '')}">
        ${optionsToRender.map(([letter, text]) => {
          let cls = 'option-btn';
          if (q._selected_letter === letter) cls += ' selected';

          return `
            <button class="${cls}" data-letter="${letter}" onclick="UI.selectOption(this, '${letter}')" aria-label="Option ${letter}: ${escapeHtml(text)}">
              <span class="option-letter" aria-hidden="true">${letter}</span>
              <span class="option-text">${formatText(text)}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="result-banner" id="result-banner" role="status" aria-live="polite">
        <span class="result-banner__icon" aria-hidden="true"></span>
        <div class="result-banner__body">
          <div class="result-banner__title"></div>
          <div class="result-banner__sub"></div>
        </div>
      </div>
      <div class="explanation-block" id="explanation-block" role="region" aria-live="polite" aria-labelledby="explanation-label">
        <div class="explanation-block__label" id="explanation-label">📖 Explanation</div>
        <div class="explanation-block__text"></div>
        <button class="btn-explain" id="explain-btn" onclick="UI.explainSimpler()" aria-label="Explain this concept simpler">
          💡 Explain It Simpler
        </button>
      </div>
      <div class="action-bar">
        <div class="action-bar__left">
          ${Storage.isCbtMode() ? `<button class="btn btn--ghost btn--sm" onclick="UI.prevQuestion()" ${idx === 0 ? 'disabled' : ''} aria-label="Previous question">&larr; Back</button>` : ''}
          <button class="btn btn--ghost btn--sm" onclick="UI.skipQuestion()" aria-label="Skip this question"><span class="kbd-hint" aria-hidden="true">S</span>Skip</button>
        </div>
        <div class="action-bar__right">
          ${Storage.isCbtMode() && idx === total - 1 ? `<button class="btn btn--accent" onclick="UI.showBatchComplete()" aria-label="Finish and submit batch">Finish & Submit</button>` : ''}
          <button class="btn btn--primary" id="next-btn" style="${(Storage.isCbtMode() && idx < total - 1) || q._status === 'answered' ? '' : 'display:none'}" onclick="UI.nextQuestion()" aria-label="Next question">
            Next <span class="kbd-hint" aria-hidden="true">Enter</span> &rarr;
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Render a single Theory question ----
function renderTheoryQuestion(q, idx, total) {
  const fromFailed = q._from_failed;
  const showSubject = Storage.getSubjects().length > 1;
  const totalMaxMarks = q.sub_questions.reduce((s, sq) => s + sq.max_marks, 0);
  return `
    <div class="question-card card type--theory animate-fade-in ${fromFailed ? 'type--failed' : ''}" tabindex="-1">
      <div class="question-meta">
        <span class="q-number">Question ${idx + 1} / ${total}</span>
        <span class="badge badge--neutral">THEORY</span>
        ${showSubject ? `<span class="badge badge--neutral">${escapeHtml(q._subject)}</span>` : ''}
        ${q.topic ? `<span class="badge badge--neutral">${escapeHtml(q.topic)}</span>` : ''}
        ${fromFailed ? '<span class="badge badge--fail">⟳ Repeat</span>' : ''}
        <span class="badge badge--accent">${totalMaxMarks} marks</span>
      </div>
      <div class="question-context">${formatText(q.main_context)}</div>
      <div class="theory-section" id="theory-section">
        ${q.sub_questions.map(sub => renderSubQuestion(sub)).join('')}
      </div>
      <div class="grading-overlay hidden" id="grading-overlay" aria-live="polite">
        <div class="spinner"></div>
        <span id="grading-status">Sending to AI examiner...</span>
      </div>
      <div class="result-banner" id="result-banner" role="status" aria-live="polite">
        <span class="result-banner__icon" aria-hidden="true"></span>
        <div class="result-banner__body">
          <div class="result-banner__title"></div>
          <div class="result-banner__sub"></div>
        </div>
      </div>
      <div class="action-bar">
        <div class="action-bar__left">
          ${Storage.isCbtMode() ? `<button class="btn btn--ghost btn--sm" onclick="UI.prevQuestion()" ${idx === 0 ? 'disabled' : ''} aria-label="Previous question">&larr; Back</button>` : ''}
          <button class="btn btn--ghost btn--sm" onclick="UI.skipQuestion()" aria-label="Skip this question"><span class="kbd-hint" aria-hidden="true">S</span>Skip</button>
          <span class="score-tally hidden" id="score-tally">
            Score: <strong id="score-val">0</strong> / ${totalMaxMarks}
          </span>
        </div>
        <div class="action-bar__right">
          ${Storage.isCbtMode() && idx === total - 1 ? `<button class="btn btn--accent" onclick="UI.showBatchComplete()" aria-label="Finish and submit batch">Finish & Submit</button>` : ''}
          <button class="btn btn--primary" id="submit-theory-btn" onclick="UI.submitTheory()" aria-label="Submit answer for AI grading">
            ✦ Submit for Grading <span class="kbd-hint" aria-hidden="true">Ctrl+Enter</span>
          </button>
          <button class="btn btn--primary" id="next-btn" style="${(Storage.isCbtMode() && idx < total - 1) || q._status === 'answered' ? '' : 'display:none'}" onclick="UI.nextQuestion()" aria-label="Next question">
            Next <span class="kbd-hint" aria-hidden="true">Enter</span> &rarr;
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
          <label class="sub-label" for="answer-${sub.sub_id}">${escapeHtml(sub.label)}</label>
          <div class="sub-question-text">${formatText(sub.question)}</div>
        </div>
        <div class="sub-marks-badge">${sub.max_marks} mark${sub.max_marks !== 1 ? 's' : ''}</div>
      </div>
      <div class="sub-answer-area">
        <textarea
          id="answer-${sub.sub_id}"
          placeholder="Write your answer here..."
          rows="4"
          oninput="UI.autoResize(this)"
          aria-describedby="feedback-${sub.sub_id}"
        ></textarea>
      </div>
      <div class="sub-feedback" id="feedback-${sub.sub_id}">
        <div style="flex: 1;">
          <span class="sub-feedback-score" id="fscore-${sub.sub_id}"></span>
          <span class="sub-feedback-text" id="ftext-${sub.sub_id}"></span>
        </div>
        <button class="btn-explain" onclick="UI.explainSimpler('${sub.sub_id}')" aria-label="Explain this concept simpler">
          💡 Explain Simpler
        </button>
      </div>
    </div>
  `;
}

// ---- Helpers ----

// Configure marked once for performance
const _markedRenderer = new marked.Renderer();
_markedRenderer.image = (arg1, title, text) => {
  let href = arg1;
  let subtitleText = text;
  let imgTitle = title;

  if (typeof arg1 === 'object' && arg1 !== null) {
    href = arg1.href;
    subtitleText = arg1.text;
    imgTitle = arg1.title;
  }

  const subtitle = subtitleText ? `<figcaption class="img-subtitle">${subtitleText}</figcaption>` : '';
  return `
    <figure class="q-image-figure">
      <img src="${href}" alt="${subtitleText || ''}" title="${imgTitle || ''}" class="q-image">
      ${subtitle}
    </figure>
  `;
};

marked.setOptions({
  gfm: true,
  breaks: true, // support \n (newline)
  renderer: _markedRenderer,
  headerIds: false,
  mangle: false
});

function formatText(str) {
  if (!str) return '';

  // 1. Handle LaTeX (inline and block)
  // We do this BEFORE marked to avoid conflict with markdown characters inside LaTeX
  // Use a placeholder strategy to protect LaTeX content from marked
  const latexBlocks = [];
  let processed = str.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    const id = `LATEXBLOCK${latexBlocks.length}ID`;
    try {
      latexBlocks.push(katex.renderToString(tex, { displayMode: true, throwOnError: false }));
    } catch (e) {
      latexBlocks.push(`<span class="error">${escapeHtml(match)}</span>`);
    }
    // Wrap block IDs in div so marked.js ignores putting <p> tags around it
    return `\n<div class="math-block-wrapper">${id}</div>\n`;
  });

  processed = processed.replace(/\$([\s\S]+?)\$/g, (match, tex) => {
    const id = `LATEXBLOCK${latexBlocks.length}ID`;
    try {
      latexBlocks.push(katex.renderToString(tex, { displayMode: false, throwOnError: false }));
    } catch (e) {
      latexBlocks.push(`<span class="error">${escapeHtml(match)}</span>`);
    }
    return id;
  });

  // 2. Parse Markdown
  let html = marked.parse(processed);

  // 4. Restore LaTeX blocks
  latexBlocks.forEach((renderedTex, i) => {
    html = html.replace(`LATEXBLOCK${i}ID`, renderedTex);
  });

  return html;
}

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
  _timerInterval: null,

  init(batch) {
    this.batch = batch.map(q => ({
      ...q,
      _status: q._status || 'unvisited' // preserve status if resuming
    }));
    this.currentIdx = Storage.loadIdx();

    // Initialize batch start time if starting fresh
    if (this.currentIdx === 0 && !Storage.getBatchStartTime()) {
      Storage.setBatchStartTime(Date.now());
    }

    Storage.updateStreak();
    this.renderCurrent();
    this.updateProgress();
    updateNavStats();

    // Check for timed session
    const timeLimit = Storage.getTimeLimit();
    if (timeLimit) {
      this.startTimer(timeLimit);
    }
  },

  autoResize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
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

      // Accessibility: Focus the new card so screen readers start reading immediately
      const card = wrapper.querySelector('.question-card');
      if (card) card.focus();

      // Initialize textarea heights for theory questions
      wrapper.querySelectorAll('textarea').forEach(ta => this.autoResize(ta));
    }, 200);

    this.updateStepDots();
    this.renderNavigator();
  },

  updateProgress() {
    const bar = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    const isTimed = !!Storage.getTimeLimit();

    const pct = this.batch.length > 0
      ? Math.round((this.currentIdx / this.batch.length) * 100)
      : 0;

    if (bar) bar.style.width = `${pct}%`;
    if (label) {
      if (isTimed) {
        label.textContent = `${this.currentIdx} solved`;
      } else {
        label.textContent = `${this.currentIdx} / ${this.batch.length}`;
      }
    }
  },


  renderNavigator() {
    const container = document.getElementById('question-navigator');
    if (!container) return;

    if (!Storage.isCbtMode()) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'grid';
    container.innerHTML = this.batch.map((q, i) => {
      let cls = 'nav-box';
      if (i === this.currentIdx) cls += ' nav-box--current';
      else if (q._status === 'answered') cls += ' nav-box--answered';
      else if (q._status === 'skipped') cls += ' nav-box--skipped';

      return `<button class="${cls}" onclick="UI.jumpToQuestion(${i})" aria-label="Go to question ${i + 1}">${i + 1}</button>`;
    }).join('');
  },

  prevQuestion() {
    if (this.currentIdx > 0) {
      this.jumpToQuestion(this.currentIdx - 1);
    }
  },

  jumpToQuestion(idx) {
    if (idx < 0 || idx >= this.batch.length) return;
    this.currentIdx = idx;
    Storage.saveIdx(idx);
    this.renderCurrent();
    this.updateProgress();
    updateNavStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateStepDots() {
    const container = document.getElementById('step-dots');
    if (!container) return;
    container.innerHTML = this.batch.map((q, i) => {
      let cls = 'step-dot';
      let status = '';
      let ariaCurrent = '';
      if (i < this.currentIdx) {
        cls += ' done';
        status = ' (Completed)';
      } else if (i === this.currentIdx) {
        cls += ' active';
        status = ' (Current)';
        ariaCurrent = ' aria-current="step"';
      }
      return `<span class="${cls}" aria-label="Question ${i + 1}${status}"${ariaCurrent}></span>`;
    }).join('');
  },

  // ---- OBJ: select an option ----
  async selectOption(btn, letter) {
    if (btn.disabled) return;

    const grid = btn.closest('#options-grid');
    const correct = grid ? grid.dataset.correct : '';
    const explanation = grid ? grid.dataset.explanation : '';
    const q = this.batch[this.currentIdx];

    if (Storage.isCbtDelayMarking()) {
      // Exam Mode: Just record selection, no feedback
      q._selected_letter = letter;
      q._status = 'answered';
      q._passed = (letter === correct);

      // Update UI selection
      document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      Storage.saveBatch(this.batch);
      updateNavStats();
      this.renderNavigator(); // Refresh navigator to show answered status

      const nextBtn = document.getElementById('next-btn');
      if (nextBtn) nextBtn.style.display = 'flex';
      return;
    }

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
        expBlock.querySelector('.explanation-block__text').innerHTML =
          formatText(explanation.replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
      }
    }

    // Record result
    Engine.markObjResult(q, passed);
    q._status = 'answered';
    Storage.saveBatch(this.batch);

    // Track mastery to Trophy if passed
    if (passed && !q._is_review && !q._is_multiplayer) {
      const { default: API } = await import('./api.js');
      API.trackMastery(Storage.getPlayerUuid(), Storage.getPlayerName())
        .catch(err => console.error('[Trophy] Tracking failed:', err));
    }

    // Track speed for OBJ
    const batchStartTime = Storage.getBatchStartTime();
    if (batchStartTime) {
      q._solve_time_ms = Date.now() - batchStartTime; // relative to batch start for first question
      // This isn't perfect for individual questions in middle of batch but good enough for batch total speed check
    }

    // Persist batch state (including _passed status)
    Storage.saveBatch(this.batch);

    // Check for comeback
    const isComeback = q._from_failed && passed;
    this.checkAchievements({ isComeback });

    updateNavStats();

    // Pause timer for explanation
    this.pauseTimer();

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
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner"></div> Grading...`;
    }

    const gradingOverlay = document.getElementById('grading-overlay');
    if (gradingOverlay) {
      gradingOverlay.classList.remove('hidden');
      gradingOverlay.setAttribute('aria-busy', 'true');
    }

    let runningTotal = 0;
    const totalMax = q.sub_questions.reduce((s, sub) => s + sub.max_marks, 0);

    let totalScore, maxScore, passed;
    Storage.incrementSystemStat('api_calls');
    try {
      q._status = 'answered';
    Storage.saveBatch(this.batch);
    ({ totalScore, maxScore, passed } = await Engine.gradeTheoryQuestion(
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
        if (fText) fText.innerHTML = formatText(result.feedback);
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
    ));
    } catch (err) {
      if (gradingOverlay) {
        gradingOverlay.classList.add('hidden');
        gradingOverlay.setAttribute('aria-busy', 'false');
      }
      showToast(`Grading failed: ${err.message}`, 'error');

      // Re-enable UI for retry
      q.sub_questions.forEach(sub => {
        const ta = document.getElementById(`answer-${sub.sub_id}`);
        if (ta) ta.disabled = false;
        const block = document.getElementById(`sub-block-${sub.sub_id}`);
        if (block) block.classList.remove('grading');
      });
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `✦ Submit for Grading`;
      }
      this._gradingActive = false;
      return;
    }

    if (gradingOverlay) {
      gradingOverlay.classList.add('hidden');
      gradingOverlay.setAttribute('aria-busy', 'false');
    }
    if (submitBtn) submitBtn.style.display = 'none';

    // Achievement: ai_whisperer & theory_perfect & buzzer_beater
    if (passed) {
      const isPerfectAI = totalScore === totalMax;
      if (isPerfectAI) {
        Storage.incrementAiConsecutivePerfect();
        q._is_theory_perfect = true;
      } else {
        Storage.setAiConsecutivePerfect(0);
      }

      // First try check
      const stats = Storage.getQuestionStats(q.id, q._subject);
      if (stats.fails === 0) q._is_first_try_theory = true;

      // Buzzer beater
      const timerEnd = Storage.getTimerEnd();
      if (timerEnd) {
        const remaining = timerEnd - Date.now();
        if (remaining > 0 && remaining < 10000) {
          q._is_buzzer_beater = true;
        }
      }
    }

    // Track mastery to Trophy if passed
    if (passed) {
      const { default: API } = await import('./api.js');
      API.trackMastery(Storage.getPlayerUuid(), Storage.getPlayerName())
        .catch(err => console.error('[Trophy] Tracking failed:', err));
    }

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

    this.checkAchievements({ isComeback: q._from_failed && passed });

    // Persist batch state
    Storage.saveBatch(this.batch);

    updateNavStats();
    this._gradingActive = false;

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.style.display = 'flex';

    return { totalScore, maxScore, passed };
  },

  skipQuestion() {
    this.resumeTimer();
    showToast('Question skipped', 'info');
    const q = this.batch[this.currentIdx];

    if (Storage.isCbtMode()) {
      q._status = 'skipped';
      Storage.saveBatch(this.batch);
      if (this.currentIdx < this.batch.length - 1) {
        this.nextQuestion();
      } else {
        this.renderCurrent();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (!q._from_failed) {
      if (q._type === 'obj') Storage.pushUnseenObj(q);
      else Storage.pushUnseenTheory(q);
    }
    this.batch.splice(this.currentIdx, 1);
    Storage.saveBatch(this.batch);

    if (this.currentIdx >= this.batch.length && this.batch.length > 0) {
        this.showBatchComplete();
    } else if (this.batch.length === 0) {
        this.showBatchComplete();
    } else {
        this.renderCurrent();
        this.updateProgress();
        updateNavStats();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  nextQuestion() {
    this.resumeTimer();
    this.currentIdx++;
    Storage.saveIdx(this.currentIdx);
    this.renderCurrent();
    this.updateProgress();
    updateNavStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showBatchComplete(timedOut = false) {
    const wrapper = document.getElementById('question-wrapper');
    if (!wrapper) return;

    if (Storage.getMode() === 'review') {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
        Storage.clearBatch();
        Storage.clearTimer();
        Storage.incrementSystemStat('review_sessions_count');
        this.checkAchievements({
            batchPerf: {
                correctCount: this.currentIdx,
                totalCount: this.currentIdx,
                allPassed: true,
                durationMs: 0,
                batch: []
            }
        });

        wrapper.innerHTML = `
            <div class="card animate-bounce-in" style="text-align:center;padding:48px 32px">
                <div style="font-size:3.5rem;margin-bottom:16px">📚</div>
                <h2 style="margin-bottom:8px">Review Complete!</h2>
                <p style="margin-bottom:28px">Great job keeping your knowledge fresh. Retention is the key to mastery.</p>
                <div class="stats-grid" style="max-width:300px;margin:0 auto 32px">
                    <div class="stat-card stat--accent">
                        <div class="stat-card__value">${this.currentIdx}</div>
                        <div class="stat-card__label">Reviewed</div>
                    </div>
                </div>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                    <button class="btn btn--primary btn--lg" onclick="window.location.href='/'">Finish Review</button>
                </div>
            </div>
        `;
        return;
    }

    // Exam Mode Final Grading
    if (Storage.isCbtDelayMarking()) {
      this.batch.forEach(q => {
        if (q._selected_letter && q._status === 'answered' && q._passed !== undefined && !q._graded) {
          Engine.markObjResult(q, q._passed);
          q._graded = true;

          // Track mastery to Trophy if passed
          if (q._passed && !q._is_review && !q._is_multiplayer) {
            import('./api.js').then(({ default: API }) => {
              API.trackMastery(Storage.getPlayerUuid(), Storage.getPlayerName())
                .catch(err => console.error('[Trophy] Tracking failed:', err));
            });
          }
        }
      });
      Storage.saveBatch(this.batch);
    }

    // Performance Calculations
    const answeredBatch = Storage.isCbtDelayMarking() ? this.batch : this.batch.slice(0, this.currentIdx);
    const correctCount = answeredBatch.filter(q => q._passed === true).length;
    const totalCount = answeredBatch.length;

    const remainingInBatch = Storage.isCbtDelayMarking() ? 0 : (this.batch.length - this.currentIdx);
    const initialFailedQueueSize = (Storage.getFailedObj().length + Storage.getFailedTheory().length) +
                                  remainingInBatch; // approximation

    const startTime = Storage.getBatchStartTime();
    const durationMs = startTime ? Date.now() - startTime : 0;
    Storage.incrementSystemStat('total_study_time_ms', durationMs);
    const durationMins = Math.floor(durationMs / 60000);
    const durationSecs = Math.floor((durationMs % 60000) / 1000);
    const timeStr = `${durationMins}m ${durationSecs}s`;

    const topicStats = {};
    answeredBatch.forEach(q => {
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (q._passed === true) topicStats[topic].correct++;
    });

    const failedQuestions = answeredBatch.filter(q => q._passed === false);

    // Achievement Checks
    const allPassed = totalCount > 0 && correctCount === totalCount;
    const perf = {
        correctCount,
        totalCount,
        durationMs,
        allPassed,
        batch: answeredBatch,
        initialFailedQueueSize,
        failedQueueSize: Storage.getFailedObj().length + Storage.getFailedTheory().length
    };

    if (allPassed) {
      this.checkAchievements({ perfectBatchSize: totalCount, batchPerf: perf });
    } else {
      this.checkAchievements({ batchPerf: perf });
    }

    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }

    // Cleanup storage after gathering metrics
    Storage.clearBatch();
    Storage.clearTimer();
    Storage.incrementGlobalStat('batches_completed');
    Storage.setLeaderboardNeedsUpdate(true);

    const mode = Storage.getMode();
    const allDone = Storage.isAllDone(mode);
    const summary = Storage.getSessionSummary();

    // Render Report Card
    let content = '';

    if (timedOut) {
      content += `
        <div class="report-header animate-bounce-in">
          <div class="report-header__icon">⏰</div>
          <h1>Time's Up!</h1>
          <p>Your timed session has ended. Here's your report card.</p>
        </div>
      `;
    } else if (allDone) {
      content += `
        <div class="report-header animate-bounce-in">
          <div class="report-header__icon">🏆</div>
          <h1>Mastery Achieved!</h1>
          <p>Every single question has been conquered. You are ready!</p>
        </div>
      `;
    } else {
      content += `
        <div class="report-header animate-bounce-in">
          <div class="report-header__icon">🎯</div>
          <h1>Batch Complete!</h1>
          <p>Reflection is the key to mastery. Review your performance below.</p>
        </div>
      `;
    }

    content += `
      <div class="report-card card animate-fade-in">
        <div class="report-stats-grid">
          <div class="report-stat">
            <div class="report-stat__label">Batch Score</div>
            <div class="report-stat__value ${correctCount === totalCount ? 'text-pass' : ''}">${correctCount} / ${totalCount}</div>
          </div>
          <div class="report-stat">
            <div class="report-stat__label">Time Taken</div>
            <div class="report-stat__value">${timeStr}</div>
          </div>
          <div class="report-stat">
            <div class="report-stat__label">Mastered (Global)</div>
            <div class="report-stat__value text-accent">${summary.stats.mastered}</div>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section__title">Topic Performance</div>
          <div class="topic-breakdown">
            ${Object.entries(topicStats).map(([topic, stats]) => `
              <div class="topic-row">
                <span class="topic-name">${escapeHtml(topic)}</span>
                <div class="topic-bar-wrapper">
                  <div class="topic-bar" aria-hidden="true">
                    <div class="topic-bar__fill" style="width: ${(stats.correct / stats.total) * 100}%"></div>
                  </div>
                  <span class="topic-score">${stats.correct}/${stats.total}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${failedQuestions.length > 0 ? `
          <div class="report-section">
            <div class="report-section__title">Review Failed Questions (${failedQuestions.length})</div>
            <div class="failed-review-list">
              ${failedQuestions.map(q => {
                let explanationHtml = '';
                if (q._type === 'obj') {
                  explanationHtml = formatText(q.explanation || 'No explanation provided.');
                } else {
                  explanationHtml = q.sub_questions.map(sq => `
                    <div class="sq-review">
                      <strong>${escapeHtml(sq.label)}:</strong>
                      <div class="rubric-text">${formatText(sq.rubric)}</div>
                    </div>
                  `).join('');
                }

                return `
                  <div class="failed-item">
                    <div class="failed-item__q">${formatText(q.question || q.main_context)}</div>
                    <div class="failed-item__explanation">
                      <div class="explanation-label">📖 Review & Explanation</div>
                      <div class="explanation-content">${explanationHtml}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="report-section" style="text-align:center; padding: 20px;">
            <div class="text-pass" style="font-size: 1.2rem; font-weight: 700;">✨ Perfect Batch! No mistakes to review.</div>
          </div>
        `}

        <div class="report-actions">
          ${allDone ? `
            <button class="btn btn--primary btn--lg" onclick="UI.restartSession()">🔄 Study Again</button>
          ` : `
            <button class="btn btn--primary btn--lg" onclick="UI.nextBatch()">Next Batch &rarr;</button>
          `}
          <a href="/" class="btn btn--ghost btn--lg">← Dashboard</a>
        </div>
      </div>
    `;

    wrapper.innerHTML = content;
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

  checkAchievements(sessionFlags = {}) {
    const globalStats = Storage.getGlobalStats();
    const streak = Storage.getStreak();
    const earnedIds = Storage.getAchievements();
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    const currentSub = Storage.getSubject();
    const subStats = Storage.getStats(currentSub);
    const lastPerf = Storage.getLastBatchPerf();
    const batchPerf = sessionFlags.batchPerf || {};

    // Calculate complex stats
    const subjectsMerged = Storage.getSubjects().length;
    const masteredPerSubject = {};
    Storage.getSubjects().forEach(s => {
        masteredPerSubject[s] = Storage.getStats(s).mastered;
    });

    const checkStats = {
      streak: streak,
      mastered_obj: globalStats.mastered_obj,
      mastered_theory: globalStats.mastered_theory,
      mastered_total: globalStats.mastered_obj + globalStats.mastered_theory,
      subject_done: Storage.isAllDone('both'),
      isEarlyBird: hour < 8,
      isNightOwl: hour >= 22,
      isWeekend: day === 0 || day === 6,
      perfectBatchSize: sessionFlags.perfectBatchSize || 0,
      isComeback: sessionFlags.isComeback || false,
      subject_mastered_count: Object.keys(masteredPerSubject).length, // count of unique subjects worked on
      subjects_with_mastery: Storage.getSubjectsWithMasteryCount(),
      subjects_started: Storage.getSubjectsStartedCount(),
      isMultiplayer: Storage.isMultiplayerDone(),

      // New stats
      isBatchEnd: !!sessionFlags.batchPerf,
      currentHour: hour,
      subjects_mastered_all: Storage.getSubjectsMastered(),
      multi_stats: Storage.getMultiStats(),
      system_stats: Storage.getSystemStats(),
      batches_completed: Storage.getStats().sessions,
      subjects_merged: subjectsMerged,
      failedQueueSize: batchPerf.failedQueueSize,
      initialFailedQueueSize: batchPerf.initialFailedQueueSize,
      max_fails_on_passed: Math.max(0, ...(batchPerf.batch || []).map(q => q._fails_before_pass || 0)),
      isPerfectBatch: batchPerf.allPassed,
      lastBatchScore: lastPerf ? (lastPerf.correctCount / lastPerf.totalCount) : 1.0,
      isWeekendBatch: (day === 0 || day === 6) && !!sessionFlags.batchPerf,
      batchSize: batchPerf.totalCount,
      theoryMaxMarksAwarded: (batchPerf.batch || []).some(q => q._is_theory_perfect),
      theoryFirstTryPass: (batchPerf.batch || []).some(q => q._is_first_try_theory),
      aiConsecutivePerfect: Storage.getAiConsecutivePerfect(),
      isWeaknessStart: Storage.getFocusTopic() !== null,
      isRandomOptions: Storage.isRandomizedOptions(),
      durationMs: batchPerf.durationMs,
      batchType: (batchPerf.batch || []).every(q => q._type === 'obj') ? 'obj' : ((batchPerf.batch || []).every(q => q._type === 'theory') ? 'theory' : 'mixed'),
      theoryPassUnder10s: (batchPerf.batch || []).some(q => q._is_buzzer_beater),
      isTimed: !!Storage.getTimeLimit(),
      timeRemainingMs: Storage.getTimerEnd() ? (Storage.getTimerEnd() - Date.now()) : 0,
      mode: Storage.getMode(),
      mastered_per_subject: masteredPerSubject,
      isCustomBatch: !!Storage._get('wg_custom_batch_used') // set in dashboard
    };

    if (sessionFlags.batchPerf) {
        Storage.setLastBatchPerf({
            correctCount: batchPerf.correctCount,
            totalCount: batchPerf.totalCount
        });
    }

    const newlyUnlocked = AchievementEngine.checkNew(checkStats, earnedIds);
    newlyUnlocked.forEach(ach => {
      Storage.saveAchievement(ach.id);
      showToast(`🏆 Achievement Unlocked: ${ach.title}!`, 'success', 5000);
    });
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

  pauseTimer() {
    if (this._timerInterval) {
      const endTime = Storage.getTimerEnd();
      const remaining = endTime - Date.now();
      if (remaining > 0) {
        Storage.setTimerRemaining(remaining);
      }
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  },

  resumeTimer() {
    const remaining = Storage.getTimerRemaining();
    if (remaining !== null) {
      const newEndTime = Date.now() + remaining;
      Storage.setTimerEnd(newEndTime);
      Storage.clearTimerRemaining();
      this.startTimer();
    }
  },

  startTimer(minutes) {
    const display = document.getElementById('timer-display');
    const valEl = document.getElementById('timer-val');
    if (!display || !valEl) return;

    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }

    display.style.display = 'flex';

    // Handle paused state
    const remaining = Storage.getTimerRemaining();
    if (remaining !== null) {
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      valEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      if (remaining < 30000) display.classList.add('low-time');
      return;
    }

    let endTime = Storage.getTimerEnd();
    if (!endTime) {
      endTime = Date.now() + minutes * 60 * 1000;
      Storage.setTimerEnd(endTime);
    }

    const update = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(this._timerInterval);
        this.handleTimeUp();
        return;
      }

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      valEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;

      if (diff < 30000) {
        display.classList.add('low-time');
      }
    };

    update();
    this._timerInterval = setInterval(update, 1000);
  },

  handleTimeUp() {
    this.showBatchComplete(true);
  },

  async explainSimpler(subId = null) {
    const q = this.batch[this.currentIdx];
    let payload = {};

    if (q._type === 'obj') {
      payload = {
        question: q.question,
        options: q.options,
        correct_option: q.correct_option,
        explanation: q.explanation
      };
    } else {
      const sub = subId
        ? q.sub_questions.find(s => s.sub_id === subId)
        : q.sub_questions[0]; // Fallback

      payload = {
        question: sub.question,
        rubric: sub.rubric
      };
    }

    // Find the button to show loading state
    let btn;
    if (subId) {
      btn = document.querySelector(`#feedback-${subId} .btn-explain`);
    } else {
      btn = document.getElementById('explain-btn');
    }

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<div class="spinner"></div> Thinking...`;

    try {
      const { default: API } = await import('./api.js');
      const result = await API.explainConcept(payload);
      Storage.incrementSystemStat('explain_simpler_count');
      this.showExplanationModal(result.explanation);
    } catch (err) {
      showToast(`Could not get explanation: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
      btn.innerHTML = originalHTML;
    }
  },

  showExplanationModal(markdown) {
    const modal = document.getElementById('explanation-modal');
    const body = document.getElementById('modal-explanation-body');
    if (!modal || !body) return;

    this._lastActiveElement = document.activeElement;

    // Use formatText to handle markdown and latex
    body.innerHTML = formatText(markdown);
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Prevent scroll

    // Backdrop click to close (using addEventListener for robustness)
    if (!modal._backdropListener) {
      modal._backdropListener = (e) => {
        if (e.target === modal) this.closeExplanationModal();
      };
      modal.addEventListener('click', modal._backdropListener);
    }

    // Focus the close button for accessibility
    const closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();

    // Focus Trap (re-query elements on every Tab to avoid stale closure refs)
    if (!modal._trapListener) {
      modal._trapListener = (e) => {
        if (e.key !== 'Tab') return;

        const focusableSelector = 'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const focusableContent = modal.querySelectorAll(focusableSelector);
        if (focusableContent.length === 0) return;

        const firstFocusable = focusableContent[0];
        const lastFocusable = focusableContent[focusableContent.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      };
      modal.addEventListener('keydown', modal._trapListener);
    }
  },

  closeExplanationModal() {
    const modal = document.getElementById('explanation-modal');
    if (modal) {
      modal.classList.remove('visible');
      document.body.style.overflow = '';

      if (this._lastActiveElement) {
        this._lastActiveElement.focus();
        this._lastActiveElement = null;
      }
    }
  }
};

// Expose UI globally so inline onclick handlers work
window.UI = UI;

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  const modal = document.getElementById('explanation-modal');
  const isModalVisible = modal && modal.classList.contains('visible');

  if (e.key === 'Escape') {
    UI.closeExplanationModal();
    return;
  }

  // If modal is open, let it handle its own keys (like focus trap)
  if (isModalVisible) return;

  // Ctrl+Enter or Cmd+Enter to submit theory (works even inside textarea)
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    const submitBtn = document.getElementById('submit-theory-btn');
    if (submitBtn && !submitBtn.disabled && window.getComputedStyle(submitBtn).display !== 'none') {
      UI.submitTheory();
      return;
    }
  }

  // Prevent other shortcuts if user is typing in an input or textarea
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (activeTag === 'input' || activeTag === 'textarea') return;

  // Next question on Enter
  if (e.key === 'Enter') {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled) {
      UI.nextQuestion();
    }
    return;
  }

  const key = e.key.toUpperCase();

  // 'B' to go back\n  if (key === 'B' && Storage.isCbtMode()) {\n    UI.prevQuestion();\n    return;\n  }\n\n  // 'S' to skip question
  if (key === 'S') {
    const skipBtn = document.querySelector('.action-bar__left .btn--ghost');
    if (skipBtn && window.getComputedStyle(skipBtn).display !== 'none') {
      UI.skipQuestion();
      return;
    }
  }

  // OBJ shortcuts: A-D or 1-4 keys
  const optionMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D' };

  if (optionMap[key]) {
    const letter = optionMap[key];
    const btn = document.querySelector(`.option-btn[data-letter="${letter}"]`);
    if (btn && !btn.disabled) {
      UI.selectOption(btn, letter);
    }
  }
});

export { UI, updateNavStats, showToast };
