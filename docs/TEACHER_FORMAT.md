# 👩‍🏫 Teacher's Guide: How to Format WAEC Questions

This document provides the definitive standard for adding and formatting questions in the WAEC Grinder.

---

## 📂 File Location

Questions are stored in: `backend/data/waec_questions.json`

This file is a **JSON array** where each element represents a subject.

---

## 🏗️ Multi-Subject JSON Structure

```json
[
  {
    "subject": "Subject Name (e.g. Physics)",
    "obj": [ /* Array of OBJ questions */ ],
    "theory": [ /* Array of Theory questions */ ]
  }
]
```

---

## 🔤 OBJ (Multiple Choice) Format

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Descriptive ID: `obj_phy_mechanics_001` |
| `question` | String | The text. Supports Rich Formatting. |
| `options` | Object | Map with keys `"A"`, `"B"`, `"C"`, `"D"`. |
| `correct_option`| String | `"A"`, `"B"`, `"C"`, or `"D"`. |
| `explanation` | String | (Optional) Explains the answer. |
| `topic` | String | (Optional) For tracking student weaknesses. |

---

## ✍️ Theory Format

Theory questions use sub-questions to ensure high AI grading accuracy.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String | Descriptive ID: `th_bio_genetics_001` |
| `main_context` | String | Overall question header. |
| `sub_questions`| Array | List of sub-question objects. |

### Sub-Question Schema:
| Field | Type | Description |
| :--- | :--- | :--- |
| `sub_id` | String | Unique ID: `th_bio_genetics_001_a` |
| `label` | String | e.g., `"1(a)(i)"` |
| `question` | String | The specific prompt. |
| `rubric` | String | **The Marking Scheme.** Be detailed. |
| `max_marks` | Number | Maximum score. |

---

## ✨ Rich Formatting Standards

### 1. Markdown
- **Bold**: `**Text**`
- *Italics*: `*Text*`
- __Underline__: `<u>Text</u>`

### 2. LaTeX (Math & Science)
- **Inline**: ` = mc^2$`
- **Block**: `3248 \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} 3248`
- **Chemistry**: `(aq) + 2NaOH(aq) \\rightarrow Na_2SO_4(aq) + 2H_2O(l)$`
- **Note**: In JSON, backslashes MUST be escaped (`\\`).

### 3. Professional Tables
```
| Feature | Data | Information |
| :--- | :--- | :--- |
| **Form** | Raw facts | Processed data |
```

### 4. Images with Subtitles
- **Syntax**: `![Figure 1: The Human Heart](https://example.com/heart.png)`

---

## ⚠️ Common JSON Pitfalls

1. **Escaping Quotes**: Use `\"` for quotes inside a question.
2. **Backslashes**: Always use `\\` for LaTeX commands.
3. **Trailing Commas**: Ensure the last item in an array or object has no comma.
4. **Newlines**: Use `\n` for line breaks.

### Recommended Tool
Use [JSONLint](https://jsonlint.com/) to validate your JSON before saving.
