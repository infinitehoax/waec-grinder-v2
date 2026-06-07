# 📚 WAEC Grinder

A personal spaced-repetition study tool for WAEC preparation. Combines auto-graded OBJ questions with AI-powered theory grading (per sub-question) to force mastery through grinding.

---

## ⚡ Quick Start

### 1. Install Python dependencies

```bash
cd waec-grinder
pip install -r backend/requirements.txt
```

### 2. Add your OpenRouter API key

Open the `.env` file and replace the placeholder:

```
OPENROUTER_API_KEY=your-actual-key-here
```

Get a **free** key at [openrouter.ai](https://openrouter.ai) — no credit card required.

> **Note:** OBJ questions work without an API key. Theory grading requires one.

### 3. Run the app

```bash
python run_app.py
```

Then open your browser to: **http://localhost:5000**

---

## 🌟 Key Features

- **Spaced Repetition Engine**: Automatically re-queues failed questions for immediate review.
- **AI Theory Grading**: Granular, rubric-based grading for multi-part theory questions using OpenRouter.
- **Exam Mode (CBT)**: Simulate real exam conditions with timed sessions and delayed marking.
- **Multiplayer Mode**: Study with friends in real-time rooms with live progress tracking and anti-cheat protection.
- **Rich Formatting**: Support for LaTeX Math, Markdown, Tables, and Images with subtitles.
- **Achievements & Streaks**: Stay motivated with over 50 unlockable achievements and consistency tracking.
- **Performance Analytics**: Track mastery by topic and identify weak areas for focused study.

---

## 📁 Project Structure

```
waec-grinder/
├── backend/
│   ├── app.py               # Flask app factory
│   ├── config.py            # Environment config
│   ├── routes/
│   │   ├── api_routes.py    # /api/questions, /api/grade, /api/config
│   │   └── view_routes.py   # /, /study, /summary
│   │   └── socket_events.py # Multiplayer WebSocket events
│   ├── services/
│   │   ├── llm_service.py   # OpenRouter AI grading
│   │   ├── data_service.py  # JSON question loader
│   │   └── room_service.py  # Multiplayer logic
│   └── data/
│       └── waec_questions.json   # ← Your questions go here
├── frontend/
│   ├── static/
│   │   ├── css/             # variables, main, study styles
│   │   └── js/              # config, storage, api, engine, ui, achievements
│   └── templates/           # base, index, study, summary, multiplayer HTML
├── .env                     # API key (never commit this)
├── run_app.py               # Entry point
└── README.md
```

---

## 📖 Documentation

- [User Guide](docs/USER_GUIDE.md) - How to use the app as a student.
- [Teacher's Guide](docs/TEACHER_FORMAT.md) - How to add and format questions.
- [Contributing](docs/CONTRIBUTING.md) - Guidelines for developers and AI agents.

---

## 🛠️ Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Batch size | 5 | Dashboard UI |
| Pass threshold (Theory) | 50% | `backend/config.py` → `PASS_THRESHOLD` |
| AI Model | `mistralai/mistral-7b-instruct:free` | `backend/config.py` → `LLM_MODEL` |

---

## 🆓 Free AI Models on OpenRouter

These work great for grading:
- `mistralai/mistral-7b-instruct:free`
- `google/gemma-3-4b-it:free`
- `meta-llama/llama-3.2-3b-instruct:free`

Change the model in `backend/config.py`.

---

### 📚 Release Naming Convention
To ensure our auto-generated release notes are organized correctly, please ensure your commits follow the mandatory prefixes: `feat:`, `add:`, `New:`, `fix:`, `bug:`, `patch:`, `docs:`, `chore:`, `test:`.

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.
