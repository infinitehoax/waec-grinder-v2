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

## 📁 Project Structure

```
waec-grinder/
├── backend/
│   ├── app.py               # Flask app factory
│   ├── config.py            # Environment config
│   ├── routes/
│   │   ├── api_routes.py    # /api/questions, /api/grade, /api/config
│   │   └── view_routes.py   # /, /study, /summary
│   ├── services/
│   │   ├── llm_service.py   # OpenRouter AI grading
│   │   └── data_service.py  # JSON question loader
│   └── data/
│       └── waec_questions.json   # ← Your questions go here
├── frontend/
│   ├── static/
│   │   ├── css/             # variables, main, study styles
│   │   └── js/              # config, storage, api, engine, ui
│   └── templates/           # base, index, study, summary HTML
├── .env                     # API key (never commit this)
├── run_app.py               # Entry point
└── README.md
```

---

## 👩‍🏫 For Teachers: How to Add Questions

Edit `backend/data/waec_questions.json`. The file has two sections: `obj` and `theory`.

### OBJ Format

```json
{
  "id": "obj_001",
  "question": "Which organelle is the site of energy production?",
  "options": {
    "A": "Nucleus",
    "B": "Mitochondrion",
    "C": "Ribosome",
    "D": "Golgi body"
  },
  "correct_option": "B",
  "explanation": "The mitochondrion produces ATP through cellular respiration."
}
```

### Theory Format (with sub-questions)

```json
{
  "id": "th_001",
  "main_context": "Question 1: Cellular Respiration (Total: 10 Marks)",
  "sub_questions": [
    {
      "sub_id": "th_001_a",
      "label": "1(a)",
      "question": "Define cellular respiration.",
      "rubric": "Process by which glucose is broken down to release energy (ATP). Award 2 marks for complete definition.",
      "max_marks": 2
    },
    {
      "sub_id": "th_001_b",
      "label": "1(b)",
      "question": "State two differences between aerobic and anaerobic respiration.",
      "rubric": "1 mark each: (1) Aerobic needs O2, anaerobic doesn't. (2) Aerobic produces more ATP. Max 2 marks.",
      "max_marks": 2
    }
  ]
}
```

> **Tip:** The more detailed and specific your rubric, the more accurately the AI will grade the student.

---

## ⚙️ How the Grinder Works

### Queue System
All questions start in the **unseen queue**. There is also an empty **failed queue**.

### Batching
Questions arrive in batches (default: 5). The engine fills each batch by:
1. First pulling from the **failed queue** (repeats)
2. Then pulling from the **unseen queue** (new questions)

This guarantees that questions you fail in Batch 1 immediately reappear in Batch 2.

### OBJ Grading
Auto-graded in the browser. Correct = mastered and removed. Wrong = added to failed queue.

### Theory Grading (Per-Unit Scoring)
Each sub-question (e.g. 1a, 1b, 1c) is sent to OpenRouter **separately** to prevent AI hallucination. The AI grades each one against its specific rubric. Scores are aggregated. If total < 50%, the entire question goes to failed queue.

### Mastery
Once both queues are empty — every question answered correctly at least once — the Mastery screen appears.

---

## 🔧 Configuration

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
