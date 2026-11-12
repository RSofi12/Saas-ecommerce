import subprocess
import time
import sys
from pathlib import Path

def start_services():
    # Launch backend + frontend using the provided batch file
    proc = subprocess.Popen(["cmd", "/c", "iniciar_proyecto.bat"], cwd=Path.cwd())
    # Give some time for servers to start (adjust if needed)
    time.sleep(15)
    return proc

def run_pytest(target):
    # Use the same Python interpreter (py) to run pytest
    result = subprocess.run(["py", "-m", "pytest", target], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"[WARN] pytest {target} exited with code {result.returncode}")
    return result.returncode

def main():
    # Start backend and frontend
    services = start_services()
    try:
        # Run backend integration tests if any
        backend_exit = run_pytest("tests/backend")
        # Run web UI tests with Playwright
        web_exit = run_pytest("tests/web")
        # Final exit code reflects any failures
        sys.exit(0 if (backend_exit == 0 and web_exit == 0) else 1)
    finally:
        # Optional: terminate the launched services (batch windows stay open)
        # Since they are separate CMD windows, they will remain after script ends.
        pass

if __name__ == "__main__":
    main()

