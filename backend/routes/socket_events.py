from flask import request
from flask_socketio import join_room, leave_room, emit
from backend.app import socketio
from backend.services import room_service

@socketio.on('create_room')
def handle_create_room(data):
    host_name = data.get('name', 'Player 1')
    mode = data.get('mode', 'both')
    subject = data.get('subject')
    player_uuid = data.get('player_uuid')
    if not player_uuid:
        return emit('error', {'message': 'Missing player_uuid'})

    room_id = room_service.create_room(player_uuid, request.sid, host_name, mode, subject)
    join_room(room_id)
    emit('room_created', {'room_id': room_id, 'room_state': room_service.get_room_state(room_id)})

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    player_name = data.get('name', 'Player')
    player_uuid = data.get('player_uuid')
    if not player_uuid:
        return emit('error', {'message': 'Missing player_uuid'})

    success, result = room_service.join_room(room_id, player_uuid, request.sid, player_name)

    if success:
        join_room(room_id)
        emit('room_joined', {'room_id': room_id, 'room_state': result})
        emit('player_joined', {'player_id': player_uuid, 'player_name': player_name, 'room_state': result}, to=room_id)
    else:
        emit('error', {'message': result})

@socketio.on('start_game')
def handle_start_game(data):
    room_id = data.get('room_id')
    player_uuid = data.get('player_uuid')
    success, result = room_service.start_game(room_id, player_uuid)

    if success:
        emit('game_started', {'room_state': result}, to=room_id)
    else:
        emit('error', {'message': result})

@socketio.on('update_progress')
def handle_update_progress(data):
    room_id = data.get('room_id')
    player_uuid = data.get('player_uuid')
    progress = data.get('progress')
    score = data.get('score')
    finished = data.get('finished', False)

    success, game_just_finished = room_service.update_player_progress(room_id, player_uuid, progress, score, finished)
    if success:
        state = room_service.get_room_state(room_id)
        emit('progress_updated', {
            'player_id': player_uuid,
            'progress': progress,
            'score': score,
            'finished': finished,
            'room_state': state
        }, to=room_id)

        if game_just_finished:
            emit('game_finished', {'room_state': state}, to=room_id)

@socketio.on('send_message')
def handle_send_message(data):
    room_id = data.get('room_id')
    player_name = data.get('name')
    text = data.get('text')
    msg = room_service.add_message(room_id, player_name, text)
    if msg:
        emit('new_message', msg, to=room_id)

@socketio.on('leave_room')
def handle_leave_room(data):
    room_id = data.get('room_id')
    player_uuid = data.get('player_uuid')
    if room_service.leave_room(room_id, player_uuid):
        leave_room(room_id)
        state = room_service.get_room_state(room_id)
        if state:
            emit('player_left', {'player_id': player_uuid, 'room_state': state}, to=room_id)
            # Check if this exit finished the game for others
            if state['status'] == 'playing':
                all_finished = True
                for p_data in state['players'].values():
                    if not p_data.get('finished'):
                        all_finished = False
                        break
                if all_finished:
                    state['status'] = 'finished'
                    emit('game_finished', {'room_state': state}, to=room_id)

@socketio.on('disconnect')
def handle_disconnect():
    # We don't remove players on disconnect anymore to allow re-joining
    # But we could broadcast that they are "away" if we wanted.
    pass
