// ============================================
// WAEC GRINDER — API Module
// Handles all fetch() calls to Flask backend
// ============================================

import APP_CONFIG from './config.js';

const API = {
  async getQuestions() {
    const res = await fetch(`${APP_CONFIG.API_BASE}/questions`);
    if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
    return res.json();
  },

  async getConfig() {
    const res = await fetch(`${APP_CONFIG.API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to load config');
    return res.json();
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
    if (!res.ok) throw new Error(`Grading request failed (${res.status})`);
    return res.json();
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
