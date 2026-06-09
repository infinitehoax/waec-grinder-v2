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
            # Grant clipboard permissions
            context = await browser.new_context(permissions=['clipboard-read', 'clipboard-write'])
            page = await context.new_page()

            await page.goto("http://localhost:5000/study?mode=obj")

            # Wait for UI to be ready
            await page.wait_for_function("window.UI !== undefined")

            # Trigger explanation modal
            test_md = "This is a **bold** explanation."
            await page.evaluate(f"window.UI.showExplanationModal('{test_md}')")

            # Check if button exists
            copy_btn = await page.query_selector("#copy-explanation-btn")
            assert copy_btn, "Copy button not found in modal"
            assert "C" in await copy_btn.inner_text(), "Keyboard hint C not found in button"

            # 1. Test clicking the button
            await copy_btn.click()

            # Wait for toast or text change
            await asyncio.sleep(0.5)
            assert "Copied" in await copy_btn.inner_text(), "Button text did not change to Copied"

            # Check clipboard content
            clipboard_content = await page.evaluate("navigator.clipboard.readText()")
            assert clipboard_content == test_md, f"Clipboard mismatch: expected '{test_md}', got '{clipboard_content}'"
            print("✅ Button click copy verification passed!")

            # 2. Test keyboard shortcut 'C'
            # Reset clipboard
            await page.evaluate("navigator.clipboard.writeText('')")

            # Press 'C'
            await page.keyboard.press("c")
            await asyncio.sleep(0.5)

            clipboard_content = await page.evaluate("navigator.clipboard.readText()")
            assert clipboard_content == test_md, f"Keyboard shortcut 'C' failed. Got: {clipboard_content}"
            print("✅ Keyboard shortcut 'C' copy verification passed!")

            await browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
