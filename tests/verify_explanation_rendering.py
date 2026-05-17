import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time
import json

async def verify():
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

            # 1. Inject a test question into the UI via script
            await page.goto("http://localhost:5000/study?mode=obj")

            # Wait for UI to be ready
            await page.wait_for_function("window.UI !== undefined")

            test_question = {
                "id": "test_exp_rich",
                "question": "What is 1+1?",
                "options": {
                    "A": "2",
                    "B": "3"
                },
                "correct_option": "A",
                "explanation": "The answer is **2**. Inline: $x^2$. Block: $$y^2$$.",
                "topic": "Math",
                "_type": "obj"
            }

            q_json = json.dumps(test_question)
            await page.evaluate(f"window.UI.init([{q_json}])")

            # 2. Select an option to trigger explanation display
            # Click option A
            await page.click("button[data-letter='A']")

            # Give it a moment to render
            await asyncio.sleep(1)

            # 3. Check for rendered elements in the explanation block
            exp_text_selector = ".explanation-block__text"

            try:
                # Check for Bold
                assert await page.query_selector(f"{exp_text_selector} strong:has-text('2')"), "Bold text in explanation not found"

                # Check for KaTeX (inline or block)
                katex_elements = await page.query_selector_all(f"{exp_text_selector} .katex")
                assert len(katex_elements) >= 2, f"Expected at least 2 KaTeX elements in explanation, found {len(katex_elements)}"

                print("✅ Explanation rendering verification passed!")
            except AssertionError as e:
                print(f"❌ Verification failed: {e}")
                # Get the HTML for debugging
                html = await page.inner_html(exp_text_selector)
                print(f"DEBUG HTML of explanation: {html}")

            await browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
