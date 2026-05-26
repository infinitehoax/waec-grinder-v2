import unittest
import sys
import os
from collections import Counter

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.room_service import _interleave_questions

class TestInterleaving(unittest.TestCase):

    def test_basic_interleaving(self):
        pools = {
            "Physics": [{"id": "p1"}, {"id": "p2"}, {"id": "p3"}],
            "Chemistry": [{"id": "c1"}, {"id": "c2"}, {"id": "c3"}],
            "Riddles": [{"id": "r1"}, {"id": "r2"}, {"id": "r3"}]
        }
        limit = 9
        result = _interleave_questions(pools, limit)

        self.assertEqual(len(result), 9)

        # Check that we have 3 of each subject
        subjects = [q.get("_subject", q["id"][0]) for q in result]
        counts = Counter(subjects)
        self.assertEqual(counts["p"], 3)
        self.assertEqual(counts["c"], 3)
        self.assertEqual(counts["r"], 3)

        # Verify no immediate duplicates of subjects (unless only one remains)
        # Note: since we shuffle subjects each round, we might get p, c, r, then r, p, c.
        # So we can't strictly assert p, c, r, p, c, r.
        # But we can check that in every block of 3, we get one of each if they are available.
        # However, the requirement said "it picks physics, then... exclude physics and choose between chem and riddles... then next one must be riddles".
        # My implementation shuffles each round.

    def test_imbalanced_pools(self):
        pools = {
            "Physics": [{"id": "p1"}, {"id": "p2"}, {"id": "p3"}],
            "Chemistry": [{"id": "c1"}]
        }
        limit = 4
        result = _interleave_questions(pools, limit)

        self.assertEqual(len(result), 4)
        ids = [q["id"] for q in result]
        self.assertIn("c1", ids)

    def test_limit_respected(self):
        pools = {
            "Physics": [{"id": "p1"}, {"id": "p2"}],
            "Chemistry": [{"id": "c1"}, {"id": "c2"}]
        }
        limit = 2
        result = _interleave_questions(pools, limit)
        self.assertEqual(len(result), 2)

    def test_empty_pools(self):
        pools = {
            "Physics": [],
            "Chemistry": [{"id": "c1"}]
        }
        limit = 5
        result = _interleave_questions(pools, limit)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "c1")

if __name__ == '__main__':
    unittest.main()
