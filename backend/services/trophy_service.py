import requests
from backend.config import Config

# Global session for connection pooling to reduce TCP handshake latency for Trophy API calls
_http_session = requests.Session()

class TrophyService:
    @staticmethod
    def _get_headers():
        return {
            "X-API-KEY": Config.TROPHY_API_KEY,
            "Content-Type": "application/json"
        }

    @classmethod
    def track_event(cls, user_id, user_name, metric_key, value=1):
        if not Config.TROPHY_API_KEY:
            return None

        url = f"https://app.trophy.so/api/metrics/{metric_key}/event"
        payload = {
            "user": {
                "id": user_id,
                "name": user_name
            },
            "value": value
        }
        try:
            response = _http_session.post(url, headers=cls._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Trophy track_event error: {e}")
            return None

    @classmethod
    def get_leaderboard(cls, leaderboard_key, limit=10):
        if not Config.TROPHY_API_KEY:
            return []

        url = f"https://app.trophy.so/api/leaderboards/{leaderboard_key}"
        params = {"limit": limit}
        try:
            response = _http_session.get(url, headers=cls._get_headers(), params=params, timeout=10)
            response.raise_for_status()
            return response.json().get("rankings", [])
        except Exception as e:
            print(f"Trophy get_leaderboard error: {e}")
            return []
