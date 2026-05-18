const ACHIEVEMENTS = [
  // 🇳🇬 The "WAEC Flavor"
  { id: 'a1_parallel', title: 'A1 Parallel', description: 'Master 100 questions across 3 different subjects.', icon: '🥇' },
  { id: 'senior_prefect', title: 'Senior Prefect', description: 'Create and host 10 multiplayer rooms.', icon: '👔' },
  { id: 'efiko', title: 'Efiko / Bookworm', description: 'Complete a batch between 12:00 AM and 4:00 AM.', icon: '🦉' },
  { id: 'jambite_no_more', title: 'Jambite No More', description: 'Achieve 100% mastery in your first full subject.', icon: '🎓' },
  { id: 'oga_at_the_top', title: 'Oga at the Top', description: 'Place 1st in a fully loaded 5-player multiplayer room.', icon: '👑' },

  // ⚙️ The Grinder
  { id: 'the_grind_begins', title: 'The Grind Begins', description: 'Complete your very first batch.', icon: '⚙️' },
  { id: 'century_maker', title: 'Century Maker', description: 'Master 100 OBJ questions.', icon: '💯' },
  { id: 'grandmaster', title: 'Grandmaster', description: 'Master 500 OBJ questions.', icon: '🐉' },
  { id: 'waec_conqueror', title: 'WAEC Conqueror', description: 'Master 1,000 total questions.', icon: '🗻' },
  { id: 'essayist', title: 'Essayist', description: 'Master 50 Theory questions.', icon: '✍️' },
  { id: 'nobel_laureate', title: 'Nobel Laureate', description: 'Master 200 Theory questions.', icon: '📜' },
  { id: 'polymath', title: 'Polymath', description: 'Start a study session with 3 or more subjects merged together.', icon: '🧠' },
  { id: 'queue_cleaner', title: 'Queue Cleaner', description: 'End a session with exactly 0 questions in your Failed Queue.', icon: '🧹' },
  { id: 'stubborn_bugger', title: 'Stubborn Bugger', description: 'Fail the same question 5 times before finally passing it.', icon: '🪨' },
  { id: 'second_wind', title: 'Second Wind', description: 'Score below 40% in one batch, then get 100% in the immediate next batch.', icon: '🌬️' },
  { id: 'from_the_ashes', title: 'From the Ashes', description: 'Clear a failed queue that had over 20 questions backed up in it.', icon: '🦅' },

  // 🔥 Streaks & Consistency
  { id: 'weekend_warrior', title: 'Weekend Warrior', description: 'Complete at least one batch on both Saturday and Sunday.', icon: '⚔️' },
  { id: '7_day_scholar', title: '7-Day Scholar', description: 'Reach a 7-day study streak.', icon: '📅' },
  { id: 'fortnight_focus', title: 'Fortnight Focus', description: 'Reach a 14-day study streak.', icon: '🗓️' },
  { id: 'monthly_menace', title: 'Monthly Menace', description: 'Reach a 30-day study streak.', icon: '🌕' },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a batch before 6:00 AM.', icon: '🌅' },
  { id: 'lunch_break_scholar', title: 'Lunch Break Scholar', description: 'Complete a batch between 12:00 PM and 1:00 PM.', icon: '🍱' },
  { id: 'review_routine', title: 'Maintenance Routine', description: 'Complete 5 "Review Mastered" mode sessions.', icon: '🔄' },

  // 🎯 Perfection & AI Theory Grading
  { id: 'flawless_batch_10', title: 'Flawless Victory', description: 'Get 100% in a batch of 10+ questions.', icon: '🎯' },
  { id: 'godlike', title: 'Godlike', description: 'Get 100% in a massive batch of 50 questions.', icon: '👼' },
  { id: 'theory_perfect', title: 'Flawless Logic', description: 'Score maximum available marks on a multi-part theory question (e.g., 10/10).', icon: '⚖️' },
  { id: 'first_try_theory', title: 'First Try, No Warmup', description: 'Pass a Theory question on your very first attempt without ever failing it.', icon: '🥇' },
  { id: 'ai_whisperer', title: 'AI Whisperer', description: 'Pass 5 Theory questions in a row with the AI giving you perfect marks.', icon: '🤖' },
  { id: 'curious_mind', title: 'Curious Mind', description: 'Use the "💡 Explain Simpler" AI button 10 times.', icon: '🧐' },
  { id: 'hyper_focused', title: 'Hyper-Focused', description: 'Start a session directly from the "Your Weakest Areas" dashboard widget.', icon: '🔬' },
  { id: 'randomizer_mvp', title: 'Chaos Tamer', description: 'Get a perfect batch while "Randomize Options" is turned ON.', icon: '🎲' },

  // ⏱️ Speed & Timed Sessions
  { id: 'speed_demon', title: 'Speed Demon', description: 'Finish a batch of 10 OBJ questions in under 2 minutes.', icon: '🏎️' },
  { id: 'buzzer_beater', title: 'Buzzer Beater', description: 'Submit a passing theory answer with less than 10 seconds left on the session timer.', icon: '⏳' },
  { id: 'marathon_runner', title: 'Marathon Runner', description: 'Successfully complete a 30-minute timed session without leaving.', icon: '🏃‍♂️' },
  { id: 'time_lord', title: 'Time Lord', description: 'Finish a 50-question timed batch with more than 5 minutes to spare.', icon: '🕰️' },

  // 🤝 Multiplayer & Social
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Send 20 messages in the multiplayer room chat.', icon: '💬' },
  { id: 'friendly_rivalry', title: 'Friendly Rivalry', description: 'Complete 5 multiplayer matches.', icon: '🥊' },
  { id: 'podium_finish', title: 'Podium Finish', description: 'Finish in the Top 3 in a multiplayer room.', icon: '🥉' },
  { id: 'undisputed_champ', title: 'Undisputed Champion', description: 'Win 3 multiplayer games in a row.', icon: '🏆' },
  { id: 'photo_finish', title: 'Photo Finish', description: 'Win a multiplayer game by a margin of exactly 1 point.', icon: '📸' },
  { id: 'comeback_king_mp', title: 'The Comeback King', description: 'Be in last place halfway through a multiplayer match, but end up winning.', icon: '🎢' },
  { id: 'host_with_the_most', title: 'Host with the Most', description: 'Host a room that hits the maximum 5-player capacity.', icon: '🎪' },
  { id: 'lone_wolf', title: 'Lone Wolf', description: 'Win a multiplayer match where you are the only one who finished before the timer ran out.', icon: '🐺' },

  // 📚 Subject-Specific
  { id: 'einsteins_heir', title: 'Einstein\'s Heir', description: 'Master 50 Physics questions.', icon: '⚛️' },
  { id: 'grammar_nazi', title: 'Grammar Police', description: 'Master 50 English Language questions.', icon: '📖' },
  { id: 'pythagoras', title: 'Pythagoras', description: 'Master 50 Mathematics questions.', icon: '📐' },
  { id: 'lab_rat', title: 'Lab Rat', description: 'Master 50 Chemistry or Biology questions.', icon: '🔬' },
  { id: 'historian', title: 'Historian', description: 'Master 50 History or Civic Education questions.', icon: '🏛️' },
  { id: 'tech_bro', title: 'Tech Bro / Sis', description: 'Master 50 Computer Studies questions.', icon: '💻' },

  // 🛠️ Meta / System
  { id: 'custom_tailor', title: 'Custom Tailor', description: 'Play a session using a custom batch size (e.g., typing in 7 or 12).', icon: '✂️' },
  { id: 'mixed_bag', title: 'Mixed Bag', description: 'Complete a session with "Both (Recommended)" mode selected.', icon: '🎒' },
  { id: 'api_funder', title: 'API Heavyweight', description: 'Trigger the OpenRouter grading API 100 times.', icon: '💳' },
  { id: 'the_true_grinder', title: 'The True Grinder', description: 'Accumulate a total of 24 hours of active study time inside the app.', icon: '🌌' }
];

