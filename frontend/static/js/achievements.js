// ============================================
// WAEC GRINDER — Achievement Logic
// ============================================

const ACHIEVEMENTS = [
  // --- Streak Achievements ---
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Studied for 3 consecutive days.',
    icon: '🔥',
    check: (stats) => stats.streak >= 3
  },
  {
    id: 'streak_7',
    title: 'Week on Fire',
    description: 'Studied for 7 consecutive days.',
    icon: '⚡',
    check: (stats) => stats.streak >= 7
  },
  {
    id: 'streak_14',
    title: 'Two-Week Titan',
    description: 'Studied for 14 consecutive days.',
    icon: '🏆',
    check: (stats) => stats.streak >= 14
  },
  {
    id: 'streak_30',
    title: 'Monthly Grinder',
    description: 'Studied for 30 consecutive days.',
    icon: '👑',
    check: (stats) => stats.streak >= 30
  },

  // --- Time-based Achievements ---
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Start a study session before 8:00 AM.',
    icon: '🌅',
    check: (stats) => stats.isEarlyBird
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Start a study session after 10:00 PM.',
    icon: '🦉',
    check: (stats) => stats.isNightOwl
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Keep the grind going on a Saturday or Sunday.',
    icon: '⚔️',
    check: (stats) => stats.isWeekend
  },

  // --- OBJ Mastery ---
  {
    id: 'obj_1',
    title: 'First Step',
    description: 'Mastered your first OBJ question.',
    icon: '🎯',
    check: (stats) => stats.mastered_obj >= 1
  },
  {
    id: 'obj_10',
    title: 'OBJ Apprentice',
    description: 'Mastered 10 OBJ questions.',
    icon: '📜',
    check: (stats) => stats.mastered_obj >= 10
  },
  {
    id: 'obj_50',
    title: 'OBJ Scholar',
    description: 'Mastered 50 OBJ questions.',
    icon: '🎓',
    check: (stats) => stats.mastered_obj >= 50
  },
  {
    id: 'obj_100',
    title: 'OBJ Master',
    description: 'Mastered 100 OBJ questions.',
    icon: '🎖️',
    check: (stats) => stats.mastered_obj >= 100
  },
  {
    id: 'obj_500',
    title: 'OBJ Legend',
    description: 'Mastered 500 OBJ questions.',
    icon: '💎',
    check: (stats) => stats.mastered_obj >= 500
  },

  // --- Theory Mastery ---
  {
    id: 'theory_1',
    title: 'Essayist',
    description: 'Passed your first Theory question.',
    icon: '✍️',
    check: (stats) => stats.mastered_theory >= 1
  },
  {
    id: 'theory_10',
    title: 'Theory Scholar',
    description: 'Passed 10 Theory questions.',
    icon: '🖋️',
    check: (stats) => stats.mastered_theory >= 10
  },
  {
    id: 'theory_50',
    title: 'Theory Master',
    description: 'Passed 50 Theory questions.',
    icon: '📚',
    check: (stats) => stats.mastered_theory >= 50
  },

  // --- Performance Achievements ---
  {
    id: 'perfect_batch',
    title: 'Perfect 10',
    description: 'Complete a batch of 10 questions with 100% accuracy.',
    icon: '💯',
    check: (stats) => stats.perfectBatchSize >= 10
  },
  {
    id: 'comeback_kid',
    title: 'Comeback Kid',
    description: 'Master a question you previously failed.',
    icon: '🔄',
    check: (stats) => stats.isComeback
  },

  // --- Subject & Breadth ---
  {
    id: 'subject_specialist',
    title: 'Subject Specialist',
    description: 'Master 25 questions in a single subject.',
    icon: '🔬',
    check: (stats) => stats.subject_mastered_count >= 25
  },
  {
    id: 'knowledge_seeker',
    title: 'Knowledge Seeker',
    description: 'Start studying in 3 different subjects.',
    icon: '🗺️',
    check: (stats) => stats.subjects_started >= 3
  },
  {
    id: 'subject_conqueror',
    title: 'Subject Conqueror',
    description: 'Mastered every single question in a subject.',
    icon: '🏔️',
    check: (stats) => stats.subject_done === true
  },

  // --- Social ---
  {
    id: 'multiplayer_fan',
    title: 'Social Butterfly',
    description: 'Join your first multiplayer session.',
    icon: '🦋',
    check: (stats) => stats.isMultiplayer
  }
];

const AchievementEngine = {
  get ACHIEVEMENTS() {
    return ACHIEVEMENTS;
  },

  /**
   * Check for any new achievements based on current stats and already earned ones.
   * @param {Object} stats - { streak, mastered_obj, mastered_theory, subject_done, ... }
   * @param {Array} earnedIds - Array of already earned achievement IDs
   * @returns {Array} Array of newly unlocked achievement objects
   */
  checkNew(stats, earnedIds) {
    const newUnlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (!earnedIds.includes(ach.id) && ach.check(stats)) {
        newUnlocked.push(ach);
      }
    }
    return newUnlocked;
  }
};

export default AchievementEngine;
