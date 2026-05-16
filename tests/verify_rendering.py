import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time
import signal
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

            # We need to wait for the page to load enough so that UI object exists
            await page.wait_for_function("window.UI !== undefined")

            test_question = {
                "id": "test_rich",
                "question": "### Test Header\n**Bold Text** and *Italic*.\n\n| Col 1 | Col 2 |\n|---|---|\n| Val 1 | Val 2 |\n\nInline math: $E=mc^2$\n\nBlock math:\n\n$$ \\int_0^1 x^2 dx $$\n\n![This is a subtitle](https://via.placeholder.com/150)",
                "options": {
                    "A": "Option with **bold**",
                    "B": "Option with $x^2$",
                    "C": "Option with ![img](https://via.placeholder.com/50)",
                    "D": "Normal option"
                },
                "correct_option": "A",
                "explanation": "Markdown in explanation too!",
                "_type": "obj"
            }

            q_json = json.dumps(test_question)

            # Use console logs to debug
            page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

            await page.evaluate(f"window.UI.init([{q_json}])")

            # Give it more time and check for KaTeX specifically
            await asyncio.sleep(2)

            # Debug check: is katex loaded?
            katex_exists = await page.evaluate("typeof katex !== 'undefined'")
            marked_exists = await page.evaluate("typeof marked !== 'undefined'")
            print(f"DEBUG: katex exists: {katex_exists}, marked exists: {marked_exists}")

            try:
                # 2. Check for rendered elements
                # Header
                assert await page.query_selector("h3:has-text('Test Header')"), "H3 header not found"
                # Bold
                assert await page.query_selector("strong:has-text('Bold Text')"), "Bold text not found"
                # Table
                assert await page.query_selector("table"), "Table not found"
                assert await page.query_selector("td:has-text('Val 1')"), "Table cell not found"
                # KaTeX
                assert await page.query_selector(".katex"), "KaTeX not found"
                # Image and Subtitle
                assert await page.query_selector("figure.q-image-figure"), "Figure not found"
                assert await page.query_selector("figcaption.img-subtitle:has-text('This is a subtitle')"), "Subtitle not found"

                # Options
                assert await page.query_selector("button.option-btn strong:has-text('bold')"), "Bold in option not found"
                assert await page.query_selector("button.option-btn .katex"), "KaTeX in option not found"

                print("✅ Rendering verification passed!")
            except AssertionError as e:
                print(f"❌ Verification failed: {e}")
                # Get the HTML of the question area
                html = await page.inner_html("#question-wrapper")
                print(f"DEBUG HTML: {html}")

            await browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
