import asyncio
import os
import signal
import subprocess
import time
from playwright.async_api import async_playwright

async def run_verification():
    # 1. Start the Flask app
    proc = subprocess.Popen(['python', 'run_app.py'], preexec_fn=os.setsid)
    time.sleep(3)  # Wait for startup

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context()
            page = await context.new_page()

            # 2. Navigate to dashboard
            await page.goto('http://localhost:5000')
            print("Dashboard loaded.")

            # 3. Select subject and start session
            await page.click('button:has-text("Computer Studies")')
            await page.click('button:has-text("Start Study Session")')
            print("Study session started.")

            # 4. Wait for question
            await page.wait_for_selector('.question-card')

            # Check initial mastered count
            mastered_selector = '.stat-item:has-text("Mastered") .stat-item__value'
            initial_mastered = await page.inner_text(mastered_selector)
            print(f"Initial Mastered Count: {initial_mastered}")

            # 5. Solve a question correctly
            # In Computer Studies, ID obj_001 is "Which of the following is an input device?" (Option A: Keyboard)
            await page.click('button:has-text("A")')
            print("Answered Keyboard (A).")

            # Wait for "Correct" feedback
            await page.wait_for_selector('.option-btn.correct')

            # 6. Verify mastered count incremented
            await page.wait_for_timeout(500) # Wait for state sync
            new_mastered = await page.inner_text(mastered_selector)
            print(f"New Mastered Count: {new_mastered}")

            if int(new_mastered) > int(initial_mastered):
                print("SUCCESS: Mastered count updated correctly.")
            else:
                print("FAILURE: Mastered count did not update.")

            # Screenshot for visual proof
            os.makedirs('verification/screenshots', exist_ok=True)
            await page.screenshot(path='verification/screenshots/verification_final_v2.png')
            print("Screenshot saved.")

            await browser.close()
    finally:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)

if __name__ == "__main__":
    asyncio.run(run_verification())
