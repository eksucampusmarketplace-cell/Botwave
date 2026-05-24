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
    executor_candidates = module.model_candidates("executor", "executor")
    if executor_candidates[0] == module.SPARE_CAPACITY_CODER_MODEL:
        raise SystemExit({"passed": False, "error": "executor should prefer modern coder routes before spare GPT"})
    if module.SPARE_CAPACITY_CODER_MODEL not in executor_candidates:
        raise SystemExit({"passed": False, "error": "executor should keep spare GPT as a fallback"})
    for _ in range(module.SPARE_CAPACITY_CODE_WRITE_RPM):
        module.record_model_usage(module.SPARE_CAPACITY_CODER_MODEL)
    rate_limited_candidates = module.available_model_candidates("executor", "executor")
    if module.SPARE_CAPACITY_CODER_MODEL in rate_limited_candidates:
        raise SystemExit({"passed": False, "error": "spare GPT coder should be skipped when at RPM limit"})
    if not rate_limited_candidates:
        raise SystemExit({"passed": False, "error": "executor should keep fallbacks when GPT is busy"})
    malformed_tool_output = (
        'file_editor: {"command": "view", "path": "/opt/workspace_base/Botwave/docs/architecture.md"}\n'
        "<tool_call>\n<function=file_editor>\n<parameter=command>\nview\n</parameter>\n"
        + "</function>\n" * 20
    )
    parsed = module.parse_model_json(malformed_tool_output)
    if parsed.get("parse_warning") != "tool_markup_loop_detected":
        raise SystemExit({"passed": False, "error": "malformed tool-call loop was not detected"})
    template = await module.new_repo_template(None)
    required = " ".join(template["template"].get("minimum_files", []))
    if "README.md" not in required or "CI workflow" not in required:
        raise SystemExit({"passed": False, "error": "new repo template missing core files"})
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
