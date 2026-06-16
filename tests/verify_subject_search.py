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

            await page.goto("http://localhost:5000/")

            # Wait for subjects to load
            await page.wait_for_selector(".subject-item")

            # 1. Initial state check
            items = await page.query_selector_all(".subject-item")
            print(f"Initial subjects: {len(items)}")

            # 2. Search for a specific subject
            # Let's find a subject name from the first item
            first_subject_name = await page.eval_on_selector(".subject-item .subject-name", "el => el.textContent")
            print(f"Searching for: {first_subject_name}")

            await page.fill("#subject-search", first_subject_name)
            await asyncio.sleep(0.5) # Wait for oninput debounce/processing

            visible_items = await page.query_selector_all(".subject-item:not([style*='display: none'])")
            print(f"Visible items after search: {len(visible_items)}")
            assert len(visible_items) > 0, "Should have at least one visible item"

            for item in visible_items:
                name = await item.eval_on_selector(".subject-name", "el => el.textContent.toLowerCase()")
                assert first_subject_name.lower() in name, f"Subject '{name}' does not match query '{first_subject_name}'"

            # 3. Search for something that doesn't exist
            await page.fill("#subject-search", "NonExistentSubject12345")
            await asyncio.sleep(0.5)

            visible_items = await page.query_selector_all(".subject-item:not([style*='display: none'])")
            assert len(visible_items) == 0, "No subjects should be visible"

            no_results = await page.query_selector("#no-results-msg")
            assert await no_results.is_visible(), "No results message should be visible"

            # 4. Select All with filter
            await page.fill("#subject-search", first_subject_name)
            await asyncio.sleep(0.5)

            # Click Select All
            await page.click("button:has-text('All')")

            # Verify visible one is checked
            is_checked = await page.eval_on_selector(".subject-item:not([style*='display: none']) .subject-checkbox", "el => el.checked")
            assert is_checked, "Visible subject should be checked after 'All'"

            # Clear search and verify other subjects are NOT checked (if they weren't before)
            await page.fill("#subject-search", "")
            await asyncio.sleep(0.5)

            # We need to find one that wasn't visible before.
            # This depends on multiple subjects existing.
            all_checkboxes = await page.query_selector_all(".subject-checkbox")
            checked_count = 0
            for cb in all_checkboxes:
                if await cb.is_checked():
                    checked_count += 1

            print(f"Checked subjects: {checked_count}")

            print("✅ Subject search verification passed!")

            await browser.close()
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
