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

            script = """
            async () => {
                const storageMod = await import('/static/js/storage.js');
                const Storage = storageMod.default;

                Storage.setCbtMode(true);
                const isCbt = Storage.isCbtMode();

                Storage.setAntiCheatEnabled(true);
                const isAntiCheat = Storage.isAntiCheatEnabled();

                return { isCbt, isAntiCheat };
            }
            """

            result = await page.evaluate(script)
            if result['isCbt'] and result['isAntiCheat']:
                print("✅ Storage logic for advanced features verified!")
            else:
                print(f"❌ Storage logic failed! {result}")

            await browser.close()
    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    asyncio.run(verify())
