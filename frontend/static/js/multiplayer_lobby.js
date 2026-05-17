/**
 * WAEC GRINDER — Multiplayer Lobby Logic
 */

import API from './api.js';
import Storage from './storage.js';
import socket from './socket_client.js';
import { showToast } from './ui.js';

const Lobby = {
    selectedMode: 'both',
    allQuestions: [],
    roomId: null,
    isHost: false,
    randomize_questions: false,
    randomize_options: false,

    async init() {
        socket.connect();
        this.setupSocketHandlers();

        try {
            this.allQuestions = await API.getQuestions();
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
    },

    renderSubjects() {
        const list = document.getElementById('subject-list');
        if (!list) return;

        list.innerHTML = this.allQuestions.map((s, idx) => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px; cursor:pointer;">
                <input type="checkbox" class="subject-checkbox" value="${s.subject}" ${idx === 0 ? 'checked' : ''}>
                <span style="font-size:0.85rem;">${s.subject}</span>
            </label>
        `).join('');
    },

    setupSocketHandlers() {
        socket.onRoomCreated = (data) => {
            this.roomId = data.room_id;
            this.isHost = true;
            this.showWaitingRoom(data.room_state);
        };

        socket.onRoomJoined = (data) => {
            this.roomId = data.room_id;
            this.isHost = false;
            this.showWaitingRoom(data.room_state);
        };

        socket.onPlayerJoined = (data) => {
            this.updatePlayerList(data.room_state);
            showToast(`${data.player_name} joined the room`, 'info');
        };

        socket.onPlayerLeft = (data) => {
            this.updatePlayerList(data.room_state);
            // If I become host
            if (data.room_state.host_id === Storage.getPlayerUuid() && !this.isHost) {
                this.isHost = true;
                this.showWaitingRoom(data.room_state);
                showToast("You are now the room host", "accent");
            }
        };

        socket.onGameStarted = (data) => {
            // Save state to storage for the study page to pick up
            Storage._set('multiplayer_room_id', this.roomId);
            Storage._set('multiplayer_is_host', this.isHost);
            Storage._set('multiplayer_questions', data.room_state.questions);
            Storage._set('multiplayer_time_limit', data.room_state.time_limit);

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
        const name = document.getElementById('create-name').value.trim();
        if (!name) return showToast('Please enter your name', 'error');

        const subjects = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(cb => cb.value);
        if (subjects.length === 0) return showToast('Select at least one subject', 'error');

        socket.createRoom(name, this.selectedMode, subjects);
    },

    joinRoom() {
        const name = document.getElementById('join-name').value.trim();
        const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();

        if (!name) return showToast('Please enter your name', 'error');
        if (!roomId) return showToast('Please enter Room ID', 'error');

        socket.joinRoom(roomId, name);
    },

    showWaitingRoom(state) {
        document.getElementById('lobby-setup').classList.add('hidden');
        document.getElementById('waiting-room').classList.remove('hidden');
        document.getElementById('display-room-id').textContent = this.roomId;

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

    toggleSetting(key) {
        if (!this.isHost) return;
        this[key] = !this[key];
        const badgeId = key === 'randomize_questions' ? 'random-q-badge' : 'random-o-badge';
        const badge = document.getElementById(badgeId);
        if (this[key]) {
            badge.textContent = 'ON';
            badge.className = 'badge badge--accent';
        } else {
            badge.textContent = 'OFF';
            badge.className = 'badge badge--neutral';
        }
    },

    startGame() {
        if (!this.isHost) return;
        const total = document.getElementById('total-questions').value;
        const timeLimit = document.getElementById('time-limit').value;

        socket.startGame(
            this.roomId,
            total,
            timeLimit,
            this.randomize_questions,
            this.randomize_options
        );
    },

    copyRoomId() {
        navigator.clipboard.writeText(this.roomId);
        showToast('Room ID copied to clipboard', 'success');
    },

    sendChatMessage() {
        const input = document.getElementById('lobby-chat-input');
        const text = input.value.trim();
        if (!text) return;

        const name = this.isHost
            ? document.getElementById('create-name').value.trim()
            : document.getElementById('join-name').value.trim();

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

    leaveRoom() {
        socket.leaveRoom(this.roomId);
        window.location.reload();
    }
};

export default Lobby;
