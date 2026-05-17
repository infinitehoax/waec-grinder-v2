const ACHIEVEMENTS = [
  { id: 'first_blood', title: 'First Blood', description: 'Master your first question.', icon: '🩸' },
  { id: 'streak_3', title: 'On a Roll', description: 'Reach a 3-day streak.', icon: '🔥' },
  { id: 'perfect_batch', title: 'Flawless Victory', description: 'Get a perfect score in a batch of 10+.', icon: '👑' },
  { id: 'comeback', title: 'Comeback Kid', description: 'Successfully master a previously failed question.', icon: '🥊' },
  { id: 'social', title: 'Social Scholar', description: 'Participate in a multiplayer room.', icon: '🤝' }
];

const AchievementEngine = {
  ACHIEVEMENTS,
  checkNew(stats, earnedIds) {
    const newlyUnlocked = [];
    if (!earnedIds.includes('first_blood') && stats.mastered_obj > 0) newlyUnlocked.push(this.ACHIEVEMENTS[0]);
    if (!earnedIds.includes('streak_3') && stats.streak >= 3) newlyUnlocked.push(this.ACHIEVEMENTS[1]);
    if (!earnedIds.includes('perfect_batch') && stats.perfectBatchSize >= 10) newlyUnlocked.push(this.ACHIEVEMENTS[2]);
    if (!earnedIds.includes('comeback') && stats.isComeback) newlyUnlocked.push(this.ACHIEVEMENTS[3]);
    if (!earnedIds.includes('social') && stats.isMultiplayer) newlyUnlocked.push(this.ACHIEVEMENTS[4]);
    return newlyUnlocked;
  }
};
export default AchievementEngine;
