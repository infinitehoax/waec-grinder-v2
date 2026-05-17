import unittest
from unittest.mock import patch, mock_open
import json
import sys
import os

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services import data_service

class TestDataService(unittest.TestCase):

    def setUp(self):
        # Reset the cache before each test
        data_service._cached_questions = None

    def test_load_questions_success(self):
        mock_data = {"obj": [], "theory": []}
        mock_json = json.dumps(mock_data)

        with patch("builtins.open", mock_open(read_data=mock_json)):
            result = data_service.load_questions()

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], mock_data)
        # Verify it was cached
        self.assertEqual(data_service._cached_questions, mock_data)

    def test_load_questions_cache(self):
        # Manually set the cache
        data_service._cached_questions = {"cached": True}

        # open should not be called if cache is hit
        with patch("builtins.open", mock_open()) as mocked_file:
            result = data_service.load_questions()

        self.assertTrue(result["success"])
        self.assertEqual(result["data"], {"cached": True})
        mocked_file.assert_not_called()

    def test_load_questions_file_not_found(self):
        with patch("builtins.open", side_effect=FileNotFoundError):
            result = data_service.load_questions()

        self.assertFalse(result["success"])
        self.assertIn("not found", result["error"])

    def test_load_questions_invalid_json(self):
        with patch("builtins.open", mock_open(read_data="invalid json")):
            result = data_service.load_questions()

        self.assertFalse(result["success"])
        self.assertIn("Invalid JSON", result["error"])

if __name__ == '__main__':
    unittest.main()
