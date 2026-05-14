import requests
import json
from backend.config import Config


class GradingError(Exception):
    """Custom exception for grading failures that should not be treated as a score of 0."""
    pass


def grade_sub_question(sub_question: str, student_answer: str, rubric: str, max_marks: int) -> dict:
    """
    Sends a single sub-question answer to OpenRouter for AI grading.
    Returns a dict with 'score' (int) and 'feedback' (str).
    """
    if not Config.OPENROUTER_API_KEY:
        raise GradingError("No API key configured. Please add your OPENROUTER_API_KEY to the .env file.")

    if not student_answer or not str(student_answer).strip():
        return {
            "score": 0,
            "feedback": "No answer was provided for this sub-question."
        }

    prompt = f"""You are a strict but fair WAEC (West African Examinations Council) examiner for Nigeria.

Your task is to grade ONE specific sub-question answer.

SUB-QUESTION:
{sub_question}

STUDENT'S ANSWER:
{student_answer}

MARKING RUBRIC:
{rubric}

MAXIMUM MARKS AVAILABLE: {max_marks}

Instructions:
- Grade ONLY the answer to this specific sub-question.
- NOTE: The provided MARKING RUBRIC may be INCOMPLETE. If the student's answer is factually correct based on your internal knowledge but missing from the rubric, you SHOULD still award marks. Use the rubric as a guide, but rely on your internal expertise to ensure fair and accurate grading.
- Apply these standards strictly. Do not give marks for vague or irrelevant statements.
- Your response MUST be a valid JSON object and NOTHING ELSE. No preamble, no explanation outside the JSON.
- The JSON must have exactly two keys:
  - "score": an integer from 0 to {max_marks}
  - "feedback": a single, concise sentence (max 25 words) explaining what the student got right or wrong.

Example valid response:
{{"score": 2, "feedback": "Correct definition of cellular respiration including ATP production and breakdown of glucose."}}

Now grade the student's answer:"""

    headers = {
        "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://waec-grinder.local",
        "X-Title": "WAEC Grinder Study Tool"
    }

    payload = {
        "model": Config.LLM_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 150,
        "temperature": 0.1
    }

    try:
        response = requests.post(
            Config.OPENROUTER_BASE_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        raw_content = data["choices"][0]["message"].get("content")
        if raw_content is None:
            raise GradingError("The AI returned an empty response. Please try again.")

        raw_text = raw_content.strip()

        # Strip any markdown fences if the model added them
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").strip()
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()

        result = json.loads(raw_text)

        # Sanitise: ensure score is within valid range
        score = int(result.get("score", 0))
        score = max(0, min(score, max_marks))
        feedback = str(result.get("feedback", "No feedback provided."))

        return {"score": score, "feedback": feedback}

    except requests.exceptions.Timeout:
        raise GradingError("Grading timed out. Check your internet connection and try again.")
    except requests.exceptions.HTTPError as e:
        body = ""
        try:
            body = e.response.text
        except Exception:
            body = "<unavailable>"
        if e.response.status_code == 401:
            raise GradingError("Invalid API key. Please check your OPENROUTER_API_KEY in the .env file.")
        raise GradingError(f"API error: {e.response.status_code}. Response: {body[:200]}")
    except (json.JSONDecodeError, KeyError):
        raise GradingError("The AI returned an unexpected response format. Please try again.")
    except GradingError:
        raise
    except Exception as e:
        raise GradingError(f"An unexpected error occurred: {str(e)[:60]}")
