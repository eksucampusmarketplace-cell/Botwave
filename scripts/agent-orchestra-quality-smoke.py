#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import importlib.util
import os
import subprocess
import sys
from pathlib import Path


def ensure_python_dependencies() -> None:
    missing = []
    for package in ("fastapi", "httpx", "yaml"):
        try:
            __import__("yaml" if package == "yaml" else package)
        except ModuleNotFoundError:
            missing.append("pyyaml" if package == "yaml" else package)
    if missing:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])


def load_app():
    ensure_python_dependencies()
    os.environ.setdefault("AGENT_ORCHESTRA_API_KEY", "test-key")
    os.environ.setdefault("LITELLM_MASTER_KEY", "test-litellm-key")
    repo_root = Path(__file__).resolve().parents[1]
    app_path = repo_root / "deploy" / "agent-orchestra" / "app.py"
    spec = importlib.util.spec_from_file_location("agent_orchestra_app", app_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load agent-orchestra app")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def main() -> None:
    module = load_app()
    result = await module.self_tests_quality(None)
    if not result.get("passed"):
        raise SystemExit(result)
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
