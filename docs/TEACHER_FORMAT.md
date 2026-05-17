# 👩‍🏫 Teacher's Guide: How to Format WAEC Questions

This document provides the definitive standard for adding and formatting questions in the WAEC Grinder.

---

## 📂 File Location

Questions are stored in: `backend/data/waec_questions.json`

This file is a **JSON array** where each element represents a subject.

---

## 🏗️ Multi-Subject JSON Structure

The top-level structure must be an array of subject objects.

```json
[
  {
    "subject": "Subject Name (e.g. Physics)",
    "obj": [ /* Array of OBJ questions */ ],
    "theory": [ /* Array of Theory questions */ ]
  },
  {
    "subject": "Another Subject",
    "obj": [],
    "theory": []
  }
]
```

---

## 🔤 OBJ (Multiple Choice) Format

Each OBJ question in the `obj` array should follow this schema:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | A unique identifier (e.g., `obj_phy_001`). |
| `question` | String | The text of the question. Supports Rich Formatting. |
| `options` | Object | A map with keys `"A"`, `"B"`, `"C"`, `"D"`. |
| `correct_option`| String | The correct letter: `"A"`, `"B"`, `"C"`, or `"D"`. |
| `explanation` | String | (Optional) Shown after answering. Explains the "Why". |
| `topic` | String | (Optional) Used for tracking student weaknesses. |

### Example:
```json
{
  "id": "obj_005",
  "topic": "Cell Biology",
  "question": "Which of the following is the powerhouse of the cell?",
  "options": {
    "A": "Nucleus",
    "B": "Ribosome",
    "C": "Mitochondrion",
    "D": "Vacuole"
  },
  "correct_option": "C",
  "explanation": "The mitochondrion produces ATP through cellular respiration."
}
```

---

## ✍️ Theory Format (with Sub-Questions)

Theory questions are divided into sub-questions (1a, 1b, etc.) to ensure high AI grading accuracy.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | A unique identifier (e.g., `th_phy_001`). |
| `main_context` | String | The overall question header (e.g., "Question 1 (15 Marks)"). |
| `topic` | String | (Optional) General topic for the entire question. |
| `sub_questions`| Array | List of sub-question objects. |

### Sub-Question Schema:
| Field | Type | Description |
| :--- | :--- | :--- |
| `sub_id` | String | Unique ID for the sub-unit (e.g., `th_phy_001_a`). |
| `label` | String | The WAEC label (e.g., `"1(a)(i)"`). |
| `question` | String | The specific prompt for this unit. |
| `rubric` | String | **The Marking Scheme.** Be as detailed as possible. |
| `max_marks` | Number | Maximum score for this sub-unit. |

### Example:
```json
{
  "id": "th_003",
  "topic": "Botany",
  "main_context": "Question 3: Nutrition in Plants (Total: 5 Marks)",
  "sub_questions": [
    {
      "sub_id": "th_003_a",
      "label": "3(a)",
      "question": "What is photosynthesis?",
      "rubric": "Process by which green plants use sunlight, water, and CO2 to make glucose. Award 2 marks for full definition, 1 for partial.",
      "max_marks": 2
    },
    {
      "sub_id": "th_003_b",
      "label": "3(b)",
      "question": "State THREE factors affecting the rate of photosynthesis.",
      "rubric": "1 mark each for: Light intensity, CO2 conc, Temperature, Water. Max 3 marks.",
      "max_marks": 3
    }
  ]
}
```

---

## ✨ Rich Formatting Standards

You can use the following syntax in `question`, `options` (values), and `explanation` fields.

### 1. Markdown (Text Styling)
- **Bold**: `**Text**`
- *Italics*: `*Text*`
- __Underline__: `<u>Text</u>`
- Lists: Use `-` for bullets or `1.` for numbered lists.

### 2. LaTeX (Math & Science)
We use MathJax to render high-quality formulas.
- **Inline**: `$E = mc^2$`
- **Block**: `$$ \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$`
- **Chemistry**: `$H_2SO_4(aq) + 2NaOH(aq) \rightarrow Na_2SO_4(aq) + 2H_2O(l)$`

### 3. Professional Tables
Markdown tables are automatically styled with borders and zebra-striping.
```
| Feature | Data | Information |
| :--- | :--- | :--- |
| **Form** | Raw facts | Processed data |
| **Context** | Meaningless | Meaningful |
```

### 4. Images with Subtitles
Embed images hosted online. The alt-text in `[]` becomes the visible subtitle.
- **Syntax**: `![Figure 1: The Human Heart](https://example.com/heart.png)`

### 5. Line Breaks
For multiple paragraphs, use `\n\n` in your JSON strings.

---

## 🛠️ Validation & Troubleshooting

### Common JSON Errors
1. **Trailing Commas**: `[1, 2, 3,]` is invalid. Remove the last comma.
2. **Missing Quotes**: All keys and string values **must** be in double quotes (`"`).
3. **Smart Quotes**: Ensure you use straight quotes (`"`) and not curly ones (`“`).
4. **Nested Quotes**: If your question contains quotes, escape them with a backslash: `"He said \"Hello\""`.
5. **Backslashes in LaTeX**: Since JSON uses the backslash as an escape character, you must escape it too. Use `\\` for LaTeX commands.
   - Example: `"$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"`
6. **Literal Newlines**: JSON does not support literal Enter/Newlines. Use `\n` instead.

### Recommended Tools
- **VS Code**: Has built-in JSON validation and formatting (`Shift+Alt+F`).
- **JSONLint**: Paste your code at [jsonlint.com](https://jsonlint.com) to find syntax errors.

---

## 💡 Pro-Tips for Rubrics
- **Be Quantitative**: "Award 1 mark for each point, max 3."
- **Provide Examples**: "Acceptable answers include: [list...]"
- **Define Partial Credit**: "Award 1 mark if they mention 'energy' but forget 'ATP'."
- **Use WAEC Terminology**: The AI is optimized for West African examination standards.
