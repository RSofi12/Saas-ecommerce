import subprocess
import time
import sys
import os
from pathlib import Path
import signal

# Paths
PROJECT_ROOT = Path.cwd()
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

def start_backend():
    # Launch uvicorn directly
    cmd = ["py", "-m", "uvicorn", "main:app", "--reload", "--port", "8000"]
    return subprocess.Popen(cmd, cwd=BACKEND_DIR)

def start_frontend():
    # npm start (Angular dev server)
    cmd = ["npm", "start"]
    return subprocess.Popen(cmd, cwd=FRONTEND_DIR, shell=True)

def run_pytest(target: str) -> int:
    result = subprocess.run(["py", "-m", "pytest", target], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"[WARN] pytest {target} exited with code {result.returncode}")
    return result.returncode

def main():
    print("[INFO] Starting backend and frontend services...")
    backend_proc = start_backend()
    frontend_proc = start_frontend()
    try:
        # Wait for services to be ready (adjust if needed)
        time.sleep(20)
        print("[INFO] Running backend integration tests (if any)...")
        backend_exit = run_pytest("tests/backend")
        print("[INFO] Running web UI tests with Playwright...")
        web_exit = run_pytest("tests/web")
        exit_code = 0 if (backend_exit == 0 and web_exit == 0) else 1
    finally:
        # Terminate services
        print("[INFO] Stopping backend and frontend processes...")
        for proc in (backend_proc, frontend_proc):
            if proc.poll() is None:
                if os.name == "nt":
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()

