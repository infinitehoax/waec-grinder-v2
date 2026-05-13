"""
WAEC Grinder - Startup Script
Double-click this file or run: python run_app.py
Then open your browser to: http://localhost:5000
"""
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.config import Config

if __name__ == '__main__':
    app = create_app()
    print("=" * 55)
    print("  📚 WAEC Grinder is starting up...")
    print("=" * 55)
    if not Config.OPENROUTER_API_KEY:
        print("  ⚠️  WARNING: No OPENROUTER_API_KEY found in .env")
        print("     Theory grading will not work until you add it.")
        print("     See README.md for setup instructions.")
    else:
        print("  ✅ API key detected. Theory grading is active.")
    print("  🌐 Open your browser to: http://localhost:5000")
    print("=" * 55)
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