const AchievementEngine = {
  ACHIEVEMENTS,
  checkNew(stats, earnedIds) {
    const newlyUnlocked = [];
    const getAch = (id) => this.ACHIEVEMENTS.find(a => a.id === id);

    const check = (id, condition) => {
      if (!earnedIds.includes(id) && condition) {
        const a = getAch(id);
        if (a) newlyUnlocked.push(a);
      }
    };

    // stats contains current session data + global persistence data

    // 🇳🇬 The "WAEC Flavor"
    check('a1_parallel', stats.mastered_total >= 100 && stats.subjects_with_mastery >= 3);
    check('senior_prefect', stats.multi_stats.rooms_hosted >= 10);
    check('efiko', stats.isBatchEnd && stats.currentHour >= 0 && stats.currentHour < 4);
    check('jambite_no_more', stats.subjects_mastered_all.length >= 1);
    check('oga_at_the_top', stats.isMultiWin && stats.multiCapacity >= 5);

    // ⚙️ The Grinder
    check('the_grind_begins', stats.batches_completed >= 1);
    check('century_maker', stats.mastered_obj >= 100);
    check('grandmaster', stats.mastered_obj >= 500);
    check('waec_conqueror', stats.mastered_total >= 1000);
    check('essayist', stats.mastered_theory >= 50);
    check('nobel_laureate', stats.mastered_theory >= 200);
    check('polymath', stats.subjects_merged >= 3);
    check('queue_cleaner', stats.isBatchEnd && stats.failedQueueSize === 0);
    check('stubborn_bugger', stats.max_fails_on_passed >= 5);
    check('second_wind', stats.isPerfectBatch && stats.lastBatchScore < 0.4);
    check('from_the_ashes', stats.isBatchEnd && stats.initialFailedQueueSize >= 20 && stats.failedQueueSize < stats.initialFailedQueueSize);

    // 🔥 Streaks & Consistency
    check('weekend_warrior', stats.isWeekendBatch);
    check('7_day_scholar', stats.streak >= 7);
    check('fortnight_focus', stats.streak >= 14);
    check('monthly_menace', stats.streak >= 30);
    check('early_bird', stats.isBatchEnd && stats.currentHour < 6);
    check('lunch_break_scholar', stats.isBatchEnd && stats.currentHour >= 12 && stats.currentHour < 13);
    check('review_routine', stats.system_stats.review_sessions_count >= 5);

    // 🎯 Perfection & AI Theory Grading
    check('flawless_batch_10', stats.isPerfectBatch && stats.batchSize >= 10);
    check('godlike', stats.isPerfectBatch && stats.batchSize >= 50);
    check('theory_perfect', stats.theoryMaxMarksAwarded);
    check('first_try_theory', stats.theoryFirstTryPass);
    check('ai_whisperer', stats.aiConsecutivePerfect >= 5);
    check('curious_mind', stats.system_stats.explain_simpler_count >= 10);
    check('hyper_focused', stats.isWeaknessStart);
    check('randomizer_mvp', stats.isPerfectBatch && stats.isRandomOptions);

    // ⏱️ Speed & Timed Sessions
    check('speed_demon', stats.isBatchEnd && stats.batchSize >= 10 && stats.batchType === 'obj' && stats.durationMs < 120000);
    check('buzzer_beater', stats.theoryPassUnder10s);
    check('marathon_runner', stats.isTimedSessionComplete && stats.timeLimit >= 30);
    check('time_lord', stats.isBatchEnd && stats.batchSize >= 50 && stats.isTimed && stats.timeRemainingMs >= 300000);

    // 🤝 Multiplayer & Social
    check('social_butterfly', stats.multi_stats.chat_messages >= 20);
    check('friendly_rivalry', stats.multi_stats.games_played >= 5);
    check('podium_finish', stats.multiRank <= 3 && stats.multiRank > 0);
    check('undisputed_champ', stats.multi_stats.win_streak >= 3);
    check('photo_finish', stats.isMultiWin && stats.multiMargin === 1);
    check('comeback_king_mp', stats.isMultiWin && stats.multiHalfwayLast);
    check('host_with_the_most', stats.multi_stats.max_capacity_rooms > 0);
    check('lone_wolf', stats.isMultiWin && stats.multiOnlyOneFinished);

    // 📚 Subject-Specific
    check('einsteins_heir', stats.mastered_per_subject['Physics'] >= 50);
    check('grammar_nazi', stats.mastered_per_subject['English Language'] >= 50);
    check('pythagoras', stats.mastered_per_subject['Mathematics'] >= 50);
    check('lab_rat', (stats.mastered_per_subject['Chemistry'] >= 50 || stats.mastered_per_subject['Biology'] >= 50));
    check('historian', (stats.mastered_per_subject['History'] >= 50 || stats.mastered_per_subject['Civic Education'] >= 50));
    check('tech_bro', (stats.mastered_per_subject['Computer Studies'] >= 50 || stats.mastered_per_subject['E-ICT (Digital Tech)'] >= 50 || stats.mastered_per_subject['Digital Tech - v3 (main)'] >= 50));

    // 🛠️ Meta / System
    check('custom_tailor', stats.isCustomBatch);
    check('mixed_bag', stats.isBatchEnd && stats.mode === 'both');
    check('api_funder', stats.system_stats.api_calls >= 100);
    check('the_true_grinder', stats.system_stats.total_study_time_ms >= 24 * 60 * 60 * 1000);

    return newlyUnlocked.filter(a => a !== undefined);
  }
};

export default AchievementEngine;
