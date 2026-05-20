import uuid
import random
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
        return True, rooms[room_id]

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
    return True, rooms[room_id]

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
        return True
    return False

import time

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

    all_obj = []
    all_theory = []

    # Aggregate mastered IDs from all players if filtering is requested
    mastered_pool = set()
    if filter_mastered:
        for p_data in rooms[room_id]["players"].values():
            mastered_pool.update(p_data.get("mastered_ids", []))

    for data in selected_data:
        sub_name = data.get("subject", "General")

        obj_qs = data.get("obj", [])
        theory_qs = data.get("theory", [])

        if filter_mastered:
            obj_qs = [q for q in obj_qs if q.get("id") not in mastered_pool]
            theory_qs = [q for q in theory_qs if q.get("id") not in mastered_pool]

        all_obj.extend([{**q, "_type": "obj", "_subject": sub_name} for q in obj_qs])
        all_theory.extend([{**q, "_type": "theory", "_subject": sub_name} for q in theory_qs])

    # Determine how many questions to take
    available_count = (len(all_obj) if mode == "obj" else
                       len(all_theory) if mode == "theory" else
                       (len(all_obj) + len(all_theory)))

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
        questions = random.sample(all_obj, count)
    elif mode == "theory":
        questions = random.sample(all_theory, count)
    else:
        # For mixed mode, try to maintain 70/30 split if possible
        obj_target = int(count * 0.7)
        theory_target = count - obj_target

        # Adjust if not enough questions in one category
        if len(all_obj) < obj_target:
            obj_target = len(all_obj)
            theory_target = min(len(all_theory), count - obj_target)
        if len(all_theory) < theory_target:
            theory_target = len(all_theory)
            obj_target = min(len(all_obj), count - theory_target)

        q_obj = random.sample(all_obj, obj_target)
        q_theory = random.sample(all_theory, theory_target)
        questions = q_obj + q_theory
        # We'll shuffle below if randomize_questions is true

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

    return True, rooms[room_id]

def update_player_progress(room_id, player_uuid, progress, score, finished=False):
    if room_id in rooms and player_uuid in rooms[room_id]["players"]:
        rooms[room_id]["players"][player_uuid]["progress"] = progress
        rooms[room_id]["players"][player_uuid]["score"] = score
        rooms[room_id]["players"][player_uuid]["finished"] = finished

        # Check if all players are finished
        all_finished = True
        for p_uuid, p_data in rooms[room_id]["players"].items():
            if not p_data.get("finished", False):
                all_finished = False
                break

        if all_finished and rooms[room_id]["status"] == "playing":
            rooms[room_id]["status"] = "finished"
            return True, True # Progress updated, game finished

        return True, False # Progress updated, game not finished
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

def get_room_state(room_id, include_questions=True):
    """
    Returns the state of a room.
    If include_questions is False, the 'questions' list is excluded to reduce payload size.
    """
    room = rooms.get(room_id)
    if not room:
        return None

    if include_questions:
        return room

    # Return a shallow copy without the questions
    state_copy = {k: v for k, v in room.items() if k != "questions"}
    return state_copy
