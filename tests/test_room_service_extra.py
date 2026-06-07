import unittest
from unittest.mock import patch
import sys
import os

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services import room_service

class TestRoomServiceExtra(unittest.TestCase):

    def setUp(self):
        room_service.rooms = {}

    def test_empty_subjects_fallback(self):
        # When subjects are requested but none match, it should fallback to the first subject available
        with patch("backend.services.room_service.load_questions") as mock_load:
            mock_load.return_value = {
                "success": True,
                "data": [
                    {"subject": "Biology", "obj": [{"id": "b1", "_type": "obj", "_subject": "Biology", "_composite_id": "Biology|b1"}]},
                    {"subject": "Math", "obj": [{"id": "m1", "_type": "obj", "_subject": "Math", "_composite_id": "Math|m1"}]}
                ]
            }

            # Create room with a subject that doesn't exist in data
            room_id = room_service.create_room("p1", "s1", "Alice", "obj", subjects=["Physics"])
            success, result = room_service.start_game(room_id, "p1", total_questions=1)

            self.assertTrue(success)
            self.assertEqual(len(result["questions"]), 1)
            # Should fallback to the first subject in data (Biology)
            self.assertEqual(result["questions"][0]["_subject"], "Biology")

    def test_filter_mastered_composite_logic(self):
        # Verify that filtering uses composite IDs to avoid collisions
        with patch("backend.services.room_service.load_questions") as mock_load:
            mock_load.return_value = {
                "success": True,
                "data": [
                    {
                        "subject": "Biology",
                        "obj": [{"id": "q1", "_type": "obj", "_subject": "Biology", "_composite_id": "Biology|q1"}]
                    },
                    {
                        "subject": "Math",
                        "obj": [{"id": "q1", "_type": "obj", "_subject": "Math", "_composite_id": "Math|q1"}]
                    }
                ]
            }

            # Alice has mastered Biology|q1 but not Math|q1
            room_id = room_service.create_room("p1", "s1", "Alice", "obj", subjects=["Biology", "Math"], mastered_ids=["Biology|q1"])
            success, result = room_service.start_game(room_id, "p1", total_questions="all", filter_mastered=True)

            self.assertTrue(success)
            self.assertEqual(len(result["questions"]), 1)
            self.assertEqual(result["questions"][0]["_subject"], "Math")
            self.assertEqual(result["questions"][0]["id"], "q1")

    def test_host_migration_last_player(self):
        # If host leaves and only one player left, they become host
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        room_service.join_room(room_id, "p2", "s2", "Bob")

        room_service.leave_room(room_id, "p1")
        self.assertEqual(room_service.rooms[room_id]["host_id"], "p2")

        # If last player leaves, room is gone
        room_service.leave_room(room_id, "p2")
        self.assertNotIn(room_id, room_service.rooms)

    def test_anti_cheat_flag_persistence(self):
        room_id = room_service.create_room("p1", "s1", "Alice", "obj")
        room_service.start_game(room_id, "p1", anti_cheat=True)
        self.assertTrue(room_service.rooms[room_id]["anti_cheat"])

if __name__ == '__main__':
    unittest.main()
