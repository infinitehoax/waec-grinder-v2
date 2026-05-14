// ============================================
// WAEC GRINDER — Multiplayer Study Logic
// ============================================

import SocketClient from './socket_client.js';
import { UI, updateNavStats } from './ui.js';

const multiplayer_study = {
    roomState: null,
    roomId: null,

    init() {
        this.roomState = JSON.parse(sessionStorage.getItem('wg_multiplayer_room'));
        this.roomId = sessionStorage.getItem('wg_multiplayer_room_id');

        if (!this.roomState || !this.roomId) {
            window.location.href = '/multiplayer';
            return;
        }

        SocketClient.init();

        const join = () => {
            const myName = sessionStorage.getItem('wg_multiplayer_name');
            console.log('Joining room:', this.roomId, 'as', myName);
            SocketClient.joinRoom(this.roomId, myName);
        };

        if (SocketClient.socket && SocketClient.socket.connected) {
            join();
        }
        SocketClient.on('connect', join);

        SocketClient.on('playerJoined', (data) => {
            console.log('Player joined room:', data.player_name);
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();
        });

        SocketClient.on('progressUpdated', (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();

            if (this.roomState.status === 'finished') {
                this.showFinalScoreboard();
            }
        });

        SocketClient.on('playerLeft', (data) => {
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.renderSidebar();
        });

        SocketClient.on('newMessage', (data) => {
            this.appendMessage(data);
        });

        SocketClient.on('gameFinished', (data) => {
            console.log('gameFinished event received');
            this.roomState = data.room_state;
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            this.showFinalScoreboard();
        });

        // Initialize UI with room questions
        const questions = this.roomState.questions;

        // Override UI.nextQuestion and UI.selectOption/submitTheory to emit progress
        const originalNextQuestion = UI.nextQuestion;
        UI.nextQuestion = () => {
            originalNextQuestion.call(UI);
            console.log('Next question. Current index:', UI.currentIdx);
            this.emitProgress();
        };

        const originalSelectOption = UI.selectOption;
        UI.selectOption = (btn, letter) => {
            originalSelectOption.call(UI, btn, letter);
            this.emitProgress();
        };

        const originalSubmitTheory = UI.submitTheory;
        UI.submitTheory = async () => {
            await originalSubmitTheory.call(UI);
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
                            <div class="stat-card__value" id="final-score-val">${questions.length}</div>
                            <div class="stat-card__label">Questions Completed</div>
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

        UI.batch = questions;
        UI.currentIdx = 0;
        UI.renderCurrent();
        UI.updateProgress();
        this.renderSidebar();

        const batchTitle = document.getElementById('batch-title');
        if (batchTitle) batchTitle.textContent = `Room: ${this.roomId} — ${questions.length} questions`;

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
        const currentProgress = finished ? total : progress;
        const score = currentProgress;
        console.log('Emitting progress:', currentProgress, 'Finished:', finished);
        SocketClient.updateProgress(this.roomId, currentProgress, score, finished);
    },

    renderSidebar() {
        const list = document.getElementById('player-progress-list');
        if (!list) return;
        list.innerHTML = '';

        Object.entries(this.roomState.players).forEach(([sid, player]) => {
            const isYou = sid === SocketClient.player_uuid;
            const pct = player.total > 0 ? (player.progress / player.total) * 100 : 0;

            const item = document.createElement('div');
            item.className = 'player-progress-item';

            const info = document.createElement('div');
            info.className = 'player-info';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${player.name} ${isYou ? '(You)' : ''}`;

            const statSpan = document.createElement('span');
            statSpan.className = player.finished ? 'player-finished' : '';
            statSpan.textContent = player.finished ? 'DONE' : `${player.progress}/${player.total}`;

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

    showFinalScoreboard() {
        console.log('Showing final scoreboard');
        const wrapper = document.getElementById('question-wrapper');
        if (!wrapper) return;

        const sortedPlayers = Object.entries(this.roomState.players)
            .sort((a, b) => b[1].score - a[1].score);

        wrapper.innerHTML = `
            <div class="card animate-bounce-in" style="text-align:center;padding:48px 32px">
                <div style="font-size:3.5rem;margin-bottom:16px">🏆</div>
                <h2 style="margin-bottom:24px">Final Results</h2>
                <div id="final-leaderboard" style="max-width:400px; margin: 0 auto 32px;">
                </div>
                <div style="display:flex;gap:12px;justify-content:center">
                    <a href="/multiplayer" class="btn btn--primary">Play Again</a>
                    <a href="/" class="btn btn--ghost">Exit to Dashboard</a>
                </div>
            </div>
        `;

        const board = document.getElementById('final-leaderboard');
        sortedPlayers.forEach(([sid, p], idx) => {
            const div = document.createElement('div');
            div.className = `player-tag ${sid === SocketClient.player_uuid ? 'is-you' : ''}`;
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
