/**
 * WAEC GRINDER — Socket Client
 * Encapsulates all Socket.IO communication
 */

import Storage from './storage.js';

class SocketClient {
    constructor() {
        this.socket = null;
        this.roomState = null;
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameStarted = null;
        this.onProgressUpdated = null;
        this.onGameFinished = null;
        this.onMessage = null;
        this.onConnect = null;
        this.onError = null;
    }

    connect() {
        if (this.socket) return;
        this.socket = io();

        this.socket.on('connect', () => {
            if (this.onConnect) this.onConnect();
        });

        this.socket.on('room_created', (data) => {
            this.roomState = data.room_state;
            if (this.onRoomCreated) this.onRoomCreated(data);
        });

        this.socket.on('room_joined', (data) => {
            this.roomState = data.room_state;
            if (this.onRoomJoined) this.onRoomJoined(data);
        });

        this.socket.on('player_joined', (data) => {
            this.roomState = data.room_state;
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        });

        this.socket.on('player_left', (data) => {
            this.roomState = data.room_state;
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        });

        this.socket.on('game_started', (data) => {
            this.roomState = data.room_state;
            if (this.onGameStarted) this.onGameStarted(data);
        });

        this.socket.on('progress_updated', (data) => {
            this.roomState = data.room_state;
            if (this.onProgressUpdated) this.onProgressUpdated(data);
        });

        this.socket.on('game_finished', (data) => {
            this.roomState = data.room_state;
            if (this.onGameFinished) this.onGameFinished(data);
        });

        this.socket.on('new_message', (data) => {
            if (this.onMessage) this.onMessage(data);
        });

        this.socket.on('error', (data) => {
            if (this.onError) this.onError(data.message);
        });
    }

    createRoom(name, mode, subjects) {
        const player_uuid = Storage.getPlayerUuid();
        this.socket.emit('create_room', { name, mode, subjects, player_uuid });
    }

    joinRoom(roomId, name) {
        const player_uuid = Storage.getPlayerUuid();
        this.socket.emit('join_room', { room_id: roomId, name, player_uuid });
    }

    startGame(roomId, total_questions, time_limit, randomize_questions = false, randomize_options = false) {
        const player_uuid = Storage.getPlayerUuid();
        this.socket.emit('start_game', {
            room_id: roomId,
            player_uuid,
            total_questions,
            time_limit,
            randomize_questions,
            randomize_options
        });
    }

    updateProgress(roomId, progress, score, finished = false) {
        const player_uuid = Storage.getPlayerUuid();
        this.socket.emit('update_progress', { room_id: roomId, player_uuid, progress, score, finished });
    }

    sendMessage(roomId, name, text) {
        this.socket.emit('send_message', { room_id: roomId, name, text });
    }

    leaveRoom(roomId) {
        const player_uuid = Storage.getPlayerUuid();
        this.socket.emit('leave_room', { room_id: roomId, player_uuid });
    }
}

export default new SocketClient();
