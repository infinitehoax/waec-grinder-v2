import json
import os

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'waec_questions.json')

# In-memory cache to prevent redundant disk I/O
_cached_questions = None

def load_questions() -> dict:
    """Loads and returns all questions from the JSON data file, using cache if available."""
    global _cached_questions
    if _cached_questions is not None:
        return {"success": True, "data": _cached_questions}

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)

        # Pre-tag questions with _type and _subject for faster processing in room_service
        # This reduces redundant dictionary allocations and merges during game startup.
        processed_data = []
        if isinstance(raw_data, list):
            for subject_data in raw_data:
                sub_name = subject_data.get("subject", "General")

                # Tag OBJ questions
                if "obj" in subject_data:
                    subject_data["obj"] = [
                        {**q, "_type": "obj", "_subject": sub_name, "_composite_id": f"{sub_name}|{q.get('id')}"}
                        for q in subject_data["obj"]
                    ]

                # Tag Theory questions
                if "theory" in subject_data:
                    subject_data["theory"] = [
                        {**q, "_type": "theory", "_subject": sub_name, "_composite_id": f"{sub_name}|{q.get('id')}"}
                        for q in subject_data["theory"]
                    ]

                processed_data.append(subject_data)

        _cached_questions = processed_data
        return {"success": True, "data": _cached_questions}
    except FileNotFoundError:
        return {"success": False, "error": "waec_questions.json not found. Please add your questions file."}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Invalid JSON in questions file: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to load questions: {str(e)}"}
