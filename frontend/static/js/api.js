// ============================================
// WAEC GRINDER — API Module
// Handles all fetch() calls to Flask backend
// ============================================

import APP_CONFIG from './config.js';

const API = {
  /**
   * Internal helper to handle fetch responses and log errors.
   */
  async _handleResponse(res, context) {
    if (res.ok) return res.json();

    let errorData = null;
    try {
      errorData = await res.json();
    } catch (e) {
      // Body might not be JSON
    }

    console.error(`[API Error] ${context}:`, {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      serverError: errorData
    });

    const msg = errorData?.error || `Status ${res.status}`;
    throw new Error(`${context}: ${msg}`);
  },

  async getQuestions() {
    const res = await fetch(`${APP_CONFIG.API_BASE}/questions`);
    return this._handleResponse(res, 'Failed to load questions');
  },

  async getConfig() {
    const res = await fetch(`${APP_CONFIG.API_BASE}/config`);
    return this._handleResponse(res, 'Failed to load config');
  },

  /**
   * Grades a single theory sub-question.
   * @param {object} param
   * @param {string} param.sub_question
   * @param {string} param.student_answer
   * @param {string} param.rubric
   * @param {number} param.max_marks
   * @returns {Promise<{score: number, feedback: string, max_marks: number}>}
   */
  async gradeSubQuestion({ sub_question, student_answer, rubric, max_marks }) {
    const res = await fetch(`${APP_CONFIG.API_BASE}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub_question, student_answer, rubric, max_marks }),
    });
    return this._handleResponse(res, 'Grading request failed');
  },

  /**
   * Fetches a simplified AI explanation for a question.
   * @param {object} questionData
   * @returns {Promise<{explanation: string}>}
   */
  async explainConcept(questionData) {
    const res = await fetch(`${APP_CONFIG.API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData),
    });
    if (!res.ok) throw new Error(`Explanation request failed (${res.status})`);
    return res.json();
  },
};

export default API;
