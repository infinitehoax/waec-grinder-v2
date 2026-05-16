# 👩‍🏫 Teacher's Guide: How to Format WAEC Questions

This document explains how to add questions to the WAEC Grinder study tool.

---

## Where to Add Questions

Open the file: `backend/data/waec_questions.json`

This is a plain text file. You can edit it with Notepad, VS Code, or any text editor.

---

## OBJ (Multiple Choice) Questions

Each OBJ question needs:
- A unique `id` (e.g. `obj_001`, `obj_002`)
- The full `question` text
- Four `options` labelled A, B, C, D
- The `correct_option` (just the letter: `"A"`, `"B"`, `"C"`, or `"D"`)
- An optional `explanation` shown after the student answers

```json
{
  "id": "obj_005",
  "question": "Which of the following is the powerhouse of the cell?",
  "options": {
    "A": "Nucleus",
    "B": "Ribosome",
    "C": "Mitochondrion",
    "D": "Vacuole"
  },
  "correct_option": "C",
  "explanation": "The mitochondrion produces ATP through cellular respiration, earning it the nickname 'powerhouse of the cell'."
}
```

---

## Theory Questions

Theory questions are broken into **sub-questions** (e.g. 1a, 1b, 1c). Each sub-question is graded **separately** by AI.

Each theory question needs:
- A unique `id` (e.g. `th_001`)
- A `main_context` — the overall question header with total marks
- A list of `sub_questions`

Each sub-question needs:
- A unique `sub_id` (e.g. `th_001_a`, `th_001_b_i`)
- A `label` that matches the WAEC question numbering (e.g. `"1(a)(i)"`)
- The `question` text
- A detailed `rubric` — this is the **marking scheme**. The more specific, the better.
- `max_marks` — the maximum marks for this sub-question

```json
{
  "id": "th_003",
  "main_context": "Question 3: Nutrition in Plants (Total: 8 Marks)",
  "sub_questions": [
    {
      "sub_id": "th_003_a",
      "label": "3(a)",
      "question": "What is photosynthesis?",
      "rubric": "Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to manufacture food (glucose) and release oxygen. Award 2 marks for mentioning: light energy, CO2 and water as reactants, glucose as product, and oxygen released. Award 1 mark for a partial definition.",
      "max_marks": 2
    },
    {
      "sub_id": "th_003_b",
      "label": "3(b)",
      "question": "State THREE factors that affect the rate of photosynthesis.",
      "rubric": "Award 1 mark each for any THREE of: (1) Light intensity, (2) Carbon dioxide concentration, (3) Temperature, (4) Water availability, (5) Chlorophyll concentration. Max 3 marks.",
      "max_marks": 3
    },
    {
      "sub_id": "th_003_c",
      "label": "3(c)",
      "question": "Write the balanced chemical equation for photosynthesis.",
      "rubric": "6CO2 + 6H2O + light energy → C6H12O6 + 6O2. Award 3 marks for fully correct equation. Award 2 marks if mostly correct. Award 1 mark if only the reactants or products are correct.",
      "max_marks": 3
    }
  ]
}
```

---

## Tips for Writing Good Rubrics

1. **Be explicit about marks.** State exactly how many marks each point earns.
2. **List all acceptable answers.** If multiple answers are valid, list them all.
3. **Specify limits.** E.g. "Award 1 mark each, maximum 3 marks."
4. **Include partial credit rules.** E.g. "Award 1 mark if only the formula is correct."
5. **Use WAEC marking scheme language.** The AI is trained to understand WAEC-style rubrics.

---

## Checking Your JSON is Valid

After editing, you can check that your JSON is valid at: https://jsonlint.com

Paste the entire contents of `waec_questions.json` and click "Validate JSON".

If there are errors, the most common causes are:
- Missing comma between items
- Missing closing `}` or `]`
- Smart quotes (`"`) instead of straight quotes (`"`)

---

## Rich Formatting (Markdown, LaTeX, Tables, Images)

You can now use rich formatting in both **Questions** and **Options**.

### 1. Rich Text
Use standard Markdown:
- **Bold**: `**text**`
- *Italics*: `*text*`
- __Underline__: `<u>text</u>`
- Line breaks: Use `\n` or just press Enter.

### 2. Tables
Standard Markdown tables are supported:
```
| Feature | ASCII | Unicode |
|---------|-------|---------|
| Bits    | 7/8   | 16/32   |
| Symbols | 256   | 1.1M+   |
```

JSON example of how to implement a table within a question in waec_questions.json. You can use standard Markdown table syntax, and even combine it with bold text and LaTeX:
```
{
  "id": "obj_ict_001",
  "question": "Study the following comparison table between Data and Information:\n\n| Feature | Data | Information |\n| :--- | :--- | :--- |\n| **Form** | Raw facts | Processed data |\n| **Context** | Meaningless on its own | Meaningful |\n| **Example** | Test scores (e.g., 85) | Class average |\n\nWhich of the following best describes the role of **Information**?",
  "options": {
    "A": "It is unorganized and raw.",
    "B": "It has no context or meaning.",
    "C": "It is processed and provides meaning.",
    "D": "It is the primary input for a computer."
  },
  "correct_option": "C",
  "explanation": "Information is data that has been processed into a meaningful form for the user."
}
```
Formatting Tips:
Newlines: Use \n\n before the table to ensure it starts on a new line.
Alignment: You can use :--- for left-aligned, :---: for centered, and ---: for right-aligned columns.
Rich Text: You can use **bold**, *italics*, or even LaTeX (e.g., $x^2$) directly inside the table cells.
Visuals: The table will be rendered with professional borders, padding, and subtle zebra stripes automatically.

### 3. LaTeX (Math/Science)
- **Inline**: Use single $, e.g., `$E = mc^2$`
- **Block**: Use double $$, e.g.,
  `$$ \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$`

### 4. Images with Subtitles
Use the Markdown image syntax: `![Subtitle](URL)`
- The text in `[]` will appear as a **subtitle** below the image.
- Example: `![Figure 1: A Logic Gate Circuit](https://example.com/logic.png)`
