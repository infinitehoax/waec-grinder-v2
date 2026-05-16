import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time
import json

async def verify_report_card():
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

            # Navigate to study page
            await page.goto("http://localhost:5000/study?mode=both")
            await page.wait_for_function("window.UI !== undefined")

            # Mock batch: 1 OBJ, 1 Theory
            test_batch = [
                {
                    "id": "obj_fail",
                    "question": "Failed OBJ Question",
                    "options": {"A": "Yes", "B": "No"},
                    "correct_option": "A",
                    "explanation": "Explanation for failed OBJ",
                    "topic": "Topic A",
                    "_type": "obj"
                },
                {
                    "id": "theory_pass",
                    "main_context": "Passed Theory Question",
                    "sub_questions": [
                        {
                            "sub_id": "sq1",
                            "label": "1a",
                            "question": "Sub Question",
                            "rubric": "Passed rubric",
                            "max_marks": 5
                        }
                    ],
                    "topic": "Topic B",
                    "_type": "theory"
                }
            ]

            # Initialize UI with test batch
            await page.evaluate(f"window.UI.init({json.dumps(test_batch)})")

            # 1. Answer OBJ incorrectly
            await page.click("button.option-btn[data-letter='B']")
            await page.click("#next-btn")

            # 2. Answer Theory (mocking API response for grading)
            # We'll intercept the grade call
            async def handle_grade(route):
                await route.fulfill(json={
                    "score": 5,
                    "feedback": "Perfect",
                    "max_marks": 5
                })

            await page.route("**/api/grade", handle_grade)
            await page.fill("#answer-sq1", "My answer")
            await page.click("#submit-theory-btn")
            await page.wait_for_selector("#next-btn", state="visible")
            await page.click("#next-btn")

            # 3. Now we should be on the report card screen
            await page.wait_for_selector(".report-card")

            # Verify Score
            score_text = await page.inner_text(".report-stat__value")
            # The first stat value should be "1 / 2"
            stats = await page.query_selector_all(".report-stat__value")
            batch_score = await stats[0].inner_text()
            assert "1 / 2" in batch_score, f"Expected 1 / 2, got {batch_score}"

            # Verify Topic Performance
            topic_a = await page.query_selector(".topic-row:has-text('Topic A') .topic-score")
            topic_b = await page.query_selector(".topic-row:has-text('Topic B') .topic-score")

            assert "0/1" in await topic_a.inner_text(), "Topic A should be 0/1"
            assert "1/1" in await topic_b.inner_text(), "Topic B should be 1/1"

            # Verify Failed Review List
            failed_items = await page.query_selector_all(".failed-item")
            assert len(failed_items) == 1, f"Expected 1 failed item, got {len(failed_items)}"

            failed_q_text = await failed_items[0].inner_text()
            assert "Failed OBJ Question" in failed_q_text
            assert "Explanation for failed OBJ" in failed_q_text

            print("✅ Report card verification passed!")

            await browser.close()
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify_report_card())
