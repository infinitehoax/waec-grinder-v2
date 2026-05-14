import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Player 1 (Host)
        page1 = await browser.new_page()
        await page1.goto('http://localhost:5000/multiplayer')
        await page1.fill('#create-name', 'Alice')
        await page1.select_option('#create-mode', 'obj')
        await page1.click('button:has-text("Create Room")')
        await page1.wait_for_selector('#display-room-id')
        room_id = (await page1.inner_text('#display-room-id')).split(': ')[1]

        # Player 2 (Guest)
        page2 = await browser.new_page()
        await page2.goto('http://localhost:5000/multiplayer')
        await page2.fill('#join-name', 'Bob')
        await page2.fill('#join-room-id', room_id)
        await page2.click('button:has-text("Join Room")')

        await page1.wait_for_selector('text=Bob')
        await page1.evaluate('lobby.startGame()')

        await asyncio.gather(
            page1.wait_for_url('**/multiplayer/study', timeout=15000),
            page2.wait_for_url('**/multiplayer/study', timeout=15000)
        )
        print("Game started")

        # Finish for Alice
        for i in range(10):
            await page1.wait_for_selector('.option-btn', timeout=10000)
            await page1.click('.option-btn:first-child')
            await page1.wait_for_selector('#next-btn:visible')
            await page1.click('#next-btn')
            print(f"Alice finished question {i+1}")

        # Finish for Bob
        for i in range(10):
            await page2.wait_for_selector('.option-btn', timeout=10000)
            await page2.click('.option-btn:first-child')
            await page2.wait_for_selector('#next-btn:visible')
            await page2.click('#next-btn')
            print(f"Bob finished question {i+1}")

        # Both should see scoreboard
        await page1.wait_for_selector('text=Final Results', timeout=20000)
        await page2.wait_for_selector('text=Final Results', timeout=20000)
        print("Scoreboard visible for both")

        results = await page1.inner_text('.card')
        print("Final Scoreboard Content:")
        print(results)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
