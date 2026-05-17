import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time
import json

async def verify_failed_position_random():
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

            # Navigate to home
            await page.goto("http://localhost:5000/")
            await page.wait_for_selector("#start-btn")

            # Mock some questions in storage
            await page.evaluate("""async () => {
                const { default: Storage } = await import('/static/js/storage.js');
                localStorage.clear();
                const sub = 'Test Subject';
                Storage._set('wg_current_subject', sub);
                Storage._set('wg_study_mode', 'obj');

                const subData = {
                    unseen_obj: [
                        {id: 'u1', question: 'Unseen 1', options: {A:'1'}, correct_option: 'A', topic: 'T1'},
                        {id: 'u2', question: 'Unseen 2', options: {A:'1'}, correct_option: 'A', topic: 'T1'},
                        {id: 'u3', question: 'Unseen 3', options: {A:'1'}, correct_option: 'A', topic: 'T1'}
                    ],
                    failed_obj: [
                        {id: 'f1', question: 'Failed 1', options: {A:'1'}, correct_option: 'A', topic: 'T1'},
                        {id: 'f2', question: 'Failed 2', options: {A:'1'}, correct_option: 'A', topic: 'T1'}
                    ],
                    stats: { mastered: 0, failed_total: 0, sessions: 0, topic_stats: {} }
                };
                localStorage.setItem('wg_sub_Test Subject', JSON.stringify(subData));
            }""")

            was_not_at_start = False
            for i in range(20):
                batch = await page.evaluate("""async () => {
                    const { default: Engine } = await import('/static/js/engine.js');
                    return Engine.buildBatch('obj');
                }""")
                ids = [q['id'] for q in batch]
                print(f"Trial {i+1} Batch order: {ids}")

                # Check if f1 or f2 is NOT at index 0 or 1
                if not (ids[0].startswith('f') and ids[1].startswith('f')):
                    was_not_at_start = True
                    print(f"Verified: Failed questions appeared at random position in trial {i+1}")
                    break

            if was_not_at_start:
                print("✅ FIX VERIFIED: Failed questions no longer strictly at the start.")
            else:
                print("❌ FIX FAILED: Failed questions always appeared at the start in 20 trials (highly unlikely if random).")

            await browser.close()
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify_failed_position_random())
