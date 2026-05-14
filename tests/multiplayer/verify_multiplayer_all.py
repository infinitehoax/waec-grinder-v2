import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        async def handle_console(msg):
            print(f"CONSOLE: {msg.text}")

        # Player 1 (Host)
        page1 = await browser.new_page()
        page1.on("console", handle_console)
        await page1.goto('http://localhost:5000/multiplayer')
        await page1.fill('#create-name', 'Alice')
        await page1.select_option('#create-mode', 'obj')
        await page1.click('button:has-text("Create Room")')
        await page1.wait_for_selector('#display-room-id')
        room_id = (await page1.inner_text('#display-room-id')).split(': ')[1]
        print(f"Room created: {room_id}")

        # Player 2 (Guest)
        page2 = await browser.new_page()
        page2.on("console", handle_console)
        await page2.goto('http://localhost:5000/multiplayer')
        await page2.fill('#join-name', 'Bob')
        await page2.fill('#join-room-id', room_id)
        await page2.click('button:has-text("Join Room")')

        # Wait for both to see each other
        await page1.wait_for_selector('text=Bob')
        await page2.wait_for_selector('text=Alice')
        print("Both players joined and visible")

        # Test Chat in Lobby
        await page1.fill('#lobby-chat-input', 'Hello from Alice')
        await page1.click('#lobby-chat-send')
        await page2.wait_for_selector('text=Hello from Alice')
        print("Lobby chat working")

        # Start game
        print("Clicking Start Game via JS...")
        await page1.evaluate('lobby.startGame()')

        # Wait for transition to study
        await asyncio.gather(
            page1.wait_for_url('**/multiplayer/study', timeout=15000),
            page2.wait_for_url('**/multiplayer/study', timeout=15000)
        )
        print("Game started for both")

        # Test Chat in Study
        await page2.fill('#chat-input', 'Good luck Alice!')
        await page2.click('#chat-send')
        await page1.wait_for_selector('text=Good luck Alice!')
        print("Study chat working")

        # Alice answers
        await page1.wait_for_selector('.option-btn', timeout=10000)
        await page1.click('.option-btn:first-child')
        print("Alice clicked an option")

        # Click Next
        await page1.wait_for_selector('#next-btn:visible')
        await page1.click('#next-btn')
        print("Alice clicked Next")

        # Wait for progress update on Bob's side
        try:
            await page2.wait_for_selector('text=1/10', timeout=10000)
            p2_list = await page2.inner_text('#player-progress-list')
            print(f"Bob's sidebar: {p2_list}")
            if "1/10" in p2_list:
                print("SUCCESS: Progress synced")
            else:
                print("FAILURE: Progress mismatch")
        except Exception as e:
            p2_list = await page2.inner_text('#player-progress-list')
            print(f"Bob's sidebar (error/timeout): {p2_list}")
            print(f"Error: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
