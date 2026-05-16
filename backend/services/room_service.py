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
#         "mode": "obj" | "theory" | "both"
#     }
# }
rooms = {}

def create_room(player_uuid, sid, host_name, mode, subject=None):
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
                "finished": False
            }
        },
        "questions": [],
        "status": "waiting",
        "mode": mode,
        "subject": subject,
        "messages": []
    }
    return room_id

def join_room(room_id, player_uuid, sid, player_name):
    if room_id not in rooms:
        return False, "Room not found"

    if rooms[room_id]["status"] == "finished":
        return False, "Game already finished"

    # Handle re-joining
    if player_uuid in rooms[room_id]["players"]:
        rooms[room_id]["players"][player_uuid]["sid"] = sid
        return True, rooms[room_id]

    if len(rooms[room_id]["players"]) >= 5:
        return False, "Room is full (max 5 players)"

    rooms[room_id]["players"][player_uuid] = {
        "sid": sid,
        "name": player_name,
        "progress": 0,
        "total": len(rooms[room_id]["questions"]),
        "score": 0,
        "finished": False
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

def start_game(room_id, host_id, total_questions=None, time_limit=0):
    if room_id not in rooms:
        return False, "Room not found"

    if rooms[room_id]["host_id"] != host_id:
        return False, "Only host can start the game"

    try:
        time_limit = int(time_limit)
    except:
        time_limit = 0

    # Load questions and prepare a batch for everyone
    result = load_questions()
    if not result["success"]:
        return False, "Failed to load questions"

    data_raw = result["data"]
    mode = rooms[room_id]["mode"]
    subject = rooms[room_id].get("subject")

    # Filter data by subject if specified
    if subject and isinstance(data_raw, list):
        data = next((s for s in data_raw if s.get("subject") == subject), None)
        if not data:
            return False, f"Subject '{subject}' not found"
    else:
        # Fallback to the first subject if none specified or data is not a list
        data = data_raw[0] if isinstance(data_raw, list) and len(data_raw) > 0 else data_raw

    questions = []
    all_obj = [{**q, "_type": "obj"} for q in data.get("obj", [])]
    all_theory = [{**q, "_type": "theory"} for q in data.get("theory", [])]

    # Determine how many questions to take
    if total_questions == "all":
        count = len(all_obj) + len(all_theory)
    elif isinstance(total_questions, int) and total_questions > 0:
        count = total_questions
    else:
        count = 10 # Default

    if mode == "obj":
        questions = random.sample(all_obj, min(count, len(all_obj)))
    elif mode == "theory":
        questions = random.sample(all_theory, min(count, len(all_theory)))
    else:
        # For mixed mode, try to maintain 70/30 split if possible
        obj_target = int(count * 0.7)
        theory_target = count - obj_target

        # Adjust if not enough questions in one category
        if len(all_obj) < obj_target:
            obj_target = len(all_obj)
            theory_target = count - obj_target
        if len(all_theory) < theory_target:
            theory_target = len(all_theory)
            obj_target = min(len(all_obj), count - theory_target)

        q_obj = random.sample(all_obj, obj_target)
        q_theory = random.sample(all_theory, theory_target)
        questions = q_obj + q_theory
        random.shuffle(questions)

    rooms[room_id]["questions"] = questions
    rooms[room_id]["status"] = "playing"
    rooms[room_id]["time_limit"] = time_limit
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

def get_room_state(room_id):
    return rooms.get(room_id)
