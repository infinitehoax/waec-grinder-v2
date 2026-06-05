import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time
import json

async def verify_exam_mode_review():
    # Start the app
    proc = subprocess.Popen(["python3", "-u", "run_app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Wait for app to be ready
    ready = False
    for i in range(10):
        try:
            import socket
            with socket.create_connection(("localhost", 5000), timeout=1):
                ready = True
                break
        except:
            time.sleep(1)

    if not ready:
        print("Server failed to start")
        proc.terminate()
        return

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Set Exam Mode (Delayed Marking) in localStorage
            await page.goto("http://localhost:5000/")
            await page.evaluate("localStorage.setItem('wg_cbt_mode', 'true')")
            await page.evaluate("localStorage.setItem('wg_cbt_delay_marking', 'true')")
            await page.evaluate("localStorage.setItem('wg_player_name', 'Test Player')")

            # Navigate to study page
            await page.goto("http://localhost:5000/study?mode=both")
            await page.wait_for_function("window.UI !== undefined")

            # Mock batch: 1 OBJ, 1 Theory
            test_batch = [
                {
                    "id": "obj_q",
                    "question": "OBJ Question",
                    "options": {"A": "A", "B": "B"},
                    "correct_option": "A",
                    "explanation": "OBJ Explanation",
                    "topic": "Topic A",
                    "_type": "obj",
                    "_subject": "Math"
                },
                {
                    "id": "theory_q",
                    "main_context": "Theory Question",
                    "sub_questions": [
                        {
                            "sub_id": "sq1",
                            "label": "1a",
                            "question": "Sub Question",
                            "rubric": "Theory Rubric",
                            "max_marks": 5
                        }
                    ],
                    "topic": "Topic B",
                    "_type": "theory",
                    "_subject": "Math"
                }
            ]

            # Initialize UI
            await page.evaluate(f"window.UI.init({json.dumps(test_batch)})")

            # 1. Answer OBJ (Exam Mode: just saves, doesn't grade yet)
            await page.click("button.option-btn[data-letter='A']")
            # Explicitly mark as answered for OBJ
            await page.evaluate("UI.batch[UI.currentIdx]._status = 'answered'")
            await page.evaluate("UI.nextQuestion()")

            # 2. Answer Theory (Exam Mode: just saves)
            # Wait for textarea to be visible
            await page.wait_for_selector("textarea[id^='answer-']")
            await page.fill("textarea[id^='answer-']", "My theory answer")
            # Explicitly mark as answered for Theory
            await page.evaluate("UI.batch[UI.currentIdx]._status = 'answered'")

            # Mock grading API BEFORE clicking finish
            async def handle_grade(route):
                await route.fulfill(json={
                    "score": 4,
                    "feedback": "Good job",
                    "max_marks": 5
                })
            await page.route("**/api/grade", handle_grade)

            # Finish
            await page.evaluate("UI.showBatchComplete()")

            # 4. Report Card should appear
            await page.wait_for_selector(".report-card", timeout=15000)

            # 5. Verify Session Review
            titles = await page.eval_on_selector_all(".report-section__title", "els => els.map(e => e.textContent)")
            print(f"DEBUG: Found titles: {titles}")
            assert any("Session Review" in t for t in titles), f"Session Review not found in {titles}"

            # Should show BOTH questions
            items = await page.query_selector_all(".failed-item")
            print(f"DEBUG: Found {len(items)} items in review")
            assert len(items) == 2, f"Expected 2 review items, got {len(items)}"

            # Verify OBJ Review
            obj_review = await items[0].inner_text()
            print(f"DEBUG: OBJ Review content: {obj_review}")
            assert "CORRECT" in obj_review
            assert "Your Answer: A" in obj_review
            assert "OBJ Explanation" in obj_review

            # Verify Theory Review
            theory_review = await items[1].inner_text()
            print(f"DEBUG: Theory Review content: {theory_review}")
            assert "Good job" in theory_review
            assert "My theory answer" in theory_review
            assert "4/5" in theory_review

            print("✅ Exam Mode Review verification passed!")

            await browser.close()
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify_exam_mode_review())
