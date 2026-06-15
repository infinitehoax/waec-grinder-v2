import re
import json
import os

def parse_questions(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Split content into questions part and answers part
    parts = content.split('### **ANSWER KEY & BRIEF SOLUTIONS**')
    questions_text = parts[0]
    answers_text = parts[1]

    # Parse answers first to create a map
    answer_map = {}
    answer_matches = re.finditer(r'(\d+)\.\s+\*\*([A-D])\*\*\s*(?:\((.*?)\))?', answers_text)
    for match in answer_matches:
        q_num = match.group(1)
        correct_option = match.group(2)
        explanation = match.group(3) if match.group(3) else ""
        answer_map[q_num] = {
            "correct_option": correct_option,
            "explanation": explanation.strip()
        }

    # Parse questions
    # Format: **1.** Question text...
    # Use a regex that matches the number marker at the start of a line OR after whitespace
    q_blocks = re.split(r'(?:^|\n)\s*\*\*(\d+)\.\*\*', questions_text.strip())

    # The first element might be empty if it matched at the very beginning
    if q_blocks[0] == '':
        q_blocks = q_blocks[1:]

    questions = []
    for i in range(0, len(q_blocks), 2):
        if i + 1 >= len(q_blocks):
            break

        q_num = q_blocks[i]
        q_content = q_blocks[i+1]

        lines = q_content.strip().split('\n')
        q_text_lines = []
        options = {}

        for line in lines:
            line = line.strip()
            # Handle options like "A. $101110_2$"
            option_match = re.match(r'^([A-D])\.\s*(.*)', line)
            if option_match:
                letter = option_match.group(1)
                text = option_match.group(2).strip()
                options[letter] = text
            elif line:
                q_text_lines.append(line)

        q_text = " ".join(q_text_lines).strip()

        if q_num in answer_map:
            questions.append({
                "id": f"obj_uniport_math_2026_{q_num.zfill(3)}",
                "question": q_text,
                "options": options,
                "correct_option": answer_map[q_num]["correct_option"],
                "explanation": answer_map[q_num]["explanation"],
                "topic": "UNIPORT Predicted 2026"
            })
        else:
            print(f"Warning: No answer found for question {q_num}")

    return questions

def update_json(new_subject_data):
    json_path = 'backend/data/waec_questions.json'
    if os.path.exists(json_path):
        with open(json_path, 'r') as f:
            data = json.load(f)
    else:
        data = []

    subject_exists = False
    for i, entry in enumerate(data):
        if entry['subject'] == new_subject_data['subject']:
            data[i] = new_subject_data
            subject_exists = True
            break

    if not subject_exists:
        data.append(new_subject_data)

    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated {json_path} with subject '{new_subject_data['subject']}'")

if __name__ == "__main__":
    questions = parse_questions('uniport_math.txt')
    print(f"Parsed {len(questions)} questions.")

    new_subject = {
        "subject": "UNIPORT Maths Friday mock",
        "obj": questions,
        "theory": []
    }

    update_json(new_subject)
