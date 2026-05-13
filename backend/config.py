import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    # Free model on OpenRouter — change to any other free model if needed
    LLM_MODEL = "minimax/minimax-m2.5:free"
    PASS_THRESHOLD = 0.5  # 50% to pass a theory question
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
