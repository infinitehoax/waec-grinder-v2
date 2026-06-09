import json

with open('backend/data/waec_questions.json', 'r') as f:
    data = json.load(f)

# Find our new subject
subject = next((s for s in data if s['subject'] == 'UNIPORT Maths Friday mock'), None)

if subject:
    print(json.dumps(subject, indent=2)[:2000]) # First 2000 chars for review
