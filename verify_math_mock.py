import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def run_verification():
    # Start the server
    server_process = subprocess.Popen(["python3", "run_app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(5)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context()
            page = await context.new_page()

            # Navigate to homepage
            print("Navigating to homepage...")
            await page.goto("http://127.0.0.1:5000")

            # Wait for the subject to appear
            subject_name = "UNIPORT Maths Friday mock"
            subject_selector = f".subject-item:has-text('{subject_name}')"
            print(f"Waiting for subject: {subject_name}")
            await page.wait_for_selector(subject_selector, timeout=10000)
            print("Subject found on homepage!")

            # Check question count
            meta_text = await page.inner_text(f"{subject_selector} .subject-meta")
            print(f"Meta info: {meta_text}")

            # Verify the count
            if "65 OBJ" in meta_text:
                print("SUCCESS: Correct question count (65 OBJ) displayed.")
            else:
                print(f"ERROR: Unexpected question count: {meta_text}")
                exit(1)

            await page.screenshot(path="homepage_math_mock.png")
            print("Screenshot of homepage saved.")

    finally:
        print("Terminating server...")
        server_process.terminate()

if __name__ == "__main__":
    asyncio.run(run_verification())
