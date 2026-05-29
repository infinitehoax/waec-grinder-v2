import uuid
import random
import time
from backend.services.data_service import load_questions

# In-memory storage for rooms
# rooms = {
#     room_id: {
#         "host_id": sid,
#         "players": {sid: {"name": name, "progress": 0, "total": 0, "score": 0}},
#         "questions": [],
#         "status": "waiting" | "playing" | "finished",
#         "mode": "obj" | "theory" | "both",
#         "subjects": [subject1, subject2],
#         "randomize_questions": bool,
#         "randomize_options": bool
#     }
# }
rooms = {}

def _interleave_questions(pools, limit):
    """
    Interleaves questions from multiple subject pools in a round-robin fashion.
    Shuffles the order of subjects in each round for variety.
    pools: dict of {subject_name: [list_of_questions]}
    """
    result = []
    # Work on a copy of the pools to avoid mutating the original
    current_pools = {sub: list(qs) for sub, qs in pools.items() if qs}
    active_subjects = list(current_pools.keys())

    while len(result) < limit and active_subjects:
        # Shuffle subjects for this round
        random.shuffle(active_subjects)

        next_active = []
        for sub in active_subjects:
            if len(result) >= limit:
                break

            if current_pools[sub]:
                result.append(current_pools[sub].pop(0))
                if current_pools[sub]:
                    next_active.append(sub)

        active_subjects = next_active

    return result

def create_room(player_uuid, sid, host_name, mode, subjects=None, mastered_ids=None):
    room_id = str(uuid.uuid4())[:6].upper()
    while room_id in rooms:
        room_id = str(uuid.uuid4())[:6].upper()

    rooms[room_id] = {
        "host_id": player_uuid,
        "players": {
            player_uuid: {
                "sid": sid,
                "name": host_name,
                "progress": 0,
                "total": 0,
                "score": 0,
                "finished": False,
                "mastered_ids": mastered_ids or []
            }
        },
        "questions": [],
        "status": "waiting",
        "mode": mode,
        "subjects": subjects or [],
        "messages": [],
        "randomize_questions": False,
        "randomize_options": False
    }
    return room_id

def join_room(room_id, player_uuid, sid, player_name, mastered_ids=None):
    if room_id not in rooms:
        return False, "Room not found"

    if rooms[room_id]["status"] == "finished":
        return False, "Game already finished"

    # Handle re-joining
    if player_uuid in rooms[room_id]["players"]:
        rooms[room_id]["players"][player_uuid]["sid"] = sid
        if mastered_ids is not None:
            rooms[room_id]["players"][player_uuid]["mastered_ids"] = mastered_ids
        return True, get_room_state(room_id)

    if len(rooms[room_id]["players"]) >= 5:
        return False, "Room is full (max 5 players)"

    rooms[room_id]["players"][player_uuid] = {
        "sid": sid,
        "name": player_name,
        "progress": 0,
        "total": len(rooms[room_id]["questions"]),
        "score": 0,
        "finished": False,
        "mastered_ids": mastered_ids or []
    }
    return True, get_room_state(room_id)

def leave_room(room_id, player_uuid):
    room = rooms.get(room_id)
    if room:
        if player_uuid in room["players"]:
            del room["players"][player_uuid]

            # If host leaves, pick a new host
            if player_uuid == room["host_id"]:
                if room["players"]:
                    room["host_id"] = list(room["players"].keys())[0]
                else:
                    rooms.pop(room_id, None)
                    return True

            # If room is empty, delete it
            if not room["players"]:
                rooms.pop(room_id, None)
            else:
                # Check if the remaining players are all finished
                check_room_finished(room_id)

        return True
    return False

def check_room_finished(room_id):
    """Checks if all players in a room have finished and updates status if so."""
    room = rooms.get(room_id)
    if not room or room["status"] != "playing":
        return False

    if not room["players"]:
        return False

    all_finished = True
    for p_data in room["players"].values():
        if not p_data.get("finished", False):
            all_finished = False
            break

    if all_finished:
        room["status"] = "finished"
        return True
    return False

