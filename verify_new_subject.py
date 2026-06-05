import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def run_verification():
    server_process = subprocess.Popen(["python3", "run_app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(3)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context()
            page = await context.new_page()

            page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

            await page.goto("http://127.0.0.1:5000")
            await page.evaluate("() => { localStorage.setItem('wg_player_name', 'JulesVerifier'); }")
            await page.reload()

            subject_selector = "text='UNIPORT Chemistry v1 actual questions'"
            await page.wait_for_selector(subject_selector)
            await page.click(subject_selector)

            start_btn = page.locator("#start-btn")
            await start_btn.wait_for(state="visible")

            print("Clicking Start Grinding...")
            await start_btn.click()

            # Wait for URL to change to /study
            try:
                await page.wait_for_url("**/study", timeout=10000)
                print(f"Navigated to: {page.url}")

                await page.wait_for_selector(".question-card", timeout=10000)
                print("Question card loaded!")
                await page.screenshot(path="/home/jules/verification/screenshots/first_question.png")
            except Exception as e:
                print(f"Navigation/Loading failed: {e}")
                await page.screenshot(path="/home/jules/verification/screenshots/fail_final.png")

    finally:
        server_process.terminate()

if __name__ == "__main__":
    if not os.path.exists("/home/jules/verification/screenshots"):
        os.makedirs("/home/jules/verification/screenshots")
    asyncio.run(run_verification())
