import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import os

# Add the project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.llm_service import grade_sub_question, GradingError

class TestLLMGrading(unittest.TestCase):

    @patch('backend.services.llm_service.Config')
    @patch('backend.services.llm_service.requests.post')
    def test_grade_sub_question_success(self, mock_post, mock_config):
        # Setup mock config
        mock_config.OPENROUTER_API_KEY = "test_key"
        mock_config.OPENROUTER_BASE_URL = "https://example.com"
        mock_config.LLM_MODEL = "test_model"

        # Setup mock response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"score": 5, "feedback": "Excellent answer."}'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        result = grade_sub_question("What is 1+1?", "2", "1+1 is 2", 5)

        self.assertEqual(result['score'], 5)
        self.assertEqual(result['feedback'], "Excellent answer.")

    @patch('backend.services.llm_service.Config')
    @patch('backend.services.llm_service.requests.post')
    def test_grade_sub_question_empty_response(self, mock_post, mock_config):
        # Setup mock config
        mock_config.OPENROUTER_API_KEY = "test_key"

        # Setup mock response with None content
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": None
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        with self.assertRaisesRegex(GradingError, "The AI returned an empty response"):
            grade_sub_question("What is 1+1?", "2", "1+1 is 2", 5)

    @patch('backend.services.llm_service.Config')
    @patch('backend.services.llm_service.requests.post')
    def test_grade_sub_question_markdown_fences(self, mock_post, mock_config):
        # Setup mock config
        mock_config.OPENROUTER_API_KEY = "test_key"

        # Setup mock response with markdown fences
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '```json\n{"score": 3, "feedback": "Good job."}\n```'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        result = grade_sub_question("What is 1+1?", "2", "1+1 is 2", 5)

        self.assertEqual(result['score'], 3)
        self.assertEqual(result['feedback'], "Good job.")

    @patch('backend.services.llm_service.Config')
    @patch('backend.services.llm_service.requests.post')
    def test_grade_sub_question_invalid_json(self, mock_post, mock_config):
        # Setup mock config
        mock_config.OPENROUTER_API_KEY = "test_key"

        # Setup mock response with invalid JSON
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "This is not JSON"
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        with self.assertRaisesRegex(GradingError, "could not be parsed as JSON"):
            grade_sub_question("What is 1+1?", "2", "1+1 is 2", 5)

    @patch('backend.services.llm_service.Config')
    @patch('backend.services.llm_service.requests.post')
    def test_grade_sub_question_with_preamble(self, mock_post, mock_config):
        # Setup mock config
        mock_config.OPENROUTER_API_KEY = "test_key"

        # Setup mock response with preamble and JSON
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": 'Here is the grade: {"score": 4, "feedback": "Good job!"} I hope this helps.'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        result = grade_sub_question("What is 1+1?", "2", "1+1 is 2", 5)

        self.assertEqual(result['score'], 4)
        self.assertEqual(result['feedback'], "Good job!")

if __name__ == '__main__':
    unittest.main()
