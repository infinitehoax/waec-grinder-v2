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
            await page.goto("http://localhost:5000/study?mode=obj")

            script = """
            async () => {
                const mod = await import('/static/js/achievements.js');
                const engine = mod.default;

                const mockStats = {
                    mastered_total: 105,
                    subjects_with_mastery: 4,
                    batches_completed: 1,
                    isBatchEnd: true,
                    currentHour: 2,
                    streak: 7,
                    isPerfectBatch: true,
                    batchSize: 10,
                    multi_stats: { rooms_hosted: 11, chat_messages: 25 },
                    system_stats: { explain_simpler_count: 12, api_calls: 105, total_study_time_ms: 25*60*60*1000 },
                    mastered_per_subject: { 'Physics': 55 },
                    subjects_merged: 3,
                    subjects_mastered_all: ['Biology']
                };

                const earned = [];
                const newlyUnlocked = engine.checkNew(mockStats, earned);
                return newlyUnlocked.map(a => a.id);
            }
            """

            unlocked = await page.evaluate(script)
            print(f"Unlocked achievements: {unlocked}")

            expected = ['a1_parallel', 'senior_prefect', 'efiko', 'jambite_no_more', 'the_grind_begins', '7_day_scholar', 'flawless_batch_10', 'curious_mind', 'social_butterfly', 'einsteins_heir', 'api_funder', 'the_true_grinder', 'polymath']

            missing = [a for a in expected if a not in unlocked]
            if not missing:
                print("✅ Achievement logic verification passed!")
            else:
                print(f"❌ Achievement logic verification failed. Missing: {missing}")

            await browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
