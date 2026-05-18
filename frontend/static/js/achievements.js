const ACHIEVEMENTS = [
  { id: 'first_blood', title: 'First Blood', description: 'Master your first question.', icon: '🩸' },
  { id: 'streak_3', title: 'On a Roll', description: 'Reach a 3-day streak.', icon: '🔥' },
  { id: 'streak_7', title: 'Legendary Consistency', description: 'Maintain a 7-day streak.', icon: '🏆' },
  { id: 'perfect_batch', title: 'Flawless Victory', description: 'Get a perfect score in a batch of 10+.', icon: '👑' },
  { id: 'comeback', title: 'Comeback Kid', description: 'Successfully master a previously failed question.', icon: '🥊' },
  { id: 'social', title: 'Social Scholar', description: 'Participate in a multiplayer room.', icon: '🤝' },
  { id: 'early_bird', title: 'Early Bird', description: 'Finish a study session before 8:00 AM.', icon: '🌅' },
  { id: 'night_owl', title: 'Night Owl', description: 'Finish a study session after 10:00 PM.', icon: '🦉' },
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Keep the grind going on a Saturday or Sunday.', icon: '⚔️' },
  { id: 'polymath', title: 'Polymath', description: 'Explore and start at least 5 different subjects.', icon: '🧬' },
  { id: 'marathon', title: 'Marathon Runner', description: 'Master 50 questions across all subjects.', icon: '🏃' },
  { id: 'completionist', title: 'Completionist', description: 'Master every single question in a subject.', icon: '💯' }
];

const AchievementEngine = {
  ACHIEVEMENTS,
  checkNew(stats, earnedIds) {
    const newlyUnlocked = [];

    const getAch = (id) => this.ACHIEVEMENTS.find(a => a.id === id);

    if (!earnedIds.includes('first_blood') && (stats.mastered_obj > 0 || stats.mastered_theory > 0)) {
      newlyUnlocked.push(getAch('first_blood'));
    }
    if (!earnedIds.includes('streak_3') && stats.streak >= 3) {
      newlyUnlocked.push(getAch('streak_3'));
    }
    if (!earnedIds.includes('streak_7') && stats.streak >= 7) {
      newlyUnlocked.push(getAch('streak_7'));
    }
    if (!earnedIds.includes('perfect_batch') && stats.perfectBatchSize >= 10) {
      newlyUnlocked.push(getAch('perfect_batch'));
    }
    if (!earnedIds.includes('comeback') && stats.isComeback) {
      newlyUnlocked.push(getAch('comeback'));
    }
    if (!earnedIds.includes('social') && stats.isMultiplayer) {
      newlyUnlocked.push(getAch('social'));
    }
    if (!earnedIds.includes('early_bird') && stats.isEarlyBird) {
      newlyUnlocked.push(getAch('early_bird'));
    }
    if (!earnedIds.includes('night_owl') && stats.isNightOwl) {
      newlyUnlocked.push(getAch('night_owl'));
    }
    if (!earnedIds.includes('weekend_warrior') && stats.isWeekend) {
      newlyUnlocked.push(getAch('weekend_warrior'));
    }
    if (!earnedIds.includes('polymath') && stats.subjects_started >= 5) {
      newlyUnlocked.push(getAch('polymath'));
    }
    if (!earnedIds.includes('marathon') && (stats.mastered_obj + stats.mastered_theory) >= 50) {
      newlyUnlocked.push(getAch('marathon'));
    }
    if (!earnedIds.includes('completionist') && stats.subject_done) {
      newlyUnlocked.push(getAch('completionist'));
    }

    return newlyUnlocked.filter(a => a !== undefined);
  }
};

export default AchievementEngine;
