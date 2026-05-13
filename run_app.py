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

# IMPORTANT: Define 'app' outside the main block so Gunicorn can find it on Render
app = create_app()

if __name__ == '__main__':
    print("=" * 55)
    print("  📚 WAEC Grinder is starting up...")
    print("=" * 55)
    if not Config.OPENROUTER_API_KEY:
        print("  ⚠️  WARNING: No OPENROUTER_API_KEY found in .env")
        print("     Theory grading will not work until you add it.")
        print("     See README.md for setup instructions.")
    else:
        print("  ✅ API key detected. Theory grading is active.")
        
    # Render assigns its own port dynamically, but localhost uses 5000
    port = int(os.environ.get("PORT", 5000))
    print(f"  🌐 App running on port {port}")
    print("=" * 55)
    
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=port)
