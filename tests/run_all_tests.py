import unittest
import sys
import os
import subprocess
import asyncio

def run_unittest_suite():
    print("=== Running Unit and Integration Tests ===")
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(__file__)
    suite = loader.discover(start_dir, pattern='test_*.py')

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()

async def run_playwright_tests():
    print("\n=== Running Playwright Verification Tests ===")
    tests = [
        "verify_rendering.py",
        "verify_explanation_rendering.py",
        "verify_report_card.py",
        "multiplayer/verify_multiplayer_all.py"
    ]

    all_passed = True
    for test_file in tests:
        print(f"\n--- Running {test_file} ---")
        filepath = os.path.join(os.path.dirname(__file__), test_file)

        # We need to run these as separate processes because they start the server
        try:
            process = await asyncio.create_subprocess_exec(
                "python3", filepath,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            print(stdout.decode())
            if stderr:
                print(stderr.decode(), file=sys.stderr)

            if process.returncode != 0:
                print(f"❌ {test_file} failed with return code {process.returncode}")
                all_passed = False
            else:
                if "✅" in stdout.decode() or "SUCCESS" in stdout.decode() or "passed" in stdout.decode().lower():
                    print(f"✅ {test_file} passed")
                else:
                    print(f"⚠️ {test_file} finished but success marker not found in output")

        except Exception as e:
            print(f"❌ Error running {test_file}: {e}")
            all_passed = False

    return all_passed

async def main():
    unittests_passed = run_unittest_suite()

    # Check if playwright is installed before running UI tests
    playwright_passed = True
    try:
        import playwright
        playwright_passed = await run_playwright_tests()
    except ImportError:
        print("\n⚠️ Playwright not installed. Skipping UI tests.")
        print("Install with: pip install playwright && playwright install")

    if unittests_passed and playwright_passed:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
