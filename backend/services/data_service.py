import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'waec_questions.json')


def load_questions() -> dict:
    """Loads and returns all questions from the JSON data file."""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {"success": True, "data": data}
    except FileNotFoundError:
        return {"success": False, "error": "waec_questions.json not found. Please add your questions file."}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Invalid JSON in questions file: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to load questions: {str(e)}"}


