from flask import Blueprint, jsonify, request
from backend.services.data_service import load_questions
from backend.services.llm_service import grade_sub_question, GradingError
from backend.config import Config

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/questions', methods=['GET'])
def get_questions():
    """Returns all questions from the data file."""
    result = load_questions()
    if result["success"]:
        return jsonify(result["data"]), 200
    else:
        return jsonify({"error": result["error"]}), 500


@api_bp.route('/grade', methods=['POST'])
def grade_answer():
    """
    Grades a single theory sub-question answer using AI.
    Expects JSON body:
    {
        "sub_question": "...",
        "student_answer": "...",
        "rubric": "...",
        "max_marks": 2
    }
    Returns:
    {
        "score": 2,
        "feedback": "...",
        "max_marks": 2
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    required_fields = ["sub_question", "student_answer", "rubric", "max_marks"]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        result = grade_sub_question(
            sub_question=data["sub_question"],
            student_answer=data["student_answer"],
            rubric=data["rubric"],
            max_marks=int(data["max_marks"])
        )

        result["max_marks"] = int(data["max_marks"])
        return jsonify(result), 200
    except GradingError as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route('/config', methods=['GET'])
def get_config():
    """Returns safe frontend config values."""
    return jsonify({
        "pass_threshold": Config.PASS_THRESHOLD,
        "has_api_key": bool(Config.OPENROUTER_API_KEY)
    }), 200