def start_game(room_id, host_id, total_questions=None, time_limit=0, randomize_questions=False, randomize_options=False, filter_mastered=False):
    if room_id not in rooms:
        return False, "Room not found"

    if rooms[room_id]["host_id"] != host_id:
        return False, "Only host can start the game"

    try:
        time_limit = int(time_limit)
    except:
        time_limit = 0

    # Load questions
    result = load_questions()
    if not result["success"]:
        return False, "Failed to load questions"

    data_raw = result["data"]
    mode = rooms[room_id]["mode"]
    subjects = rooms[room_id].get("subjects", [])

    # Filter data by subjects
    selected_data = []
    if subjects and isinstance(data_raw, list):
        selected_data = [s for s in data_raw if s.get("subject") in subjects]

    if not selected_data:
        # Fallback to the first subject if none found or specified
        selected_data = [data_raw[0]] if isinstance(data_raw, list) and len(data_raw) > 0 else [data_raw]

    obj_by_subject = {}
    theory_by_subject = {}

    # Aggregate mastered IDs from all players if filtering is requested
    mastered_pool = set()
    if filter_mastered:
        for p_data in rooms[room_id]["players"].values():
            mastered_pool.update(p_data.get("mastered_ids", []))

    for data in selected_data:
        sub_name = data.get("subject")
        if mode == "obj" or mode == "both":
            # Always copy the list to prevent random.shuffle from mutating the in-memory cache in data_service
            obj_qs = list(data.get("obj", []))
            if filter_mastered:
                obj_qs = [q for q in obj_qs if q.get("id") not in mastered_pool]
            # Shuffle the individual subject pool before interleaving
            random.shuffle(obj_qs)
            obj_by_subject[sub_name] = obj_qs

        if mode == "theory" or mode == "both":
            # Always copy the list to prevent random.shuffle from mutating the in-memory cache in data_service
            theory_qs = list(data.get("theory", []))
            if filter_mastered:
                theory_qs = [q for q in theory_qs if q.get("id") not in mastered_pool]
            # Shuffle the individual subject pool before interleaving
            random.shuffle(theory_qs)
            theory_by_subject[sub_name] = theory_qs

    # Determine total available counts
    total_available_obj = sum(len(qs) for qs in obj_by_subject.values())
    total_available_theory = sum(len(qs) for qs in theory_by_subject.values())
    available_count = (total_available_obj if mode == "obj" else
                       total_available_theory if mode == "theory" else
                       (total_available_obj + total_available_theory))

    if total_questions == "all":
        count = available_count
    else:
        try:
            count = int(total_questions)
        except:
            count = 10

    count = min(count, available_count)

    questions = []
    if mode == "obj":
        questions = _interleave_questions(obj_by_subject, count)
    elif mode == "theory":
        questions = _interleave_questions(theory_by_subject, count)
    else:
        # For mixed mode, try to maintain 70/30 split if possible
        obj_target = int(count * 0.7)
        theory_target = count - obj_target

        # Adjust targets based on availability
        if total_available_obj < obj_target:
            obj_target = total_available_obj
            theory_target = min(total_available_theory, count - obj_target)
        if total_available_theory < theory_target:
            theory_target = total_available_theory
            obj_target = min(total_available_obj, count - theory_target)

        q_obj = _interleave_questions(obj_by_subject, obj_target)
        q_theory = _interleave_questions(theory_by_subject, theory_target)
        questions = q_obj + q_theory

    if randomize_questions:
        random.shuffle(questions)

    rooms[room_id]["questions"] = questions
    rooms[room_id]["filter_mastered"] = filter_mastered
    rooms[room_id]["status"] = "playing"
    rooms[room_id]["time_limit"] = time_limit
    rooms[room_id]["randomize_questions"] = randomize_questions
    rooms[room_id]["randomize_options"] = randomize_options

    if time_limit > 0:
        rooms[room_id]["end_time"] = (time.time() * 1000) + (time_limit * 60 * 1000)

    for p_id in rooms[room_id]["players"]:
        rooms[room_id]["players"][p_id]["total"] = len(questions)
        rooms[room_id]["players"][p_id]["progress"] = 0
        rooms[room_id]["players"][p_id]["score"] = 0
        rooms[room_id]["players"][p_id]["finished"] = False

    return True, get_room_state(room_id)

def update_player_progress(room_id, player_uuid, progress, score, finished=False):
    if room_id in rooms and player_uuid in rooms[room_id]["players"]:
        rooms[room_id]["players"][player_uuid]["progress"] = progress
        rooms[room_id]["players"][player_uuid]["score"] = score
        rooms[room_id]["players"][player_uuid]["finished"] = finished

        # Check if all players are finished
        game_just_finished = False
        if finished:
            game_just_finished = check_room_finished(room_id)

        return True, game_just_finished
    return False, False

def add_message(room_id, player_name, text):
    if room_id in rooms:
        msg = {"name": player_name, "text": text}
        rooms[room_id]["messages"].append(msg)
        # Keep last 50 messages
        if len(rooms[room_id]["messages"]) > 50:
            rooms[room_id]["messages"].pop(0)
        return msg
    return None

def _sanitize_player(p_data):
    """Returns a copy of player data without sensitive/large fields like sid and mastered_ids."""
    return {k: v for k, v in p_data.items() if k not in ['sid', 'mastered_ids']}

def get_room_state(room_id, include_questions=True):
    """
    Returns the state of a room.
    If include_questions is False, the 'questions' list is excluded to reduce payload size.
    All player objects are sanitized to remove sid and mastered_ids to save bandwidth.
    """
    room = rooms.get(room_id)
    if not room:
        return None

    # Always return a copy to prevent accidental mutation of the global state
    state_copy = {k: v for k, v in room.items() if k != "questions"}
    if include_questions:
        state_copy["questions"] = room["questions"]

    # Sanitize players to remove redundant and large mastered_ids/sid
    state_copy["players"] = {
        p_uuid: _sanitize_player(p_data)
        for p_uuid, p_data in room["players"].items()
    }

    return state_copy
