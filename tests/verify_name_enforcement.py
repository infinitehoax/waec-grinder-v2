import asyncio
from playwright.async_api import async_playwright

async def test_name_enforcement():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # 1. Test Lobby - Create Room with "Student"
        await page.goto('http://localhost:5000/multiplayer')
        await page.fill('#create-name', 'Student')
        # Click Create Room - should show error toast
        await page.click('button:has-text("Create Room")')

        # Check for error toast
        error_found = await page.wait_for_selector('text=Please choose a name other than "Student"')
        if error_found:
            print("Lobby Create: Successfully blocked 'Student'")

        # 2. Test Lobby - Join Room with "Student"
        await page.fill('#join-name', 'Student')
        await page.fill('#join-room-id', '123456')
        await page.click('button:has-text("Join Room")')

        error_found = await page.wait_for_selector('text=Please choose a name other than "Student"')
        if error_found:
            print("Lobby Join: Successfully blocked 'Student'")

        # 3. Test Dashboard Start Session
        await page.goto('http://localhost:5000/')
        # Ensure name is Student (it should be by default in fresh session)

        # Handle prompt - this is tricky in Playwright
        page.on("dialog", lambda dialog: dialog.accept("ValidPlayer"))

        # Wait for subjects to load
        await page.wait_for_selector('.subject-checkbox')
        # Select a subject to enable the button
        await page.check('.subject-checkbox')

        # Check if button is enabled
        is_disabled = await page.eval_on_selector('#start-btn', 'el => el.disabled')
        if is_disabled:
             print("Dashboard: Start button still disabled after subject selection")
             # Try clicking the label instead
             await page.click('#subject-list label:first-child')

        await page.click('#start-btn')

        # If it worked, it should have prompted for name and then redirected to /study
        await page.wait_for_url('**/study**', timeout=5000)
        print("Dashboard: Successfully prompted for name and started session")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_name_enforcement())
