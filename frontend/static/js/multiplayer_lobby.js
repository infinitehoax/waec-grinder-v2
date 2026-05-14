// ============================================
// WAEC GRINDER — Multiplayer Lobby Logic
// ============================================

import SocketClient from './socket_client.js';

const lobby = {
    currentRoomId: null,
    currentRoomState: null,

    init() {
        SocketClient.init();

        SocketClient.on('roomCreated', (data) => {
            this.showWaitingRoom(data.room_id, data.room_state, true);
        });

        SocketClient.on('roomJoined', (data) => {
            sessionStorage.setItem('wg_multiplayer_name', document.getElementById('join-name').value.trim());
            if (data.room_state.status === 'playing') {
                sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(data.room_state));
                sessionStorage.setItem('wg_multiplayer_room_id', data.room_id);
                window.location.href = '/multiplayer/study';
                return;
            }
            this.showWaitingRoom(data.room_id, data.room_state, false);
        });

        SocketClient.on('playerJoined', (data) => {
            this.currentRoomState = data.room_state;
            this.updatePlayerList(data.room_state);
        });

        SocketClient.on('playerLeft', (data) => {
            this.currentRoomState = data.room_state;
            this.updatePlayerList(data.room_state);
        });

        SocketClient.on('newMessage', (data) => {
            this.appendMessage(data);
        });

        SocketClient.on('gameStarted', (data) => {
            sessionStorage.setItem('wg_multiplayer_room', JSON.stringify(data.room_state));
            sessionStorage.setItem('wg_multiplayer_room_id', this.currentRoomId);
            window.location.href = '/multiplayer/study';
        });
    },

    createRoom() {
        const name = document.getElementById('create-name').value.trim();
        const mode = document.getElementById('create-mode').value;
        if (!name) return alert('Please enter your name');
        sessionStorage.setItem('wg_multiplayer_name', name);
        SocketClient.createRoom(name, mode);
    },

    joinRoom() {
        const name = document.getElementById('join-name').value.trim();
        const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();
        if (!name || !roomId) return alert('Please enter name and Room ID');
        SocketClient.joinRoom(roomId, name);
    },

    startGame() {
        if (!this.currentRoomState || !this.currentRoomState.players) {
            return alert('Room state not loaded yet. Please wait.');
        }
        if (Object.keys(this.currentRoomState.players).length < 2) {
            return alert('Need at least 2 players to start');
        }
        SocketClient.startGame(this.currentRoomId);
    },

    showWaitingRoom(roomId, roomState, isHost) {
        this.currentRoomId = roomId;
        this.currentRoomState = roomState;
        document.getElementById('lobby-setup').classList.add('hidden');
        document.getElementById('waiting-room').classList.remove('hidden');
        document.getElementById('display-room-id').textContent = `ROOM ID: ${roomId}`;

        if (isHost) {
            document.getElementById('host-controls').classList.remove('hidden');
            document.getElementById('guest-waiting').classList.add('hidden');
        } else {
            document.getElementById('host-controls').classList.add('hidden');
            document.getElementById('guest-waiting').classList.remove('hidden');
        }

        const exitBtn = document.getElementById('exit-waiting');
        if (exitBtn) {
            exitBtn.onclick = () => {
                SocketClient.leaveRoom(this.currentRoomId);
                window.location.reload();
            };
        }

        this.updatePlayerList(roomState);
        this.initChat();
    },

    updatePlayerList(roomState) {
        if (!roomState) return;
        const list = document.getElementById('player-list');
        list.innerHTML = '';

        Object.entries(roomState.players).forEach(([sid, player]) => {
            const isHost = sid === roomState.host_id;
            const isYou = sid === SocketClient.player_uuid;

            const div = document.createElement('div');
            div.className = `player-tag ${isHost ? 'is-host' : ''} ${isYou ? 'is-you' : ''}`;
            div.textContent = player.name + (isYou ? ' (You)' : '');
            list.appendChild(div);
        });
    },

    initChat() {
        const chatInput = document.getElementById('lobby-chat-input');
        const sendBtn = document.getElementById('lobby-chat-send');
        if (!chatInput || !sendBtn) return;

        const sendMessage = () => {
            const text = chatInput.value.trim();
            if (!text) return;
            const myName = sessionStorage.getItem('wg_multiplayer_name');
            SocketClient.sendMessage(this.currentRoomId, myName, text);
            chatInput.value = '';
        };

        sendBtn.onclick = sendMessage;
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };

        // Load existing messages if any
        const container = document.getElementById('lobby-chat-messages');
        if (container && this.currentRoomState) {
            container.innerHTML = '';
            if (this.currentRoomState.messages) {
                this.currentRoomState.messages.forEach(msg => this.appendMessage(msg));
            }
        }
    },

    appendMessage(msg) {
        const container = document.getElementById('lobby-chat-messages');
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
    }
};

export default lobby;
