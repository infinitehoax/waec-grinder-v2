/**
 * WAEC GRINDER — Multiplayer Lobby Logic
 */

import API from './api.js';
import Storage from './storage.js';
import socket from './socket_client.js';
import { showToast } from './ui.js';

const lobby = {
    selectedMode: 'both',
    allQuestions: [],
    roomId: null,
    isHost: false,
    randomize_questions: false,
    randomize_options: false,
    filter_mastered: false,
    totalQuestions: 10,
    timeLimit: 0,

    async init() {
        socket.connect();
        this.setupSocketHandlers();

        const savedName = Storage.getPlayerName();
        const isDefault = savedName.toLowerCase() === 'student';

        const createInput = document.getElementById('create-name');
        const joinInput = document.getElementById('join-name');

        if (createInput) createInput.value = isDefault ? '' : savedName;
        if (joinInput) joinInput.value = isDefault ? '' : savedName;

        try {
            const res = await API.getQuestions();
            this.allQuestions = Array.isArray(res) ? res : (res?.data || []);
            this.renderSubjects();
        } catch (e) {
            console.error(e);
        }

        // Chat listeners
        const chatInput = document.getElementById('lobby-chat-input');
        const sendBtn = document.getElementById('lobby-chat-send');
        if (sendBtn) {
            sendBtn.onclick = () => this.sendChatMessage();
        }
        if (chatInput) {
            chatInput.onkeypress = (e) => { if (e.key === 'Enter') this.sendChatMessage(); };
        }

        const exitBtn = document.getElementById('exit-waiting');
        if (exitBtn) exitBtn.onclick = () => this.leaveRoom();

        this.setupControlListeners();

        // Initialize mode UI
        this.selectMode(this.selectedMode);
    },

    setupControlListeners() {
        // Question count buttons
        document.querySelectorAll('.batch-size-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.batch-size-btn').forEach(b => {
                    b.classList.remove('active-size');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active-size');
                btn.setAttribute('aria-pressed', 'true');
                this.totalQuestions = btn.dataset.size === 'all' ? 'all' : parseInt(btn.dataset.size);
                const customInput = document.getElementById('custom-batch-size');
                if (customInput) customInput.value = '';
                this.updateHostControlUI('batch-config-card', true);
            };
        });

        const customBatch = document.getElementById('custom-batch-size');
        if (customBatch) {
            customBatch.oninput = (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) {
                    this.totalQuestions = val;
                    document.querySelectorAll('.batch-size-btn').forEach(b => b.classList.remove('active-size'));
                    this.updateHostControlUI('batch-config-card', true);
                } else {
                    this.totalQuestions = 10;
                    document.querySelectorAll('.batch-size-btn').forEach(b => b.classList.remove('active-size'));
                    const defaultBtn = document.querySelector('.batch-size-btn[data-size="10"]');
                    if (defaultBtn) defaultBtn.classList.add('active-size');
                }
            };
        }

        // Time limit buttons
        document.querySelectorAll('.timed-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.classList.contains('active-size')) {
                    btn.classList.remove('active-size');
                    btn.setAttribute('aria-pressed', 'false');
                    this.timeLimit = 0;
                    this.updateHostControlUI('timed-config-card', false);
                    return;
                }
                document.querySelectorAll('.timed-btn').forEach(b => {
                    b.classList.remove('active-size');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active-size');
                btn.setAttribute('aria-pressed', 'true');
                this.timeLimit = parseInt(btn.dataset.time);
                const customInput = document.getElementById('custom-time-limit');
                if (customInput) customInput.value = '';
                this.updateHostControlUI('timed-config-card', true);
            };
        });

        const customTime = document.getElementById('custom-time-limit');
        if (customTime) {
            customTime.oninput = (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) {
                    this.timeLimit = val;
                    document.querySelectorAll('.timed-btn').forEach(b => b.classList.remove('active-size'));
                    this.updateHostControlUI('timed-config-card', true);
                } else {
                    this.timeLimit = 0;
                    document.querySelectorAll('.timed-btn').forEach(b => b.classList.remove('active-size'));
                    this.updateHostControlUI('timed-config-card', false);
                }
            };
        }
    },

    updateHostControlUI(cardId, active) {
        const card = document.getElementById(cardId);
        if (!card) return;
        if (active) {
            card.style.borderColor = 'var(--accent)';
            card.style.opacity = '1';
        } else {
            card.style.borderColor = 'var(--border-subtle)';
            card.style.opacity = '0.7';
        }
    },

    renderSubjects() {
        const list = document.getElementById('subject-list');
        if (!list) return;

        if (!Array.isArray(this.allQuestions)) {
            list.innerHTML = '<div style="padding: 10px; color: var(--text-muted);">No subjects found.</div>';
            return;
        }

        list.innerHTML = this.allQuestions.map((s, idx) => `
            <label class="subject-item ${idx === 0 ? 'is-selected' : ''}">
                <input type="checkbox" class="subject-checkbox" value="${s.subject}" ${idx === 0 ? 'checked' : ''} onchange="lobby.updateSubjectUI(this)" style="width:18px; height:18px; accent-color:var(--accent);">
                <span style="font-size:0.9rem; font-weight:500;">${s.subject}</span>
            </label>
        `).join('');
    },

    updateSubjectUI(checkbox) {
        const item = checkbox.closest('.subject-item');
        if (item) {
            if (checkbox.checked) item.classList.add('is-selected');
            else item.classList.remove('is-selected');
        }
    },

    selectAllSubjects() {
        document.querySelectorAll('.subject-checkbox').forEach(cb => {
            cb.checked = true;
            this.updateSubjectUI(cb);
        });
    },

    selectNoneSubjects() {
        document.querySelectorAll('.subject-checkbox').forEach(cb => {
            cb.checked = false;
            this.updateSubjectUI(cb);
        });
    },

    setupSocketHandlers() {
        socket.onRoomCreated = (data) => {
            this.roomId = data.room_id;
            this.isHost = true;
            this._updateRoomState(data.room_state);
            this.showWaitingRoom(this.roomState);
        };

        socket.onRoomJoined = (data) => {
            this.roomId = data.room_id;
            this.isHost = false;

            this._updateRoomState(data.room_state);
            if (this.roomState.status === 'playing') {
                sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
                sessionStorage.setItem('wg_multiplayer_room_id', this.roomId);
                window.location.href = '/multiplayer/study';
            } else {
                this.showWaitingRoom(this.roomState);
            }
        };

        socket.onPlayerJoined = (data) => {
            this._updateRoomState(data.room_state);
            this.updatePlayerList(this.roomState);
            showToast(`${data.player_name} joined the room`, 'info');
        };

        socket.onPlayerLeft = (data) => {
            this._updateRoomState(data.room_state);
            this.updatePlayerList(this.roomState);
            // If I become host
            if (this.roomState.host_id === Storage.getPlayerUuid() && !this.isHost) {
                this.isHost = true;
                this.showWaitingRoom(this.roomState);
                showToast("You are now the room host", "accent");
            }
        };

        socket.onGameStarted = (data) => {
            this._updateRoomState(data.room_state);
            // Save state to sessionStorage for the study page to pick up
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(this.roomState));
            sessionStorage.setItem('wg_multiplayer_room_id', this.roomId);

            // Sync randomization flags to storage
            Storage.setRandomizedQuestions(data.room_state.randomize_questions || false);
            Storage.setRandomizedOptions(data.room_state.randomize_options || false);

            window.location.href = '/multiplayer/study';
        };

        socket.onMessage = (msg) => {
            this.appendChatMessage(msg);
        };

        socket.onError = (msg) => {
            showToast(msg, 'error');
        };
    },

    createRoom() {
        const nameInput = document.getElementById('create-name');
        const name = nameInput.value.trim();
        if (!name) return showToast('Please enter your name', 'error');
        if (name.toLowerCase() === 'student') return showToast('Please choose a name other than "Student"', 'error');

        Storage.setPlayerName(name);
        sessionStorage.setItem('wg_multiplayer_name', name);

        const subjects = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(cb => cb.value);
        if (subjects.length === 0) return showToast('Select at least one subject', 'error');

        Storage.incrementMultiStat('rooms_hosted');
        socket.createRoom(name, this.selectedMode, subjects);
    },

    joinRoom() {
        const nameInput = document.getElementById('join-name');
        const name = nameInput.value.trim();
        const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();

        if (!name) return showToast('Please enter your name', 'error');
        if (name.toLowerCase() === 'student') return showToast('Please choose a name other than "Student"', 'error');
        if (!roomId) return showToast('Please enter Room ID', 'error');

        Storage.setPlayerName(name);
        sessionStorage.setItem('wg_multiplayer_name', name);
        socket.joinRoom(roomId, name);
    },

    showWaitingRoom(state) {
        document.getElementById('lobby-setup').classList.add('hidden');
        document.getElementById('waiting-room').classList.remove('hidden');
        const displayEl = document.getElementById('display-room-id');
        if (displayEl) {
            displayEl.innerHTML = `ROOM ID: ${this.roomId} <span style="margin-left: 8px; opacity: 0.8;">📋</span>`;
        }

        if (this.isHost) {
            document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('guest-waiting').classList.add('hidden');
        } else {
            document.getElementById('host-controls').classList.add('hidden');
            document.getElementById('guest-waiting').classList.remove('hidden');
        }

        this.updatePlayerList(state);

        // Load messages
        const chatBox = document.getElementById('lobby-chat-messages');
        chatBox.innerHTML = '';
        if (state.messages) {
            state.messages.forEach(m => this.appendChatMessage(m));
        }
    },

    updatePlayerList(state) {
        const list = document.getElementById('player-list');
        if (!list) return;

        list.innerHTML = Object.entries(state.players).map(([uuid, p]) => {
            const isYou = uuid === Storage.getPlayerUuid();
            const isHost = uuid === state.host_id;
            return `
                <div class="player-tag ${isYou ? 'is-you' : ''} ${isHost ? 'is-host' : ''}">
                    <span>${isYou ? p.name + ' (You)' : p.name}</span>
                </div>
            `;
        }).join('');
    },

    selectMode(mode) {
        this.selectedMode = mode;
        document.querySelectorAll('.mode-card').forEach(c => {
            c.classList.remove('selected-mode');
            c.style.borderColor = 'var(--border-subtle)';
            c.style.background = '';
            c.setAttribute('aria-checked', 'false');
        });
        const active = document.querySelector(`.mode-card[data-mode="${mode}"]`);
        if (active) {
            active.classList.add('selected-mode');
            active.style.borderColor = 'var(--accent)';
            active.style.background = 'var(--accent-glow)';
            active.setAttribute('aria-checked', 'true');
        }
    },

    toggleSetting(key, badgeId) {
        if (!this.isHost) return;
        this[key] = !this[key];

        const cardIdMap = {
            'randomize_questions': 'random-questions-config-card',
            'randomize_options': 'random-options-config-card',
            'filter_mastered': 'filter-mastered-config-card'
        };
        const cardId = cardIdMap[key];
        const card = document.getElementById(cardId);
        const badge = document.getElementById(badgeId);

        if (this[key]) {
            if (badge) {
                badge.textContent = 'ON';
                badge.className = 'badge badge--accent';
            }
            if (card) {
                card.style.borderColor = 'var(--accent)';
                card.style.opacity = '1';
                card.setAttribute('aria-pressed', 'true');
            }
        } else {
            if (badge) {
                badge.textContent = 'OFF';
                badge.className = 'badge badge--neutral';
            }
            if (card) {
                card.style.borderColor = 'var(--border-subtle)';
                card.style.opacity = '0.7';
                card.setAttribute('aria-pressed', 'false');
            }
        }
    },

    startGame() {
        if (!this.isHost) return;

        socket.startGame(
            this.roomId,
            this.totalQuestions,
            this.timeLimit,
            this.randomize_questions,
            this.randomize_options,
            this.filter_mastered
        );
    },

    copyRoomId() {
        if (!this.roomId) return;

        const displayEl = document.getElementById('display-room-id');
        if (!displayEl) return;

        // Clear existing timeout if user clicks again
        if (this._copyTimeout) {
            clearTimeout(this._copyTimeout);
        }

        // Capture original state if not already saved
        if (!this._originalBadgeState) {
            this._originalBadgeState = {
                text: displayEl.textContent,
                ariaLabel: displayEl.getAttribute('aria-label')
            };
        }

        navigator.clipboard.writeText(this.roomId).then(() => {
            // Visual feedback - Using safer DOM methods
            displayEl.textContent = `ROOM ID: ${this.roomId} `;
            const icon = document.createElement('span');
            icon.className = 'animate-bounce-in';
            icon.style.marginLeft = '8px';
            icon.textContent = '✅';
            displayEl.appendChild(icon);

            displayEl.setAttribute('aria-label', 'Room ID copied');
            showToast('Room ID copied to clipboard', 'success');

            // Revert after 2 seconds
            this._copyTimeout = setTimeout(() => {
                displayEl.textContent = this._originalBadgeState.text;
                if (this._originalBadgeState.ariaLabel !== null) {
                    displayEl.setAttribute('aria-label', this._originalBadgeState.ariaLabel);
                } else {
                    displayEl.removeAttribute('aria-label');
                }
                this._originalBadgeState = null;
                this._copyTimeout = null;
            }, 2000);
        });
    },

    sendChatMessage() {
        const input = document.getElementById('lobby-chat-input');
        const text = input.value.trim();
        if (!text) return;

        const name = this.isHost
            ? document.getElementById('create-name').value.trim()
            : document.getElementById('join-name').value.trim();

        Storage.incrementMultiStat('chat_messages');
        socket.sendMessage(this.roomId, name, text);
        input.value = '';
    },

    appendChatMessage(msg) {
        const chatBox = document.getElementById('lobby-chat-messages');
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<strong>${msg.name}:</strong> ${msg.text}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    },

    _updateRoomState(newState) {
        if (!newState) return;
        // Merge strategy: if newState is missing questions or messages, preserve local ones
        if (this.roomState) {
            if (!newState.questions && this.roomState.questions) {
                newState.questions = this.roomState.questions;
            }
            if (!newState.messages && this.roomState.messages) {
                newState.messages = this.roomState.messages;
            }
        }
        this.roomState = newState;
    },

    leaveRoom() {
        socket.leaveRoom(this.roomId);
        window.location.reload();
    }
};

export default lobby;
