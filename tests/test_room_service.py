import unittest
from unittest.mock import patch
import sys
import os

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services import room_service

class TestRoomService(unittest.TestCase):

    def setUp(self):
        # Reset rooms before each test
        room_service.rooms = {}

    def test_create_room(self):
        room_id = room_service.create_room("p1_uuid", "sid1", "Alice", "obj")
        self.assertIn(room_id, room_service.rooms)
        room = room_service.rooms[room_id]
        self.assertEqual(room["host_id"], "p1_uuid")
        self.assertEqual(room["players"]["p1_uuid"]["name"], "Alice")
        self.assertEqual(room["mode"], "obj")

    def test_join_room_success(self):
        room_id = room_service.create_room("p1_uuid", "sid1", "Alice", "obj")
        success, result = room_service.join_room(room_id, "p2_uuid", "sid2", "Bob")

        self.assertTrue(success)
        self.assertIn("p2_uuid", result["players"])
        self.assertEqual(result["players"]["p2_uuid"]["name"], "Bob")

    def test_join_room_not_found(self):
        success, result = room_service.join_room("INVALID", "p2_uuid", "sid2", "Bob")
        self.assertFalse(success)
        self.assertEqual(result, "Room not found")

    def test_join_room_full(self):
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        for i in range(2, 6):
            room_service.join_room(room_id, f"p{i}", f"s{i}", f"Player{i}")

        # Room now has 5 players
        success, result = room_service.join_room(room_id, "p6", "s6", "Player6")
        self.assertFalse(success)
        self.assertEqual(result, "Room is full (max 5 players)")

    def test_leave_room_host_transfer(self):
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        room_service.join_room(room_id, "p2", "s2", "Bob")

        # Host (p1) leaves
        room_service.leave_room(room_id, "p1")

        room = room_service.rooms[room_id]
        self.assertEqual(room["host_id"], "p2")
        self.assertNotIn("p1", room["players"])

    def test_leave_room_cleanup(self):
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        room_service.leave_room(room_id, "p1")

        self.assertNotIn(room_id, room_service.rooms)

    @patch("backend.services.room_service.load_questions")
    def test_start_game(self, mock_load):
        mock_load.return_value = {
            "success": True,
            "data": {
                "obj": [{"id": "o1"}, {"id": "o2"}],
                "theory": [{"id": "t1"}]
            }
        }

        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        success, result = room_service.start_game(room_id, "p1", total_questions=2)

        self.assertTrue(success)
        self.assertEqual(len(result["questions"]), 2)
        self.assertEqual(result["status"], "playing")
        self.assertEqual(result["players"]["p1"]["total"], 2)

    def test_update_progress_and_finish(self):
        # Mock room state for playing
        room_id = "TESTROOM"
        room_service.rooms[room_id] = {
            "status": "playing",
            "players": {
                "p1": {"progress": 0, "score": 0, "finished": False},
                "p2": {"progress": 0, "score": 0, "finished": False}
            }
        }

        # p1 updates progress
        success, finished = room_service.update_player_progress(room_id, "p1", 5, 10, finished=False)
        self.assertTrue(success)
        self.assertFalse(finished)
        self.assertEqual(room_service.rooms[room_id]["players"]["p1"]["progress"], 5)

        # p1 finishes
        success, finished = room_service.update_player_progress(room_id, "p1", 10, 20, finished=True)
        self.assertTrue(success)
        self.assertFalse(finished) # p2 still not finished

        # p2 finishes
        success, finished = room_service.update_player_progress(room_id, "p2", 10, 15, finished=True)
        self.assertTrue(success)
        self.assertTrue(finished)
        self.assertEqual(room_service.rooms[room_id]["status"], "finished")

    def test_add_message(self):
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        msg = room_service.add_message(room_id, "Alice", "Hello!")

        self.assertEqual(msg["text"], "Hello!")
        self.assertEqual(len(room_service.rooms[room_id]["messages"]), 1)

if __name__ == '__main__':
    unittest.main()
