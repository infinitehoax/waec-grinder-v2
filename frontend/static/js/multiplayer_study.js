// ============================================
// WAEC GRINDER — Multiplayer Study Logic
// ============================================

import SocketClient from './socket_client.js';
import { UI, updateNavStats, showToast } from './ui.js';
import Storage from './storage.js';

const multiplayer_study = {
    roomState: null,
    roomId: null,
    myScore: 0,
    isFinished: false,
    _timerInterval: null,
    _wasHalfwayLast: false,

    init() {
        this._wasHalfwayLast = false;
        this.roomState = JSON.parse(sessionStorage.getItem('wg_multiplayer_room'));
        this.roomId = sessionStorage.getItem('wg_multiplayer_room_id');

        if (!this.roomState || !this.roomId) {
            window.location.href = '/multiplayer';
            return;
        }

        const myUuid = Storage.getPlayerUuid();

        // Restore score if re-joining
        if (this.roomState.players && myUuid) {
            const me = this.roomState.players[myUuid];
            if (me) this.myScore = me.score || 0;
        }

        const join = () => {
            const myName = sessionStorage.getItem('wg_multiplayer_name');
            console.log('Joining room:', this.roomId, 'as', myName);
            SocketClient.joinRoom(this.roomId, myName);
        };

        SocketClient.onConnect = join;

        SocketClient.onError = (msg) => {
            showToast(msg, 'error');
            if (msg === "Room not found") {
                setTimeout(() => window.location.href = '/multiplayer', 2000);
            }
        };

        SocketClient.onRoomJoined = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();
        };

        SocketClient.onPlayerJoined = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();
        };

        SocketClient.onProgressUpdated = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));

            // Note: We don't update this.myScore from roomState here to avoid race conditions.
            // Local this.myScore is the source of truth during active play.
            // On page refresh, it is restored in init().

            this.renderSidebar();

            if (this.roomState.status === 'finished') {
                this.showFinalScoreboard();
            }
        };

        SocketClient.onPlayerLeft = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();
        };

        SocketClient.onMessage = (data) => {
            this.appendMessage(data);
        };

        SocketClient.onGameFinished = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.showFinalScoreboard();
            Storage.incrementMultiStat('games_played');
        };

        SocketClient.onGameStarted = (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));

            // Sync randomization flags to storage
            Storage.setRandomizedQuestions(data.room_state.randomize_questions || false);
            Storage.setRandomizedOptions(data.room_state.randomize_options || false);

            // Re-init UI with new questions
            UI.batch = this.roomState.questions.map(q => ({ ...q, _is_multiplayer: true }));
            UI.currentIdx = 0;
            this.myScore = 0;
            this.isFinished = false;
            Storage.saveIdx(0);
            UI.renderCurrent();
            UI.updateProgress();
            this.renderSidebar();

            // Handle timer if any
            if (this._timerInterval) clearInterval(this._timerInterval);
            if (this.roomState.time_limit > 0 && this.roomState.end_time) {
                this.startTimer(this.roomState.end_time);
            }

            showToast("A new batch has started!", "success");
        };

        SocketClient.connect();

        // Initialize UI with room questions
        const questions = this.roomState.questions.map(q => ({ ...q, _is_multiplayer: true }));

        const myData = this.roomState.players[myUuid];
        if (myData) {
            this.myScore = myData.score || 0;
            UI.currentIdx = myData.progress || 0;
            this.isFinished = myData.finished || false;
            // Also update storage's currentIdx so UI doesn't overwrite it on reload
            import('./storage.js').then(({ default: Storage }) => {
                Storage.saveIdx(UI.currentIdx);
            });
        }

        // Override UI.nextQuestion and UI.selectOption/submitTheory to emit progress
        const originalNextQuestion = UI.nextQuestion;
        UI.nextQuestion = () => {
            originalNextQuestion.call(UI);
            console.log('Next question. Current index:', UI.currentIdx);
            this.emitProgress();
        };

        const originalSelectOption = UI.selectOption;
        UI.selectOption = (btn, letter) => {
            if (btn.disabled) return;
            originalSelectOption.call(UI, btn, letter);
            if (btn.classList.contains('correct')) {
                this.myScore++;
            }
            this.emitProgress();
        };

        const originalSubmitTheory = UI.submitTheory;
        UI.submitTheory = async () => {
            if (UI._gradingActive) return;
            const result = await originalSubmitTheory.call(UI);
            if (result && result.passed) {
                this.myScore++;
            }
            this.emitProgress();
        };

        // Custom showBatchComplete for multiplayer
        UI.showBatchComplete = () => {
            console.log('UI.showBatchComplete triggered');
            this.emitProgress(true);
            this.isFinished = true;

            const wrapper = document.getElementById('question-wrapper');
            if (!wrapper) return;

            wrapper.innerHTML = `
                <div class="card animate-bounce-in" style="text-align:center;padding:48px 32px">
                    <div style="font-size:3.5rem;margin-bottom:16px">🏁</div>
                    <h2 style="margin-bottom:8px">You've Finished!</h2>
                    <p style="margin-bottom:28px">Wait for others to complete the challenge.</p>
                    <div class="stats-grid" style="max-width:500px;margin:0 auto 32px">
                        <div class="stat-card stat--accent">
                            <div class="stat-card__value" id="final-score-val">${this.myScore} / ${UI.batch.length}</div>
                            <div class="stat-card__label">Final Score</div>
                        </div>
                    </div>
                    <div id="wait-message" style="margin-top: 20px; color: var(--text-muted);">
                        Waiting for all players to finish to see the final results...
                    </div>
                </div>
            `;

            if (this.roomState.status === 'finished') {
                this.showFinalScoreboard();
            }
        };

        // Add a cleanup method to prevent memory leaks
        this.cleanup = () => {
            if (this._timerInterval) {
                clearInterval(this._timerInterval);
                this._timerInterval = null;
            }
        };

        UI.batch = questions;
        // UI.currentIdx is already set from myData if available
        UI.renderCurrent();
        UI.updateProgress();
        this.renderSidebar();

        const batchTitle = document.getElementById('batch-title');
        if (batchTitle) batchTitle.textContent = `Room: ${this.roomId} — ${questions.length} questions`;

        if (this.roomState.time_limit > 0 && this.roomState.end_time) {
            this.startTimer(this.roomState.end_time);
        }

        const exitBtn = document.getElementById('exit-multiplayer');
        if (exitBtn) {
            exitBtn.onclick = () => {
                if (confirm('Are you sure you want to leave the room?')) {
                    SocketClient.leaveRoom(this.roomId);
                    window.location.href = '/multiplayer';
                }
            };
        }

        this.initChat();
    },

    emitProgress(finished = false) {
        if (this.isFinished && !finished) return;

        const progress = UI.currentIdx;
        const total = UI.batch.length;

        // Track halfway status for "Comeback King"
        if (progress === Math.floor(total / 2) && total >= 4 && !finished) {
            const myUuid = Storage.getPlayerUuid();
            const players = Object.entries(this.roomState.players);
            if (players.length > 1) {
                const sortedByProgress = players.sort((a, b) => b[1].progress - a[1].progress);
                if (sortedByProgress[sortedByProgress.length - 1][0] === myUuid) {
                    this._wasHalfwayLast = true;
                }
            }
        }

        const currentProgress = finished ? total : progress;
        const score = this.myScore;
        console.log('Emitting progress:', currentProgress, 'Score:', score, 'Finished:', finished);
        SocketClient.updateProgress(this.roomId, currentProgress, score, finished);
    },

    renderSidebar() {
        const list = document.getElementById('player-progress-list');
        if (!list) return;
        list.innerHTML = '';

        const myUuid = Storage.getPlayerUuid();

        Object.entries(this.roomState.players).forEach(([sid, player]) => {
            const isYou = sid === myUuid;
            const pct = player.total > 0 ? (player.progress / player.total) * 100 : 0;

            const item = document.createElement('div');
            item.className = 'player-progress-item';

            const info = document.createElement('div');
            info.className = 'player-info';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${player.name} ${isYou ? '(You)' : ''}`;

            const statSpan = document.createElement('span');
            statSpan.className = player.finished ? 'player-finished' : '';
            statSpan.textContent = player.finished ? `DONE (${player.score} pts)` : `${player.progress}/${player.total} (${player.score} pts)`;

            info.appendChild(nameSpan);
            info.appendChild(statSpan);

            const miniBar = document.createElement('div');
            miniBar.className = 'mini-bar';
            const miniFill = document.createElement('div');
            miniFill.className = 'mini-bar__fill';
            miniFill.style.width = `${pct}%`;
            miniBar.appendChild(miniFill);

            item.appendChild(info);
            item.appendChild(miniBar);
            list.appendChild(item);
        });
    },

    initChat() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send');
        if (!chatInput || !sendBtn) return;

        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (!text) return;
            const myName = sessionStorage.getItem('wg_multiplayer_name');
            Storage.incrementMultiStat('chat_messages');
            SocketClient.sendMessage(this.roomId, myName, text);
            chatInput.value = '';
        };

        sendBtn.onclick = sendMessage;
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };

        if (this.roomState.messages) {
            this.roomState.messages.forEach(msg => this.appendMessage(msg));
        }
    },

    appendMessage(msg) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'chat-msg';

        const strong = document.createElement('strong');
        strong.textContent = msg.name + ': ';
        const span = document.createElement('span');
        span.textContent = msg.text;

        div.appendChild(strong);
        div.appendChild(span);
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    startTimer(endTime) {
        const display = document.getElementById('timer-display');
        const valEl = document.getElementById('timer-val');
        if (!display || !valEl) return;

        display.style.display = 'flex';

        const update = () => {
            const now = Date.now();
            const diff = endTime - now;

            if (diff <= 0) {
                clearInterval(this._timerInterval);
                valEl.textContent = "0:00";
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
        if (!this.isFinished) {
            UI.showBatchComplete();
        }
    },

    startNextBatch() {
        const total = this.roomState.questions.length;
        SocketClient.startGame(
            this.roomId,
            total,
            this.roomState.time_limit,
            this.roomState.randomize_questions,
            this.roomState.randomize_options,
            this.roomState.filter_mastered
        );
    },

    showFinalScoreboard() {
        console.log('Showing final scoreboard');
        this.cleanup();
        const wrapper = document.getElementById('question-wrapper');
        if (!wrapper) return;

        const sortedPlayers = Object.entries(this.roomState.players)
            .sort((a, b) => b[1].score - a[1].score);

        // Stats tracking
        const myUuid = Storage.getPlayerUuid();
        const myIndex = sortedPlayers.findIndex(([sid, p]) => sid === myUuid);
        const myRank = myIndex + 1;
        const totalPlayers = sortedPlayers.length;
        const isWinner = myRank === 1;

        if (myRank <= 3) Storage.incrementMultiStat('top_3_finishes');
        if (isWinner) {
            Storage.incrementMultiStat('wins');
            Storage.incrementMultiStat('win_streak');
        } else {
            Storage.incrementMultiStat('win_streak', -999); // Reset streak
            const stats = Storage.getMultiStats();
            if (stats.win_streak < 0) stats.win_streak = 0;
            Storage._set('wg_multi_stats', stats);
        }

        if (totalPlayers >= 5) {
            Storage.incrementMultiStat('max_capacity_rooms');
        }

        // Logic for photo finish
        if (isWinner && totalPlayers > 1) {
            const myScore = sortedPlayers[0][1].score;
            const secondScore = sortedPlayers[1][1].score;
            if (myScore - secondScore === 1) {
                // Photo finish
                this._isPhotoFinish = true;
            }
        }

        // Check if I only finished
        const othersFinished = sortedPlayers.filter(([sid, p]) => sid !== myUuid && p.finished).length;
        if (isWinner && othersFinished === 0 && totalPlayers > 1) {
            this._isLoneWolf = true;
        }

        UI.checkAchievements({
            isMultiWin: isWinner,
            multiRank: myRank,
            multiCapacity: totalPlayers,
            multiMargin: isWinner && totalPlayers > 1 ? (sortedPlayers[0][1].score - sortedPlayers[1][1].score) : 0,
            multiOnlyOneFinished: isWinner && othersFinished === 0 && totalPlayers > 1,
            multiHalfwayLast: isWinner && this._wasHalfwayLast
        });

        wrapper.innerHTML = `
            <div class="card animate-bounce-in" style="text-align:center;padding:48px 32px">
                <div style="font-size:3.5rem;margin-bottom:16px">🏆</div>
                <h2 style="margin-bottom:24px">Final Results</h2>
                <div id="final-leaderboard" style="max-width:400px; margin: 0 auto 32px;">
                </div>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                    ${this.roomState.host_id === Storage.getPlayerUuid()
                        ? `<button onclick="multiplayer_study.startNextBatch()" class="btn btn--primary">Start Next Batch</button>`
                        : `<p style="color:var(--text-muted); width:100%">Waiting for host to start next batch...</p>`
                    }
                    <a href="/multiplayer" class="btn btn--secondary">New Room</a>
                    <a href="/" class="btn btn--ghost">Exit to Dashboard</a>
                </div>
            </div>
        `;

        const board = document.getElementById('final-leaderboard');
        sortedPlayers.forEach(([sid, p], idx) => {
            const div = document.createElement('div');
            div.className = `player-tag ${sid === myUuid ? 'is-you' : ''}`;
            div.style.marginBottom = '8px';

            const span = document.createElement('span');
            span.textContent = `#${idx+1} ${p.name}`;
            const strong = document.createElement('strong');
            strong.textContent = ` ${p.score} pts`;

            div.appendChild(span);
            div.appendChild(strong);
            board.appendChild(div);
        });
    }
};

export default multiplayer_study;
