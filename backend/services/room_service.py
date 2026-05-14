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

def create_room(player_uuid, sid, host_name, mode):
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

def start_game(room_id, host_id):
    if room_id not in rooms:
        return False, "Room not found"

    if rooms[room_id]["host_id"] != host_id:
        return False, "Only host can start the game"

    # Load questions and prepare a batch for everyone
    result = load_questions()
    if not result["success"]:
        return False, "Failed to load questions"

    data_raw = result["data"]
    # Handle the list vs dict issue: waec_questions.json is a list of subject objects
    data = data_raw[0] if isinstance(data_raw, list) and len(data_raw) > 0 else data_raw
    mode = rooms[room_id]["mode"]

    questions = []
    # Simplified batching for multiplayer: take 10 random questions
    all_obj = [{**q, "_type": "obj"} for q in data.get("obj", [])]
    all_theory = [{**q, "_type": "theory"} for q in data.get("theory", [])]

    if mode == "obj":
        questions = random.sample(all_obj, min(10, len(all_obj)))
    elif mode == "theory":
        questions = random.sample(all_theory, min(5, len(all_theory)))
    else:
        q_obj = random.sample(all_obj, min(5, len(all_obj)))
        q_theory = random.sample(all_theory, min(3, len(all_theory)))
        questions = q_obj + q_theory
        random.shuffle(questions)

    rooms[room_id]["questions"] = questions
    rooms[room_id]["status"] = "playing"

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
