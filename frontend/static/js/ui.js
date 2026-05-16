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
  const streakEl = document.getElementById('nav-streak');

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
  if (streakEl) {
    streakEl.textContent = Storage.getStreak();
  }
}

// ---- Render a single OBJ question ----
function renderObjQuestion(q, idx, total) {
  const fromFailed = q._from_failed;
  const showSubject = Storage.getSubjects().length > 1;
  return `
    <div class="question-card card animate-fade-in ${fromFailed ? 'type--failed' : ''}">
      <div class="question-meta">
        <span class="q-number">Question ${idx + 1} / ${total}</span>
        <span class="badge badge--accent">OBJ</span>
        ${showSubject ? `<span class="badge badge--neutral">${escapeHtml(q._subject)}</span>` : ''}
        ${q.topic ? `<span class="badge badge--neutral">${escapeHtml(q.topic)}</span>` : ''}
        ${fromFailed ? '<span class="badge badge--fail">⟳ Repeat</span>' : ''}
      </div>
      <div class="question-text">${formatText(q.question)}</div>
      <div class="options-grid" id="options-grid" data-correct="${escapeHtml(q.correct_option)}" data-explanation="${escapeAttr(q.explanation || '')}">
        ${Object.entries(q.options).map(([letter, text]) => `
          <button class="option-btn" data-letter="${letter}" onclick="UI.selectOption(this, '${letter}')">
            <span class="option-letter">${letter}</span>
            <span class="option-text">${formatText(text)}</span>
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
        <button class="btn-explain" id="explain-btn" onclick="UI.explainSimpler()">
          💡 Explain It Simpler
        </button>
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
  const showSubject = Storage.getSubjects().length > 1;
  const totalMaxMarks = q.sub_questions.reduce((s, sq) => s + sq.max_marks, 0);
  return `
    <div class="question-card card type--theory animate-fade-in ${fromFailed ? 'type--failed' : ''}">
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
          <div class="sub-question-text">${formatText(sub.question)}</div>
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
        <div style="flex: 1;">
          <span class="sub-feedback-score" id="fscore-${sub.sub_id}"></span>
          <span class="sub-feedback-text" id="ftext-${sub.sub_id}"></span>
        </div>
        <button class="btn-explain" onclick="UI.explainSimpler('${sub.sub_id}')">
          💡 Explain Simpler
        </button>
      </div>
    </div>
  `;
}

// ---- Helpers ----
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
    return id;
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

  // 2. Configure marked for GFM and custom image with subtitle
  const renderer = new marked.Renderer();
  // Support both older and newer marked versions
  const originalImageRenderer = renderer.image.bind(renderer);
  renderer.image = (arg1, title, text) => {
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
    renderer: renderer,
    headerIds: false,
    mangle: false
  });

  // 3. Parse Markdown
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
    this.batch = batch;
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

    // Persist batch state (including _passed status)
    Storage.saveBatch(this.batch);

    // Check for comeback
    const isComeback = q._from_failed && passed;
    this.checkAchievements({ isComeback });

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

    let totalScore, maxScore, passed;
    try {
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
    ));
    } catch (err) {
      if (gradingOverlay) gradingOverlay.classList.add('hidden');
      showToast(`Grading failed: ${err.message}`, 'error');

      // Re-enable UI for retry
      q.sub_questions.forEach(sub => {
        const ta = document.getElementById(`answer-${sub.sub_id}`);
        if (ta) ta.disabled = false;
        const block = document.getElementById(`sub-block-${sub.sub_id}`);
        if (block) block.classList.remove('grading');
      });
      if (submitBtn) submitBtn.style.display = 'flex';
      this._gradingActive = false;
      return;
    }

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
    const q = this.batch[this.currentIdx];
    // Push skipped unseen questions back to unseen queue (don't count as failed)
    if (!q._from_failed) {
      if (q._type === 'obj') Storage.pushUnseenObj(q);
      else Storage.pushUnseenTheory(q);
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

  showBatchComplete(timedOut = false) {
    const wrapper = document.getElementById('question-wrapper');
    if (!wrapper) return;

    // Performance Calculations
    const answeredBatch = this.batch.slice(0, this.currentIdx);
    const correctCount = answeredBatch.filter(q => q._passed === true).length;
    const totalCount = answeredBatch.length;

    const startTime = Storage.getBatchStartTime();
    const durationMs = startTime ? Date.now() - startTime : 0;
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
    if (allPassed) {
      this.checkAchievements({ perfectBatchSize: totalCount });
    }

    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }

    // Cleanup storage after gathering metrics
    Storage.clearBatch();
    Storage.clearTimer();

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
                  <div class="topic-bar">
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
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    const currentSub = Storage.getSubject();
    const subStats = Storage.getStats(currentSub);

    const checkStats = {
      streak: streak,
      mastered_obj: globalStats.mastered_obj,
      mastered_theory: globalStats.mastered_theory,
      subject_done: Storage.isAllDone('both'),
      isEarlyBird: hour < 8,
      isNightOwl: hour >= 22,
      isWeekend: day === 0 || day === 6,
      perfectBatchSize: sessionFlags.perfectBatchSize || 0,
      isComeback: sessionFlags.isComeback || false,
      subject_mastered_count: subStats.mastered,
      subjects_started: Storage.getSubjectsStartedCount(),
      isMultiplayer: Storage.isMultiplayerDone()
    };

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

  startTimer(minutes) {
    const display = document.getElementById('timer-display');
    const valEl = document.getElementById('timer-val');
    if (!display || !valEl) return;

    display.style.display = 'flex';

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
    btn.innerHTML = `<div class="spinner"></div> Thinking...`;

    try {
      const { default: API } = await import('./api.js');
      const result = await API.explainConcept(payload);
      this.showExplanationModal(result.explanation);
    } catch (err) {
      showToast(`Could not get explanation: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  },

  showExplanationModal(markdown) {
    const modal = document.getElementById('explanation-modal');
    const body = document.getElementById('modal-explanation-body');
    if (!modal || !body) return;

    // Use formatText to handle markdown and latex
    body.innerHTML = formatText(markdown);
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Prevent scroll
  },

  closeExplanationModal() {
    const modal = document.getElementById('explanation-modal');
    if (modal) {
      modal.classList.remove('visible');
      document.body.style.overflow = '';
    }
  }
};

// Expose UI globally so inline onclick handlers work
window.UI = UI;

export { UI, updateNavStats, showToast };
