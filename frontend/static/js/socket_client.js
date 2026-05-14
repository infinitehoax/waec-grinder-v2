// ============================================
// WAEC GRINDER — Socket Client Wrapper
// ============================================

const SocketClient = {
    socket: null,
    callbacks: {},
    player_uuid: null,

    init() {
        if (!this.player_uuid) {
            this.player_uuid = sessionStorage.getItem('wg_player_uuid');
            if (!this.player_uuid) {
                this.player_uuid = Math.random().toString(36).substring(2, 15);
                sessionStorage.setItem('wg_player_uuid', this.player_uuid);
            }
        }

        if (this.socket) return;
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            if (this.callbacks.onConnect) this.callbacks.onConnect();
        });

        this.socket.on('room_created', (data) => {
            if (this.callbacks.onRoomCreated) this.callbacks.onRoomCreated(data);
        });

        this.socket.on('room_joined', (data) => {
            if (this.callbacks.onRoomJoined) this.callbacks.onRoomJoined(data);
        });

        this.socket.on('player_joined', (data) => {
            if (this.callbacks.onPlayerJoined) this.callbacks.onPlayerJoined(data);
        });

        this.socket.on('game_started', (data) => {
            if (this.callbacks.onGameStarted) this.callbacks.onGameStarted(data);
        });

        this.socket.on('progress_updated', (data) => {
            if (this.callbacks.onProgressUpdated) this.callbacks.onProgressUpdated(data);
        });

        this.socket.on('player_left', (data) => {
            if (this.callbacks.onPlayerLeft) this.callbacks.onPlayerLeft(data);
        });

        this.socket.on('new_message', (data) => {
            if (this.callbacks.onNewMessage) this.callbacks.onNewMessage(data);
        });

        this.socket.on('game_finished', (data) => {
            if (this.callbacks.onGameFinished) this.callbacks.onGameFinished(data);
        });

        this.socket.on('error', (data) => {
            alert(data.message);
        });
    },

    createRoom(name, mode) {
        this.socket.emit('create_room', { name, mode, player_uuid: this.player_uuid });
    },

    joinRoom(roomId, name) {
        this.socket.emit('join_room', { room_id: roomId, name, player_uuid: this.player_uuid });
    },

    startGame(roomId) {
        this.socket.emit('start_game', { room_id: roomId, player_uuid: this.player_uuid });
    },

    updateProgress(roomId, progress, score, finished) {
        this.socket.emit('update_progress', { room_id: roomId, progress, score, finished, player_uuid: this.player_uuid });
    },

    sendMessage(roomId, name, text) {
        this.socket.emit('send_message', { room_id: roomId, name, text });
    },

    leaveRoom(roomId) {
        this.socket.emit('leave_room', { room_id: roomId, player_uuid: this.player_uuid });
    },

    on(event, callback) {
        this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
};

export default SocketClient;
