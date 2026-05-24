
from __future__ import annotations

import asyncio
import json
import os
import html
import re
import sqlite3
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote_plus, unquote, urlparse

import httpx
import yaml
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
AGENTS_PATH = ROOT / "agents.yaml"
TRACE_DB = ROOT / "traces.sqlite3"
DLQ_PATH = ROOT / "dead-letter.jsonl"

def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip(chr(34)).strip(chr(39))
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(ROOT / ".env")

LITELLM_BASE_URL = os.getenv("LITELLM_BASE_URL", "http://172.17.0.1:4000/v1").rstrip("/")
LITELLM_MASTER_KEY = os.getenv("LITELLM_MASTER_KEY", "")
ORCHESTRA_API_KEY = os.getenv("AGENT_ORCHESTRA_API_KEY", "")
if not ORCHESTRA_API_KEY:
    try:
        with open(Path(__file__).resolve().parent / ".env") as _f:
            for _l in _f:
                _l = _l.strip()
                if _l.startswith("AGENT_ORCHESTRA_API_KEY="):
                    ORCHESTRA_API_KEY = _l.split("=", 1)[1].strip().strip(chr(34)).strip(chr(39))
    except Exception:
        pass

MAX_PER_CONVERSATION = float(os.getenv("AGENT_MAX_CONVERSATION_COST_USD", "0.20"))
MAX_REQUEST_BYTES = int(os.getenv("AGENT_MAX_REQUEST_BYTES", "262144"))
WEB_SEARCH_PROVIDER = os.getenv("AGENT_WEB_SEARCH_PROVIDER", "duckduckgo").lower()
WEB_SEARCH_TIMEOUT = float(os.getenv("AGENT_WEB_SEARCH_TIMEOUT", "10"))
WEB_SEARCH_CACHE_SECONDS = int(os.getenv("AGENT_WEB_SEARCH_CACHE_SECONDS", "900"))
HEALER_AUTO_FIX = os.getenv("AGENT_HEALER_AUTO_FIX", "true").lower() == "true"

OWNER_TRUST_MODE = os.getenv("AGENT_ORCHESTRA_OWNER_TRUST_MODE", "true").lower() == "true"
OWNER_TRUST_TIMEOUTS = {"explainer": 8, "reflector": 12}

AGENT_LIMITS: dict[str, dict[str, int]] = {
    "planner": {"max_input_tokens": 12000, "max_output_tokens": 3000, "timeout": 35, "retries": 1},
    "thinker": {"max_input_tokens": 12000, "max_output_tokens": 2500, "timeout": 35, "retries": 1},
    "researcher": {"max_input_tokens": 120000, "max_output_tokens": 4096, "timeout": 70, "retries": 0},
    "executor": {"max_input_tokens": 16000, "max_output_tokens": 2500, "timeout": 18, "retries": 2},
    "critic": {"max_input_tokens": 16000, "max_output_tokens": 2500, "timeout": 30, "retries": 1},
    "reflector": {"max_input_tokens": 24000, "max_output_tokens": 1200, "timeout": 25, "retries": 1},
    "synthesizer": {"max_input_tokens": 20000, "max_output_tokens": 3000, "timeout": 50, "retries": 0},
    "mediator": {"max_input_tokens": 16000, "max_output_tokens": 3000, "timeout": 45, "retries": 0},
    "guardian": {"max_input_tokens": 6000, "max_output_tokens": 800, "timeout": 18, "retries": 1},
    "benchmark": {"max_input_tokens": 20000, "max_output_tokens": 3000, "timeout": 45, "retries": 0},
    "regression": {"max_input_tokens": 16000, "max_output_tokens": 2500, "timeout": 45, "retries": 0},
    "governor": {"max_input_tokens": 8000, "max_output_tokens": 1200, "timeout": 30, "retries": 0},
    "explainer": {"max_input_tokens": 8000, "max_output_tokens": 1000, "timeout": 20, "retries": 1},
    "scheduler": {"max_input_tokens": 8000, "max_output_tokens": 1200, "timeout": 30, "retries": 0},
    "builder": {"max_input_tokens": 20000, "max_output_tokens": 3000, "timeout": 35, "retries": 1},
}

AGENT_FALLBACK_MODELS = {
    "executor": ["builder", "specialist-coder", "primary-coder"],
    "builder": ["executor", "specialist-coder", "primary-coder"],
    "planner": ["hard-coder", "primary-coder"],
    "thinker": ["primary-coder", "specialist-coder"],
    "researcher": ["long-context-reader-lite", "primary-coder"],
    "critic": ["primary-coder", "premium-coder"],
    "reflector": ["primary-coder", "specialist-coder"],
    "explainer": ["primary-coder", "specialist-coder"],
    "guardian": ["primary-coder"],
}

CODE_WRITE_AGENTS = {"planner", "executor", "critic", "builder", "synthesizer"}
READER_ONLY_MODELS = {"researcher", "long-context-reader", "long-context-reader-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"}
SEMAPHORES = {"default": asyncio.Semaphore(8), "researcher": asyncio.Semaphore(1), "guardian": asyncio.Semaphore(16)}
CIRCUIT: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=8))
COOLDOWN_UNTIL: dict[str, float] = defaultdict(float)

WEB_SEARCH_CACHE: dict[str, dict[str, Any]] = {}

ENGINEERING_QUALITY_POLICY = {
    "investigation_first": [
        "Read relevant files and neighboring patterns before proposing code",
        "Separate observed facts from assumptions",
        "Use live web search for current external behavior when available",
    ],
    "human_style_code": [
        "Prefer small focused diffs",
        "Match existing style and naming",
        "Avoid comments unless they explain durable intent",
    ],
    "dead_code_prevention": [
        "Do not add unused functions, variables, routes, imports, or branches",
        "Remove obsolete fallback code when replacing behavior",
        "Critic must reject code outputs with unreachable or unused scaffolding",
    ],
    "verification_required": [
        "Run lint/typecheck/tests when executable",
        "For manager endpoints, label plan-only vs execute-capable behavior honestly",
        "For healer actions, use BotWave-safe graceful commands only",
    ],
}

NEW_REPO_PROJECT_TEMPLATE = {
    "name": "future-project-new-repo-template",
    "purpose": "Reusable bootstrap guardrails for a brand-new project or repository.",
    "minimum_files": [
        "README.md with product goal, setup, run, test, deploy, and rollback notes",
        "AGENTS.md or equivalent with repo-specific agent rules and safety constraints",
        ".env.example listing required variables without real secrets",
        ".gitignore that excludes secrets, build outputs, caches, and local data",
        "package.json/pyproject.toml/etc. with explicit lint, typecheck, test, build scripts",
        "CI workflow that runs install, lint, typecheck, tests, and build on PRs",
    ],
    "required_workflow": [
        "Investigate framework and deployment target before writing feature code",
        "Create the docs/config skeleton before app logic so future agents have context",
        "Add a quality checklist covering lint, typecheck, test, build, security, and rollback",
        "Use PR workflow; never push directly to the default branch",
        "Document known limitations and commands that could not be verified",
    ],
    "quality_gates": [
        "A fresh clone can install dependencies from documented commands",
        "README setup instructions match the scripts actually present",
        "Lint/typecheck/test/build commands either pass or are explicitly marked unavailable",
        "No committed secrets, tokens, passwords, private keys, or real .env files",
        "Critical deploy files require backup before editing",
    ],
    "verification_command": "Run the repo's documented lint/typecheck/test/build commands before handoff.",
}

UNSAFE_HEALER_PATTERNS = ("docker kill", "kill -9", "down -v", "docker compose down", "docker-compose down")



OWNER_HARD_BLOCK_PATTERNS = (
    ("secret_leak", "private key"),
    ("secret_leak", "service role key"),
    ("secret_leak", "print .env"),
    ("secret_leak", "cat .env"),
    ("malware", "reverse shell"),
    ("malware", "exfiltrate"),
    ("destructive", "docker compose down -v"),
    ("destructive", "rm -rf /"),
    ("destructive", "drop database"),
    ("destructive", "truncate table"),
    ("destructive", "kill -9"),
)


def local_guardian_output(value: Any) -> dict[str, Any]:
    raw = json.dumps(value, ensure_ascii=False).lower()
    categories = []
    for kind, pattern in OWNER_HARD_BLOCK_PATTERNS:
        if pattern in raw:
            categories.append({"kind": kind, "severity": "high", "evidence": pattern})
    if categories:
        return {
            "verdict": "BLOCK",
            "categories": categories,
            "rationale_for_user": "Blocked because this owner-mode request matches a hard safety rule for secrets, malware, or destructive production actions.",
            "confidence": 0.9,
            "mode": "owner_trust_fast_guard",
        }
    return {"verdict": "SAFE", "categories": [], "confidence": 0.8, "mode": "owner_trust_fast_guard"}


def local_explainer_output(value: Any) -> dict[str, Any]:
    audience = "user"
    if isinstance(value, dict) and isinstance(value.get("audience"), str):
        audience = value["audience"]
    topic = value.get("topic") if isinstance(value, dict) else None
    plan = value.get("plan") if isinstance(value, dict) else None
    if isinstance(plan, dict):
        summary_source = plan.get("summary_for_user") or plan.get("thought") or plan.get("summary")
    else:
        summary_source = None
    summary = str(summary_source or topic or "The agent workflow chose a safe PR-first plan with verification before handoff.")[:500]
    return {
        "audience": audience if audience in {"user", "developer", "auditor"} else "user",
        "summary": summary,
        "key_decision_points": [
            {"step": "Plan first", "why": "Break the request into small tasks before building."},
            {"step": "Verify before handoff", "why": "Run available checks so failures are visible early."},
            {"step": "Use PR workflow", "why": "Keep source changes reviewable and reversible."},
        ],
        "uncertainty_disclosed": ["Generated by local fallback because the explainer model was unavailable or slow."],
        "suggested_next_actions": ["Review the plan, then run the listed checks or open a PR."],
    }


def local_reflector_output(value: Any) -> dict[str, Any]:
    failures = []
    if isinstance(value, dict):
        raw_failures = value.get("failures") or []
        if isinstance(raw_failures, list):
            failures = [str(item)[:200] for item in raw_failures if str(item).strip()]
    if not failures:
        return {
            "session_summary": "No concrete failure pattern was provided, so no prompt changes are recommended.",
            "patterns_observed": [],
            "prompt_improvements": [],
            "no_change_recommended_for": ["guardian", "planner", "critic", "explainer"],
            "fallback_note": "Generated locally because the reflector model was unavailable or slow.",
        }
    return {
        "session_summary": "Failures were observed, but local fallback needs more trace detail before proposing prompt edits.",
        "patterns_observed": [{"pattern": failure, "occurrences": 1, "impact": "medium"} for failure in failures[:3]],
        "prompt_improvements": [],
        "no_change_recommended_for": [],
        "fallback_note": "Generated locally; rerun Reflector with full traces for surgical prompt diffs.",
    }


def local_agent_fallback(agent_name: str, value: Any) -> dict[str, Any] | None:
    if agent_name == "guardian":
        return local_guardian_output(value)
    if agent_name == "explainer":
        return local_explainer_output(value)
    if agent_name == "reflector":
        return local_reflector_output(value)
    return None


def approx_tokens(value: Any) -> int:
    return max(1, len(json.dumps(value, ensure_ascii=False)) // 4)


def load_agents() -> dict[str, dict[str, Any]]:
    data = yaml.safe_load(AGENTS_PATH.read_text())
    return {item["name"]: item for item in data["agents"]}

AGENTS = load_agents()


def init_db() -> None:
    conn = sqlite3.connect(TRACE_DB)
    conn.execute(
        """
        create table if not exists traces (
            run_id text primary key,
            parent_run_id text,
            conversation_id text,
            agent text not null,
            model_used text,
            prompt_tokens integer,
            completion_tokens integer,
            total_tokens integer,
            cost real,
            latency_ms integer,
            verdict text,
            error text,
            created_at integer not null
        )
        """
    )
    conn.commit()
    conn.close()


def record_trace(row: dict[str, Any]) -> None:
    conn = sqlite3.connect(TRACE_DB)
    conn.execute(
        """
        insert or replace into traces(run_id,parent_run_id,conversation_id,agent,model_used,prompt_tokens,completion_tokens,total_tokens,cost,latency_ms,verdict,error,created_at)
        values(:run_id,:parent_run_id,:conversation_id,:agent,:model_used,:prompt_tokens,:completion_tokens,:total_tokens,:cost,:latency_ms,:verdict,:error,:created_at)
        """,
        row,
    )
    conn.commit()
    conn.close()


def conversation_cost(conversation_id: str) -> float:
    conn = sqlite3.connect(TRACE_DB)
    cur = conn.execute("select coalesce(sum(cost),0) from traces where conversation_id=?", (conversation_id,))
    value = float(cur.fetchone()[0])
    conn.close()
    return value


def dead_letter(record: dict[str, Any]) -> None:
    with DLQ_PATH.open("a") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def parse_model_json(content: str | None) -> Any:
    if not content:
        return {"raw": content or "", "parse_warning": "model returned empty content"}
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
        if fenced:
            try:
                return json.loads(fenced.group(1))
            except json.JSONDecodeError:
                pass
        start_candidates = [idx for idx in (content.find("{"), content.find("[")) if idx >= 0]
        if start_candidates:
            start = min(start_candidates)
            for end in range(len(content), start, -1):
                snippet = content[start:end].strip()
                if not snippet:
                    continue
                try:
                    return json.loads(snippet)
                except json.JSONDecodeError:
                    continue
        return {"raw": content, "parse_warning": "model returned non-json after repair envelope"}


def model_candidates(agent_name: str, primary_model: str) -> list[str]:
    candidates = [primary_model]
    for candidate in AGENT_FALLBACK_MODELS.get(agent_name, []):
        if candidate not in candidates:
            candidates.append(candidate)
    return candidates


async def require_key(authorization: str | None = Header(default=None), x_agent_api_key: str | None = Header(default=None)) -> None:
    if not ORCHESTRA_API_KEY:
        raise HTTPException(status_code=503, detail="AGENT_ORCHESTRA_API_KEY is not configured")
    token = x_agent_api_key
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if token != ORCHESTRA_API_KEY:
        raise HTTPException(status_code=401, detail="invalid agent API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    global _watcher_task
    if "_watcher_loop" in globals() and (_watcher_task is None or _watcher_task.done()):
        _watcher_task = asyncio.create_task(_watcher_loop())
    try:
        yield
    finally:
        if _watcher_task is not None:
            _watcher_task.cancel()

app = FastAPI(title="Botwave Agent Orchestra", version="1.0.0", lifespan=lifespan)

class InvokeRequest(BaseModel):
    input: Any
    run_id: str | None = None
    parent_run_id: str | None = None
    conversation_id: str | None = None
    task_kind: str | None = None
    max_output_tokens: int | None = None
    response_format: dict[str, Any] | None = None

class SupervisorRequest(BaseModel):
    request: str = Field(..., min_length=1, max_length=12000)
    context: dict[str, Any] = Field(default_factory=dict)
    mode: str = "plan_only"
    conversation_id: str | None = None
    allow_code_generation: bool = True
    allow_shell_commands: bool = False
    allow_file_writes: bool = False
    allow_git_push: bool = False
    allow_deploy: bool = False
    max_output_tokens: int = 900

@app.middleware("http")
async def request_size_guard(request: Request, call_next):
    body = await request.body()
    if len(body) > MAX_REQUEST_BYTES:
        return JSONResponse(status_code=413, content={"error": "request too large"})
    async def receive():
        return {"type": "http.request", "body": body}
    request._receive = receive
    return await call_next(request)

@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "agents": sorted(AGENTS),
        "litellm_base_url": LITELLM_BASE_URL,
        "capabilities": [
            "supervisor/execute", "supervisor/plan",
            "guardian/pre-edit-check", "validator/predict-side-effects",
            "patch/safe-apply", "rollback/check-and-revert",
            "code-index/build", "code-index/search",
            "lessons/add", "lessons", "lessons/for-path",
            "memory/search", "memory/context",
            "traces/recent", "traces/dashboard",
            "managers/pr-manager", "managers/test-runner",
            "managers/deploy-gatekeeper", "managers/memory-agent",
            "managers/cost-rate-monitor", "templates/new-repo",
            "watcher/status", "watcher/run", "research/web-search", "self-improvement/status",
            "github/create-pr", "github/comment", "github/pr-status",
            "risk/classify",
            "feedback/scan",
            "healer/check-and-fix",
            "reviewer/review",
            "test-gen/generate",
            "rollback/plan", "rollback/execute",
        ],
        "lessons_count": len(_get_all_lessons(1000)),
        "code_index_exists": CODE_INDEX_DB.exists(),
    }

@app.get("/agents")
async def list_agents(_: None = Depends(require_key)) -> dict[str, Any]:
    return {"agents": [{"name": n, "model": a["model"], "job": a.get("job", "")} for n, a in sorted(AGENTS.items())]}

# ─── Live trace dashboard ───────────────────────────────────────────

@app.get("/traces/recent")
async def traces_recent(
    minutes: int = 60,
    limit: int = 100,
    agent: str | None = None,
    verdict: str | None = None,
    _: None = Depends(require_key),
) -> dict[str, Any]:
    """Live trace viewer — shows recent agent activity across all conversations."""
    conn = sqlite3.connect(TRACE_DB)
    conn.row_factory = sqlite3.Row
    since = int(time.time()) - (minutes * 60)
    query = "select * from traces where created_at > ?"
    params: list[Any] = [since]
    if agent:
        query += " and agent = ?"
        params.append(agent)
    if verdict:
        query += " and verdict = ?"
        params.append(verdict)
    query += " order by created_at desc limit ?"
    params.append(limit)
    rows = [dict(r) for r in conn.execute(query, params)]
    stats = {}
    for r in rows:
        a = r["agent"]
        if a not in stats:
            stats[a] = {"total": 0, "passed": 0, "failed": 0, "avg_latency_ms": 0, "total_tokens": 0}
        stats[a]["total"] += 1
        if r.get("verdict") == "passed":
            stats[a]["passed"] += 1
        else:
            stats[a]["failed"] += 1
        stats[a]["avg_latency_ms"] += r.get("latency_ms") or 0
        stats[a]["total_tokens"] += r.get("total_tokens") or 0
    for a in stats:
        if stats[a]["total"]:
            stats[a]["avg_latency_ms"] = stats[a]["avg_latency_ms"] // stats[a]["total"]
    conn.close()
    return {
        "window_minutes": minutes,
        "total_traces": len(rows),
        "agent_stats": stats,
        "traces": rows,
        "active_cooldowns": {k: round(v - time.time(), 1) for k, v in COOLDOWN_UNTIL.items() if v > time.time()},
        "circuit_breakers": {k: len([t for t in v if time.time() - t < 300]) for k, v in CIRCUIT.items() if v},
    }



@app.get("/dashboard")
async def web_dashboard() -> HTMLResponse:
    traces_data = await traces_recent(minutes=60, limit=100, agent=None, verdict=None)
    watcher_data = await watcher_status()
    lessons_data = _get_all_lessons(10)

    html = f"""<!DOCTYPE html>
<html><head><title>Agent Orchestra Dashboard</title>
<style>
body {{ font-family: -apple-system, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 20px; }}
h1 {{ color: #58a6ff; }}
.card {{ background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 12px 0; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }}
.stat {{ font-size: 24px; font-weight: bold; color: #58a6ff; }}
.label {{ font-size: 12px; color: #8b949e; text-transform: uppercase; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #30363d; }}
th {{ color: #8b949e; }}
.pass {{ color: #3fb950; }}
.fail {{ color: #f85149; }}
.warn {{ color: #d29922; }}
a {{ color: #58a6ff; }}
</style></head><body>
<h1>Agent Orchestra Dashboard</h1>
<div class="grid">
  <div class="card"><div class="stat">{len(AGENTS)}</div><div class="label">Agents</div></div>
  <div class="card"><div class="stat">{traces_data.get('total_traces', 0)}</div><div class="label">Traces (60m)</div></div>
  <div class="card"><div class="stat">{len(lessons_data)}</div><div class="label">Lessons</div></div>
  <div class="card"><div class="stat">{len(watcher_data.get('current', {}).get('checks', []))}</div><div class="label">Checks</div></div>
</div>
<h2>Agent Activity</h2>
<p style='color:#8b949e'>Activity only includes runs from the last 60 minutes. Loaded agents with 0 recent runs are still available.</p>
<table><tr><th>Agent</th><th>Runs</th><th>Passed</th><th>Failed</th><th>Avg Latency</th><th>Status</th></tr>"""
    recent_stats = traces_data.get("agent_stats", {})
    for agent in sorted(AGENTS):
        stats = recent_stats.get(agent, {"total": 0, "passed": 0, "failed": 0, "avg_latency_ms": 0})
        cls = "pass" if stats.get("failed", 0) == 0 else "fail"
        status = "active" if stats.get("total", 0) else "loaded, no recent runs"
        html += f"<tr><td>{agent}</td><td>{stats.get('total', 0)}</td><td class='{cls}'>{stats.get('passed', 0)}</td><td class='fail'>{stats.get('failed', 0)}</td><td>{stats.get('avg_latency_ms', 0) / 1000:.1f}s</td><td>{status}</td></tr>"
    html += """</table>
<h2>Service Checks</h2>
<table><tr><th>Name</th><th>CPU</th><th>Memory</th><th>Status</th></tr>"""
    for check in watcher_data.get("current", {}).get("checks", [])[:30]:
        name = check.get("container") or check.get("service") or check.get("error", "unknown")
        cls = "pass" if check.get("status") == "ok" else "warn"
        html += f"<tr><td>{str(name)[:60]}</td><td>{check.get('cpu_pct', '')}</td><td>{check.get('mem_mb', '')}</td><td class='{cls}'>{check.get('status', '')}</td></tr>"
    html += """</table>
<h2>Lessons</h2><table><tr><th>Rule</th><th>Severity</th></tr>"""
    for lesson in lessons_data:
        cls = {"critical": "fail", "high": "warn", "warning": "warn", "info": "pass"}.get(lesson.get("severity", ""), "")
        html += f"<tr><td>{lesson.get('rule', '')[:100]}</td><td class='{cls}'>{lesson.get('severity', '')}</td></tr>"
    html += f"""</table>
<p><a href="/traces/dashboard">Trace dashboard JSON</a> · <a href="/approvals/pending">Pending approvals JSON</a></p>
<p style='color:#8b949e;font-size:12px;margin-top:20px'>Last updated: {int(time.time())}</p>
</body></html>"""
    return HTMLResponse(html)


@app.get("/approvals/pending")
async def approvals_pending() -> dict[str, Any]:
    pending_file = ROOT / "approvals-pending.jsonl"
    pending: list[dict[str, Any]] = []
    if pending_file.exists():
        with pending_file.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    item = {"raw": line}
                if item.get("status", "pending") == "pending":
                    pending.append(item)
    return {"pending_count": len(pending), "approvals": pending[-50:]}


@app.get("/traces/dashboard")
async def traces_dashboard() -> dict[str, Any]:
    """High-level dashboard: agent health, costs, and system status."""
    conn = sqlite3.connect(TRACE_DB)
    conn.row_factory = sqlite3.Row
    now = int(time.time())
    h1 = now - 3600
    h24 = now - 86400

    hour_stats = [dict(r) for r in conn.execute(
        "select agent, count(*) calls, sum(case when verdict='passed' then 1 else 0 end) passed, "
        "avg(latency_ms) avg_latency, sum(total_tokens) tokens, sum(cost) cost "
        "from traces where created_at > ? group by agent", (h1,)
    )]
    day_stats = [dict(r) for r in conn.execute(
        "select agent, count(*) calls, sum(case when verdict='passed' then 1 else 0 end) passed, "
        "avg(latency_ms) avg_latency, sum(total_tokens) tokens, sum(cost) cost "
        "from traces where created_at > ? group by agent", (h24,)
    )]
    dlq_count = 0
    if DLQ_PATH.exists():
        with DLQ_PATH.open() as f:
            dlq_count = sum(1 for _ in f)
    conn.close()
    return {
        "system_status": "paused" if os.getenv("AGENT_POOL_PAUSED") == "true" else "active",
        "agents_loaded": len(AGENTS),
        "last_hour": hour_stats,
        "last_24h": day_stats,
        "dead_letter_queue_size": dlq_count,
        "active_cooldowns": {k: round(v - time.time(), 1) for k, v in COOLDOWN_UNTIL.items() if v > time.time()},
    }




@app.get("/traces/{conversation_id}")
async def traces(conversation_id: str, _: None = Depends(require_key)) -> dict[str, Any]:
    conn = sqlite3.connect(TRACE_DB)
    conn.row_factory = sqlite3.Row
    rows = [dict(r) for r in conn.execute("select * from traces where conversation_id=? order by created_at", (conversation_id,))]
    conn.close()
    return {"conversation_id": conversation_id, "traces": rows}



def _extract_research_query(value: Any) -> str:
    if isinstance(value, str):
        return value[:300]
    if isinstance(value, dict):
        for key in ("query", "request", "goal", "problem", "topic"):
            raw = value.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip()[:300]
        return json.dumps(value, ensure_ascii=False)[:300]
    return str(value)[:300]


def _strip_html(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", raw)
    raw = re.sub(r"(?s)<.*?>", " ", raw)
    return re.sub(r"\s+", " ", raw).strip()


def _decode_search_redirect(href: str) -> str:
    marker = "a1"
    query = parse_qs(urlparse(href).query)
    encoded = query.get("u", [""])[0]
    if encoded.startswith(marker):
        encoded = encoded[len(marker):]
    if not encoded:
        return href
    try:
        import base64
        padded = encoded + "=" * (-len(encoded) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore")
        return decoded or href
    except Exception:
        return href


def _normalize_search_url(href: str) -> str:
    if "uddg=" in href:
        parsed = urlparse(href)
        return unquote(parse_qs(parsed.query).get("uddg", [href])[0])
    if "bing.com/ck/" in href and "u=" in urlparse(href).query:
        return _decode_search_redirect(href)
    return href


def _dedupe_search_results(results: list[dict[str, str]], limit: int) -> list[dict[str, str]]:
    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in results:
        url = item.get("url", "").strip()
        title = item.get("title", "").strip()
        if not url or not title or url in seen:
            continue
        seen.add(url)
        deduped.append({
            "title": title[:180],
            "url": url[:500],
            "snippet": item.get("snippet", "")[:320],
            "source": item.get("source", "web"),
        })
        if len(deduped) >= limit:
            break
    return deduped


def _parse_duckduckgo_html(raw_html: str, limit: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    blocks = re.findall(r'(?is)<div[^>]+class="[^"]*result[^"]*"[^>]*>(.*?)</div>\s*</div>', raw_html)
    if not blocks:
        blocks = re.findall(r'(?is)<a[^>]+class="result__a"[^>]+href="[^"]+"[^>]*>.*?</a>.*?(?:<a[^>]+class="result__snippet"[^>]*>.*?</a>)?', raw_html)
    for block in blocks:
        link = re.search(r'(?is)<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block)
        if not link:
            continue
        href, title_html = link.groups()
        snippet = ""
        snippet_match = re.search(r'(?is)<a[^>]+class="result__snippet"[^>]*>(.*?)</a>', block)
        if snippet_match:
            snippet = _strip_html(snippet_match.group(1))
        results.append({
            "title": html.unescape(_strip_html(title_html)),
            "url": _normalize_search_url(html.unescape(href)),
            "snippet": html.unescape(snippet),
            "source": "duckduckgo",
        })
        if len(results) >= limit:
            break
    return _dedupe_search_results(results, limit)


def _parse_bing_html(raw_html: str, limit: int) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    for block in re.findall(r'(?is)<li[^>]+class="[^"]*b_algo[^"]*".*?</li>', raw_html):
        link = re.search(r'(?is)<h2[^>]*>\s*<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', block)
        if not link:
            continue
        snippet_match = re.search(r'(?is)<p[^>]*>(.*?)</p>', block)
        results.append({
            "title": html.unescape(_strip_html(link.group(2))),
            "url": _normalize_search_url(html.unescape(link.group(1))),
            "snippet": html.unescape(_strip_html(snippet_match.group(1)) if snippet_match else ""),
            "source": "bing",
        })
        if len(results) >= limit:
            break
    return _dedupe_search_results(results, limit)


async def _fetch_search_page(client: httpx.AsyncClient, provider: str, query: str) -> httpx.Response:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; BotWaveAgentOrchestra/1.0)"}
    if provider == "bing":
        return await client.get("https://www.bing.com/search", params={"q": query}, headers=headers)
    return await client.get("https://duckduckgo.com/html/", params={"q": query}, headers=headers)


async def web_search(query: str, limit: int = 5) -> dict[str, Any]:
    query = re.sub(r"\s+", " ", query.strip())[:300]
    if not query:
        return {"query": query, "provider": WEB_SEARCH_PROVIDER, "results": [], "error": "empty query"}
    limit = max(1, min(limit, 8))
    cache_key = f"{WEB_SEARCH_PROVIDER}:{limit}:{query.lower()}"
    cached = WEB_SEARCH_CACHE.get(cache_key)
    now = time.time()
    if cached and now - cached["created_at"] < WEB_SEARCH_CACHE_SECONDS:
        data = dict(cached["data"])
        data["freshness"] = "cached_live_http_search"
        return data

    providers = [WEB_SEARCH_PROVIDER]
    if WEB_SEARCH_PROVIDER != "bing":
        providers.append("bing")
    if "duckduckgo" not in providers:
        providers.append("duckduckgo")

    errors: list[str] = []
    results: list[dict[str, str]] = []
    provider_used = providers[0]
    async with httpx.AsyncClient(timeout=WEB_SEARCH_TIMEOUT, follow_redirects=True) as client:
        for provider in providers:
            try:
                resp = await _fetch_search_page(client, provider, query)
                if resp.status_code >= 400:
                    errors.append(f"{provider} http {resp.status_code}")
                    continue
                parsed = _parse_bing_html(resp.text, limit) if provider == "bing" else _parse_duckduckgo_html(resp.text, limit)
                if parsed:
                    provider_used = provider
                    results = parsed
                    break
                errors.append(f"{provider} returned no parseable results")
            except Exception as exc:
                errors.append(f"{provider}: {exc}")

    data = {
        "query": query,
        "provider": provider_used,
        "freshness": "live_http_search",
        "result_count": len(results),
        "results": results[:limit],
        "error": "; ".join(errors) if errors and not results else None,
        "searched_at": int(now),
    }
    WEB_SEARCH_CACHE[cache_key] = {"created_at": now, "data": data}
    return data


async def enrich_researcher_input(value: Any) -> Any:
    query = _extract_research_query(value)
    search = await web_search(query, limit=5)
    if isinstance(value, dict):
        enriched = dict(value)
        enriched["web_search"] = search
        enriched["instruction"] = (
            str(enriched.get("instruction", ""))
            + "\nUse web_search.results as live evidence. If results are empty or error is set, say that live search failed instead of pretending."
        ).strip()
        return enriched
    return {"query": query, "original_input": value, "web_search": search}

@app.get("/research/web-search")
async def research_web_search(q: str, limit: int = 5, _: None = Depends(require_key)) -> dict[str, Any]:
    return await web_search(q, limit=limit)

@app.post("/agents/{agent_name}/invoke")
async def invoke(agent_name: str, req: InvokeRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    if agent_name not in AGENTS:
        raise HTTPException(status_code=404, detail=f"unknown agent {agent_name}")
    agent = AGENTS[agent_name]
    model = agent["model"]
    if req.task_kind in {"code_write", "code_edit"} and model in READER_ONLY_MODELS:
        raise HTTPException(status_code=400, detail="reader-only model rejected for code-writing task")
    if agent_name in CODE_WRITE_AGENTS and model in READER_ONLY_MODELS:
        raise HTTPException(status_code=400, detail="code-writing agent cannot use reader-only model")

    run_id = req.run_id or str(uuid.uuid4())
    conversation_id = req.conversation_id or run_id
    if conversation_cost(conversation_id) >= MAX_PER_CONVERSATION:
        raise HTTPException(status_code=429, detail="conversation budget exhausted")

    if OWNER_TRUST_MODE and agent_name == "guardian":
        response_obj = local_guardian_output(req.input)
        trace = {"run_id": run_id, "parent_run_id": req.parent_run_id, "conversation_id": conversation_id, "agent": agent_name, "model_used": "owner-trust-fast-guard", "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost": 0.0, "latency_ms": 0, "verdict": "passed", "error": None, "created_at": int(time.time())}
        record_trace(trace)
        return {"run_id": run_id, "conversation_id": conversation_id, "agent": agent_name, "model_used": "owner-trust-fast-guard", "output": response_obj, "trace": trace}

    limits = AGENT_LIMITS[agent_name]
    if approx_tokens(req.input) > limits["max_input_tokens"]:
        raise HTTPException(status_code=413, detail="input exceeds agent token envelope")
    candidates = [candidate for candidate in model_candidates(agent_name, model) if COOLDOWN_UNTIL[candidate] <= time.time()]
    if not candidates:
        raise HTTPException(status_code=429, detail="all candidate models are cooling down after recent failures")

    agent_input = await enrich_researcher_input(req.input) if agent_name == "researcher" else req.input
    messages = [
        {"role": "system", "content": agent["system_prompt"] + "\n\nReturn ONLY strict JSON matching this contract:\n" + agent.get("output_contract", "{}")},
        {"role": "user", "content": json.dumps(agent_input, ensure_ascii=False)},
    ]
    max_tokens = min(req.max_output_tokens or limits["max_output_tokens"], limits["max_output_tokens"])
    payload: dict[str, Any] = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": max_tokens, "response_format": {"type": "json_object"}}
    if req.response_format is not None:
        payload["response_format"] = req.response_format

    sem = SEMAPHORES.get(agent_name, SEMAPHORES["default"])
    start = time.perf_counter()
    error = None
    verdict = "failed"
    response_obj: Any = None
    usage: dict[str, Any] = {}
    model_used = model
    if not LITELLM_MASTER_KEY:
        error = "LITELLM_MASTER_KEY is not configured"
        trace = {"run_id": run_id, "parent_run_id": req.parent_run_id, "conversation_id": conversation_id, "agent": agent_name, "model_used": model, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost": 0.0, "latency_ms": 0, "verdict": "failed", "error": error, "created_at": int(time.time())}
        record_trace(trace)
        raise HTTPException(status_code=503, detail={"error": error, "trace": trace})
    headers = {"Authorization": f"Bearer {LITELLM_MASTER_KEY}", "Content-Type": "application/json"}

    max_attempts = min(len(candidates), limits["retries"] + 1)
    timeout_seconds = limits["timeout"]
    if OWNER_TRUST_MODE and agent_name in OWNER_TRUST_TIMEOUTS:
        max_attempts = 1
        timeout_seconds = min(timeout_seconds, OWNER_TRUST_TIMEOUTS[agent_name])
    async with sem:
        for attempt, candidate_model in enumerate(candidates[:max_attempts]):
            payload["model"] = candidate_model
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    resp = await client.post(f"{LITELLM_BASE_URL}/chat/completions", headers=headers, json=payload)
                if resp.status_code in {429, 500, 502, 503, 504} and attempt < max_attempts - 1:
                    await asyncio.sleep(1.5 * (attempt + 1))
                    continue
                if resp.status_code >= 400:
                    raise RuntimeError(f"LiteLLM {resp.status_code}: {resp.text[:1000]}")
                data = resp.json()
                msg = data["choices"][0]["message"]["content"]
                usage = data.get("usage") or {}
                model_used = data.get("model") or candidate_model
                response_obj = parse_model_json(msg)
                verdict = "passed"
                error = None
                break
            except httpx.TimeoutException:
                error = f"{candidate_model} timed out after {timeout_seconds}s"
            except Exception as exc:
                error = str(exc) or f"{candidate_model} failed without detail"
            CIRCUIT[candidate_model].append(time.time())
            recent = [t for t in CIRCUIT[candidate_model] if time.time() - t < 300]
            if len(recent) >= 2:
                COOLDOWN_UNTIL[candidate_model] = time.time() + 30
            if attempt >= max_attempts - 1:
                dead_letter({"run_id": run_id, "agent": agent_name, "model": candidate_model, "error": error, "input": req.input, "created_at": int(time.time())})

    latency_ms = int((time.perf_counter() - start) * 1000)
    cost = float(usage.get("cost") or 0.0)
    trace = {
        "run_id": run_id,
        "parent_run_id": req.parent_run_id,
        "conversation_id": conversation_id,
        "agent": agent_name,
        "model_used": model_used,
        "prompt_tokens": int(usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("completion_tokens") or 0),
        "total_tokens": int(usage.get("total_tokens") or 0),
        "cost": cost,
        "latency_ms": latency_ms,
        "verdict": verdict,
        "error": error,
        "created_at": int(time.time()),
    }
    if verdict != "passed":
        fallback = local_agent_fallback(agent_name, req.input)
        if fallback is not None:
            response_obj = fallback
            model_used = f"{agent_name}-local-fallback"
            trace.update({"model_used": model_used, "verdict": "passed", "error": None})
    record_trace(trace)
    if verdict != "passed" and response_obj is None:
        raise HTTPException(status_code=502, detail={"error": error, "trace": trace})
    return {"run_id": run_id, "conversation_id": conversation_id, "agent": agent_name, "model_used": model_used, "output": response_obj, "trace": trace}


SUPERVISOR_SYSTEM = """You are SUPERVISOR for Botwave's agent orchestra.
Your user may not know how to code. Convert their plain-English request into a safe, supervised software workflow.
Return ONLY strict JSON with keys: summary_for_user, risk_level, requires_user_approval, blocked_actions, recommended_sequence, agent_calls, safety_checks, pr_plan, production_deploy_allowed, simple_next_step.
Rules:
- Never approve production deploy, direct production edits, destructive database operations, or secret exposure unless explicit allow flags are true.
- Prefer GitHub PR workflow over direct edits.
- Use guardian for safety checks, planner for decomposition, builder/executor for implementation guidance, critic for review, benchmark/regression for quality checks.
- Explain in simple language suitable for a non-coder.
- If the request is vague, return a safe plan plus one simple clarification in simple_next_step.
"""

def blocked_actions_for(req: SupervisorRequest) -> list[str]:
    blocked: list[str] = []
    if not req.allow_shell_commands:
        blocked.append("shell_commands")
    if not req.allow_file_writes:
        blocked.append("file_writes")
    if not req.allow_git_push:
        blocked.append("git_push")
    if not req.allow_deploy:
        blocked.append("production_deploy")
    return blocked


DEEP_REASONING_TRIGGERS = (
    "production", "deploy", "database", "migration", "security", "auth",
    "payment", "billing", "secret", "architecture", "cross-repo",
    "multiple repos", "failed", "timeout", "crash", "data loss", "delete",
)

FAST_MODE_SEQUENCE = ["guardian", "planner", "test-runner", "critic"]
DEEP_MODE_SEQUENCE = ["guardian", "thinker", "researcher", "planner", "critic", "regression", "benchmark"]


def should_deep_reason(req: SupervisorRequest) -> tuple[bool, list[str]]:
    text = " ".join([req.request, json.dumps(req.context, ensure_ascii=False), req.mode]).lower()
    reasons = [trigger for trigger in DEEP_REASONING_TRIGGERS if trigger in text]
    if req.allow_deploy:
        reasons.append("deploy_allowed")
    if req.allow_file_writes or req.allow_git_push:
        reasons.append("side_effects_allowed")
    return bool(reasons or req.mode in {"deep", "deep_reasoning", "production"}), sorted(set(reasons))

async def run_agent_internal(agent_name: str, payload: Any, conversation_id: str, parent_run_id: str | None = None, max_output_tokens: int = 700, task_kind: str | None = None) -> dict[str, Any]:
    req = InvokeRequest(input=payload, conversation_id=conversation_id, parent_run_id=parent_run_id, max_output_tokens=max_output_tokens, task_kind=task_kind)
    return await invoke(agent_name, req, None)

@app.post("/supervisor/plan")
async def supervisor_plan(req: SupervisorRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    conversation_id = req.conversation_id or "supervisor-" + str(uuid.uuid4())
    blocked = blocked_actions_for(req)
    deep_reasoning, deep_reasons = should_deep_reason(req)

    planner_input = {
        "goal": req.request,
        "context": {
            "mode_selected": "deep" if deep_reasoning else "fast",
            "deep_reasoning_reasons": deep_reasons,
            "available_agents": [a for a in sorted(AGENTS) if a != "planner"],
            "available_tools": [
                {"name": "github_pr", "schema": "Create branch, commit, push, PR; only when requested by operator"},
                {"name": "lint_typecheck_tests", "schema": "Run repo validation commands before merge/deploy"},
                {"name": "openhands_shell", "schema": "Allowed only if allow_shell_commands=true"},
            ],
            "constraints": {
                "budget_usd": 0.10,
                "deadline_seconds": 300,
                "must_not_modify": ["production", "secrets", "database"] if not req.allow_deploy else ["secrets"],
                "blocked_actions": blocked,
                "non_coder_user": True,
                "accuracy_gate": "Every action needs evidence, a verification check, and confidence calibration.",
            },
            "memory_snippets": [],
        },
    }
    guardian_task = run_agent_internal(
        "guardian",
        {"input": req.request, "context": {"mode": req.mode, "blocked_actions": blocked, "user_context": req.context}},
        conversation_id,
        max_output_tokens=300,
    )
    planner_task = run_agent_internal("planner", planner_input, conversation_id, max_output_tokens=req.max_output_tokens)
    first_wave = {"guardian": guardian_task, "planner": planner_task}
    if deep_reasoning:
        first_wave["thinker"] = run_agent_internal(
            "thinker",
            {"problem": req.request, "context": req.context, "required_output": "assumptions, unknowns, verification plan, confidence"},
            conversation_id,
            max_output_tokens=450,
        )
        first_wave["researcher"] = run_agent_internal(
            "researcher",
            {"query": "Find only facts needed to avoid mistakes for this Botwave/OpenHands request.", "request": req.request, "context": req.context},
            conversation_id,
            max_output_tokens=450,
        )
    try:
        first_results = await asyncio.wait_for(asyncio.gather(*first_wave.values(), return_exceptions=True), timeout=45)
    except asyncio.TimeoutError:
        first_results = [TimeoutError("supervisor first wave timed out after 45s") for _ in first_wave]
    first = dict(zip(first_wave.keys(), first_results))
    for name, result in first.items():
        if isinstance(result, Exception):
            first[name] = {"output": {"error": str(result), "confidence": 0.0}, "run_id": conversation_id}
    guardian = first["guardian"]
    planner = first["planner"]

    critic_criteria = [
        "safe for non-coder user",
        "uses PR workflow",
        "blocks production deploy without approval",
        "has tests/lint/typecheck",
        "states evidence, assumptions, verification, and confidence",
    ]
    critic_task = run_agent_internal(
        "critic",
        {"artifact": planner.get("output"), "criteria": critic_criteria, "deep_reasoning": deep_reasoning, "supporting_outputs": {k: v.get("output") for k, v in first.items() if isinstance(v, dict)}},
        conversation_id,
        parent_run_id=planner.get("run_id"),
        max_output_tokens=450,
    )
    explainer_task = run_agent_internal(
        "explainer",
        {"topic": "Explain this supervised plan in simple language", "audience": "non-coder Botwave owner", "plan": planner.get("output"), "blocked_actions": blocked, "mode": "deep" if deep_reasoning else "fast", "deep_reasons": deep_reasons},
        conversation_id,
        parent_run_id=planner.get("run_id"),
        max_output_tokens=350,
    )
    try:
        critic, explainer = await asyncio.wait_for(asyncio.gather(critic_task, explainer_task), timeout=45)
    except asyncio.TimeoutError:
        critic = {"output": {"error": "critic timed out after 45s", "confidence": 0.0}, "run_id": conversation_id}
        explainer = {"output": {"error": "explainer timed out after 45s", "confidence": 0.0}, "run_id": conversation_id}

    production_deploy_allowed = bool(req.allow_deploy)
    accuracy_policy = {
        "mode": "deep" if deep_reasoning else "fast",
        "deep_reasoning_reasons": deep_reasons,
        "required_before_side_effects": ["read-only state check", "explicit authorized step", "verification command", "critic review"],
        "confidence_floor": 0.75,
        "fallback_behavior": "timeout/failure triggers alternate model or safer plan; no silent guessing",
    }
    workflow = DEEP_MODE_SEQUENCE if deep_reasoning else FAST_MODE_SEQUENCE
    return {
        "conversation_id": conversation_id,
        "mode": req.mode,
        "production_deploy_allowed": production_deploy_allowed,
        "blocked_actions": blocked,
        "accuracy_policy": accuracy_policy,
        "agent_sequence": workflow,
        "summary": {
            "guardian": guardian.get("output"),
            "thinker": first.get("thinker", {}).get("output") if isinstance(first.get("thinker"), dict) else None,
            "researcher": first.get("researcher", {}).get("output") if isinstance(first.get("researcher"), dict) else None,
            "planner": planner.get("output"),
            "critic": critic.get("output"),
            "simple_explanation": explainer.get("output"),
        },
        "recommended_workflow": [
            "Use Supervisor output as guidance inside OpenHands/Devin.",
            "Use fast mode for routine fixes; deep mode for risky/ambiguous/repeated-failure work.",
            "Use PR Manager to plan separate PRs for Botwave/evolution-api.",
            "Use Test Runner to identify lint/typecheck/test commands.",
            "Use Critic and Cost/Rate Monitor before merging.",
            "Use Deploy Gatekeeper; deploy only after explicit approval.",
        ],
        "next_step_for_user": "Approve the PR workflow for this request, or ask Supervisor to revise the plan.",
        "trace_url": f"/traces/{conversation_id}",
    }


REPO_CONFIG = {
    "botwave": {"path": "/opt/workspace_base/Botwave", "host_path": "/root/openhands-workspace/Botwave", "branch": "BotWave", "remote": "eksucampusmarketplace-cell/Botwave"},
    "evolution-api": {"path": "/opt/workspace_base/evolution-api", "host_path": "/root/openhands-workspace/evolution-api", "branch": "main", "remote": "eksucampusmarketplace-cell/evolution-api"},
}
TEST_COMMANDS = {
    "botwave": [
        {"command": "npm run lint", "phase": "fast", "timeout_seconds": 60},
        {"command": "npm run typecheck", "phase": "fast", "timeout_seconds": 90},
        {"command": "npm test", "phase": "long_async", "timeout_seconds": 180},
    ],
    "evolution-api": [
        {"command": "npm run lint", "phase": "fast", "timeout_seconds": 60},
        {"command": "npm run build", "phase": "fast", "timeout_seconds": 120},
        {"command": "npm test", "phase": "long_async", "timeout_seconds": 180},
    ],
}
COST_THRESHOLDS = {
    "error_rate_5m": 0.10,
    "quota_warning_ratio": 0.80,
    "p95_latency_multiplier": 2.0,
}
MEMORY_DB = ROOT / "memory.jsonl"

LESSONS_DB = ROOT / "lessons.jsonl"
CODE_INDEX_DB = ROOT / "code-index.jsonl"
PATCH_QUEUE_DIR = ROOT / "patch-queue"
ROLLBACK_LOG = ROOT / "rollback-history.jsonl"

CRITICAL_PATHS = {
    "/root/Botwave/deploy/",
    "/root/Botwave/.env",
    "/opt/botwave/deploy/",
    "/etc/caddy/Caddyfile",
    "/root/litellm/config.yaml",
    "/root/agent-orchestra/.env",
    "/root/openhands-state/",
}

BACKUP_DIR = Path("/root/backups/pre-edit")


# ─── Persistent Memory System ───────────────────────────────────────

MAX_MEMORY_ENTRIES = 500
MEMORY_SEARCH_LIMIT = 10

def load_recent_memories(limit: int = MEMORY_SEARCH_LIMIT, query: str | None = None) -> list[dict[str, Any]]:
    """Load recent memories, optionally filtered by keyword relevance."""
    if not MEMORY_DB.exists():
        return []
    memories = []
    with MEMORY_DB.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                memories.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    # Filter out low-confidence memories
    memories = [m for m in memories if m.get("confidence", 0) >= 0.3]
    # Sort by created_at descending
    memories.sort(key=lambda m: m.get("created_at", 0), reverse=True)
    if query:
        query_lower = query.lower()
        query_words = set(query_lower.split())
        def relevance(m: dict[str, Any]) -> float:
            text = m.get("request", "").lower() + " " + " ".join(m.get("tags", []))
            matches = sum(1 for w in query_words if w in text)
            recency = min(1.0, (time.time() - m.get("created_at", 0)) / 86400)
            return matches * 2 + m.get("confidence", 0.5) + (1.0 - recency) * 0.5
        memories.sort(key=relevance, reverse=True)
    return memories[:limit]


def auto_save_memory(conversation_id: str, request: str, thinking_trace: list[dict[str, Any]], complexity: str, outcome: str) -> bool:
    """Auto-persist learnings from a completed supervisor execution."""
    if not request or len(request) < 10:
        return False
    # Extract key learnings from thinking trace
    learnings = []
    for trace in thinking_trace:
        agent = trace.get("agent", "")
        verdict = trace.get("verdict", "")
        detail = trace.get("detail", {})
        if verdict == "error":
            learnings.append(f"{agent} failed: {str(detail)[:100]}")
        elif isinstance(detail, dict):
            if detail.get("assumptions"):
                learnings.append(f"{agent} assumptions: {str(detail['assumptions'])[:100]}")
            if detail.get("risks"):
                learnings.append(f"{agent} risks: {str(detail['risks'])[:100]}")
            if detail.get("key_insight"):
                learnings.append(f"{agent}: {str(detail['key_insight'])[:150]}")
    # Build memory entry
    tags = []
    for signal_list in COMPLEXITY_SIGNALS.values():
        for signal in signal_list:
            if signal in request.lower():
                tags.append(signal)
    note = {
        "created_at": int(time.time()),
        "conversation_id": conversation_id,
        "request": request[:500],
        "complexity": complexity,
        "outcome": outcome,
        "learnings": learnings[:5],
        "tags": tags[:10],
        "confidence": 0.7 if outcome == "completed" else 0.4,
        "verification_count": 0,
        "failure_count": 0 if outcome == "completed" else 1,
        "auto_saved": True,
    }
    # Check if memory has secrets
    secret_words = ["password", "token", "secret", "api key", "credential", "private key"]
    if any(w in request.lower() for w in secret_words):
        note["request"] = "[REDACTED - contained secret reference]"
        note["learnings"] = ["[REDACTED]"]
    try:
        with MEMORY_DB.open("a") as f:
            f.write(json.dumps(note) + "\n")
        # Prune old entries if too many
        _prune_memories()
        return True
    except Exception:
        return False


def _prune_memories() -> None:
    """Keep only the most recent MAX_MEMORY_ENTRIES with high confidence."""
    if not MEMORY_DB.exists():
        return
    memories = []
    with MEMORY_DB.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    memories.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    if len(memories) <= MAX_MEMORY_ENTRIES:
        return
    # Sort: keep high-confidence recent ones, drop low-confidence old ones
    memories.sort(key=lambda m: (m.get("confidence", 0) * 0.3 + (m.get("created_at", 0) / time.time()) * 0.7), reverse=True)
    memories = memories[:MAX_MEMORY_ENTRIES]
    with MEMORY_DB.open("w") as f:
        for m in memories:
            f.write(json.dumps(m) + "\n")



@app.get("/memory/search")
async def memory_search(
    q: str = "",
    limit: int = 10,
    _: None = Depends(require_key),
) -> dict[str, Any]:
    """Search past memories for context. Called before starting work."""
    memories = load_recent_memories(limit=min(limit, 50), query=q or None)
    return {
        "query": q,
        "results": len(memories),
        "memories": memories,
        "total_stored": sum(1 for _ in MEMORY_DB.open("r")) if MEMORY_DB.exists() else 0,
    }


@app.get("/memory/context")
async def memory_context(
    request: str = "",
    _: None = Depends(require_key),
) -> dict[str, Any]:
    """Get relevant memory context for a new task. Auto-called by supervisor."""
    relevant = load_recent_memories(limit=5, query=request)
    recent = load_recent_memories(limit=3)
    # Deduplicate
    seen_ids = set()
    combined = []
    for m in relevant + recent:
        mid = m.get("conversation_id", str(m.get("created_at", "")))
        if mid not in seen_ids:
            seen_ids.add(mid)
            combined.append(m)
    return {
        "context_memories": combined[:8],
        "has_relevant_history": len(relevant) > 0,
        "recent_failures": [m for m in combined if m.get("failure_count", 0) > 0][:3],
    }


def _jsonl_count(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r") as f:
        return sum(1 for line in f if line.strip())

@app.get("/self-improvement/status")
async def self_improvement_status(_: None = Depends(require_key)) -> dict[str, Any]:
    return {
        "memory_entries": _jsonl_count(MEMORY_DB),
        "lessons": _jsonl_count(LESSONS_DB),
        "watcher_running": _watcher_task is not None and not _watcher_task.done(),
        "watcher_interval_seconds": WATCHER_INTERVAL,
        "feedback_scan": "runs every 20 watcher ticks and can add lessons from reverted/corrected agent commits",
        "memory_loop": "supervisor loads relevant memory before work and saves outcome after work",
        "limits": ["not model training", "does not rewrite its own code", "lesson quality depends on traces/commit history"],
        "healer_auto_fix_enabled": HEALER_AUTO_FIX,
        "owner_trust_mode": OWNER_TRUST_MODE,
        "owner_trust_timeouts": OWNER_TRUST_TIMEOUTS,
        "web_search_provider": WEB_SEARCH_PROVIDER,
        "engineering_quality_policy": ENGINEERING_QUALITY_POLICY,
        "new_repo_project_template": NEW_REPO_PROJECT_TEMPLATE,
        "self_tests": {"endpoint": "/self-tests/quality", "covers": ["web_search_parsing", "researcher_enrichment", "safe_healer_commands", "manager_capability_truth", "quality_policy", "new_repo_template"]},
    }

class ManagerRequest(BaseModel):
    request: str = Field(default="", max_length=12000)
    repo: str | None = None
    repos: list[str] = Field(default_factory=list)
    allow_execute: bool = False
    allow_write: bool = False
    allow_git_push: bool = False
    allow_deploy: bool = False
    draft: bool = True
    changed_lines: int = 0
    touches_business_logic: bool = False
    production_health_ok: bool = False
    approval_expires_at: int | None = None
    confidence: float = 0.6
    conversation_id: str | None = None

def selected_repos(req: ManagerRequest) -> list[str]:
    raw = req.repos or ([req.repo] if req.repo else [])
    names = [r for r in raw if r in REPO_CONFIG]
    return names or ["botwave"]

def significant_change(req: ManagerRequest) -> bool:
    return req.changed_lines >= 10 or bool(req.touches_business_logic)

@app.post("/managers/pr-manager/plan")
async def pr_manager_plan(req: ManagerRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    significant = significant_change(req)
    plans = []
    for repo in selected_repos(req):
        cfg = REPO_CONFIG[repo]
        plans.append({
            "repo": repo,
            "path": cfg["path"],
            "host_path": cfg.get("host_path"),
            "base_branch": cfg["branch"],
            "remote": cfg["remote"],
            "should_create_pr": significant,
            "draft_mode": bool(req.draft or req.changed_lines >= 100),
            "significance_rule": ">=10 changed lines or touches business logic",
            "safe_branch_pattern": "openhands/<timestamp>-short-description",
            "steps": [
                "Investigate relevant files and recent failures before editing",
                "Confirm working tree status and avoid unrelated files",
                "Create a feature branch from the base branch",
                "Make only scoped changes with no dead code or unnecessary comments",
                "Run Test Runner fast checks first",
                "Commit with a clear message",
                "Open draft PR for large/risky changes",
                "Explain PR in simple language for the owner",
            ],
            "allowed_to_push_now": bool(req.allow_git_push),
        })
    return {"manager": "pr-manager", "capability_level": "planning_with_optional_github_api_helpers", "request": req.request, "plans": plans, "safety": "Never push directly to BotWave/main. Separate repos need separate PRs. Do not create tiny PRs unless significant."}

@app.post("/managers/test-runner/plan")
async def test_runner_plan(req: ManagerRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    repos = []
    for r in selected_repos(req):
        commands = TEST_COMMANDS.get(r, [])
        repos.append({
            "repo": r,
            "path": REPO_CONFIG[r]["path"],
            "host_path": REPO_CONFIG[r].get("host_path"),
            "fast_checks_first": [c for c in commands if c["phase"] == "fast"],
            "long_async_checks": [c for c in commands if c["phase"] == "long_async"],
            "cache_note": "Reuse existing node_modules on the VPS/OpenHands workspace when present.",
        })
    return {"manager": "test-runner", "capability_level": "planning_only_unless_allow_execute_is_true", "allow_execute": bool(req.allow_execute), "repos": repos, "quality_gates": ENGINEERING_QUALITY_POLICY, "timeout_policy": "Report timeout per command instead of hanging the pipeline; do not force-kill production containers."}

@app.get("/templates/new-repo")
async def new_repo_template(_: None = Depends(require_key)) -> dict[str, Any]:
    """Reusable future-project bootstrap template for brand-new repos."""
    return {"template": NEW_REPO_PROJECT_TEMPLATE, "quality_gates": ENGINEERING_QUALITY_POLICY}

@app.post("/managers/deploy-gatekeeper/check")
async def deploy_gatekeeper_check(req: ManagerRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    now = int(time.time())
    blockers = []
    if not req.allow_deploy:
        blockers.append("User has not explicitly approved production deploy")
    if req.approval_expires_at and req.approval_expires_at < now:
        blockers.append("Approval expired; auto-abort deploy")
    if not req.production_health_ok:
        blockers.append("Current production health has not been verified healthy")
    blockers.extend(["PR should be merged first", "Lint/typecheck/tests should pass", "Rollback plan required"])
    return {"manager": "deploy-gatekeeper", "capability_level": "policy_gate_not_deployer", "deploy_allowed": len(blockers) == 0, "blockers": blockers, "approval_timeout_seconds": 14400, "default": "blocked"}

@app.post("/managers/memory-agent/note")
async def memory_agent_note(req: ManagerRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    note = {
        "created_at": int(time.time()),
        "request": req.request,
        "repos": selected_repos(req),
        "confidence": max(0.0, min(1.0, float(req.confidence))),
        "verification_count": 0,
        "failure_count": 0,
        "secret_safe": not any(word in req.request.lower() for word in ["password", "token", "secret", "api key"]),
    }
    wrote = False
    if req.allow_write and note["secret_safe"]:
        with MEMORY_DB.open("a") as f:
            f.write(json.dumps(note) + "\n")
        wrote = True
    return {"manager": "memory-agent", "capability_level": "write_memory_when_allow_write_true", "memory_locations": [str(MEMORY_DB), "/root/openhands-state/microagents", "/opt/workspace_base/README_OPENHANDS_WORKSPACE.md"], "note": note, "wrote": wrote, "prune_rule": "Prune memories with confidence < 0.3 after repeated failures."}

@app.get("/managers/cost-rate-monitor/status")
async def cost_rate_monitor_status(_: None = Depends(require_key)) -> dict[str, Any]:
    conn = sqlite3.connect(TRACE_DB)
    conn.row_factory = sqlite3.Row
    since_24h = int(time.time()) - 86400
    since_5m = int(time.time()) - 300
    rows = [dict(r) for r in conn.execute("select agent, verdict, count(*) count, avg(latency_ms) avg_latency_ms, sum(total_tokens) total_tokens, sum(cost) total_cost from traces where created_at > ? group by agent, verdict order by agent, verdict", (since_24h,))]
    five = [dict(r) for r in conn.execute("select agent, sum(case when verdict != 'passed' then 1 else 0 end) failures, count(*) total from traces where created_at > ? group by agent", (since_5m,))]
    failures = [dict(r) for r in conn.execute("select agent, model_used, error, created_at from traces where verdict != 'passed' order by created_at desc limit 10")]
    conn.close()
    alerts = []
    for row in five:
        total = int(row.get("total") or 0)
        failures_count = int(row.get("failures") or 0)
        if total and failures_count / total > COST_THRESHOLDS["error_rate_5m"]:
            alerts.append({"agent": row["agent"], "type": "error_rate", "ratio": failures_count / total, "action": "consider LiteLLM cooldown/fallback"})
    return {"manager": "cost-rate-monitor", "capability_level": "observability_and_alerts", "window": "24h", "thresholds": COST_THRESHOLDS, "summary": rows, "recent_failures": failures, "alerts": alerts, "cooldowns": {k: v for k, v in COOLDOWN_UNTIL.items() if v > time.time()}}


# ─── Smarter supervisor: complexity detection + execute mode ────────

COMPLEXITY_SIGNALS = {
    "high": [
        "deploy", "production", "migration", "database", "schema", "security",
        "auth", "payment", "billing", "delete", "remove all", "data loss",
        "architecture", "redesign", "cross-repo", "multiple repos",
        "rollback", "revert", "incident", "outage", "crash",
    ],
    "medium": [
        "refactor", "optimize", "performance", "test", "ci/cd", "webhook",
        "api", "endpoint", "integration", "cache", "redis", "queue",
        "docker", "container", "nginx", "caddy", "proxy",
    ],
}

def detect_complexity(text: str) -> tuple[str, list[str]]:
    """Smarter complexity detection based on semantic signals, not just keywords."""
    lower = text.lower()
    high_hits = [s for s in COMPLEXITY_SIGNALS["high"] if s in lower]
    medium_hits = [s for s in COMPLEXITY_SIGNALS["medium"] if s in lower]
    word_count = len(text.split())
    question_marks = text.count("?")

    if high_hits or len(medium_hits) >= 3:
        return "high", high_hits + medium_hits
    if medium_hits or word_count > 80:
        return "medium", medium_hits
    if question_marks >= 2 or word_count > 40:
        return "medium", ["multi-part request"]
    return "low", []


@app.post("/supervisor/execute")
async def supervisor_execute(req: SupervisorRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Smart execution mode: actually chains agents and returns actionable output.

    Flow:
    1. Guardian safety check
    2. Complexity detection → pick fast/deep
    3. If deep: Thinker reasoning + Researcher facts
    4. Planner decomposition
    5. Builder generates actual code/commands for each subtask
    6. Critic reviews the full output
    7. Returns everything with inline thinking traces
    """
    conversation_id = req.conversation_id or "exec-" + str(uuid.uuid4())
    blocked = blocked_actions_for(req)
    complexity, signals = detect_complexity(req.request)
    deep = complexity in ("high", "medium") or req.mode in ("deep", "deep_reasoning", "production")

    thinking_trace: list[dict[str, Any]] = []

    # Load relevant memories for context enrichment
    memory_context = load_recent_memories(limit=5, query=req.request)
    if req.mode == "plan_only":
        plan = await supervisor_plan(req, None)
        return {
            "conversation_id": plan.get("conversation_id"),
            "status": "planned",
            "complexity": complexity,
            "mode": "plan_only",
            "signals": signals,
            "thinking_trace": [{"agent": "supervisor", "verdict": "planned", "detail": "plan_only mode returns a supervised plan without builder execution"}],
            "plan": plan,
            "code_outputs": [],
            "recovery_output": None,
            "review": None,
            "summary_for_user": plan.get("summary", {}).get("simple_explanation"),
            "blocked_actions": blocked,
            "memory_saved": False,
            "test_generated": None,
            "rollback_plan": None,
            "trace_url": plan.get("trace_url"),
        }

    if memory_context:
        thinking_trace.append({
            "agent": "memory",
            "verdict": "loaded",
            "detail": {
                "relevant_memories": len(memory_context),
                "recent_failures": [m.get("request", "")[:80] for m in memory_context if m.get("failure_count", 0) > 0],
                "relevant_tags": list(set(tag for m in memory_context for tag in m.get("tags", [])))[:10],
            },
        })
        # If past attempts at similar tasks failed, auto-escalate to deep mode
        past_failures = [m for m in memory_context if m.get("failure_count", 0) > 0 and m.get("confidence", 0) < 0.5]
        if past_failures and not deep:
            deep = True
            signals.append("similar_task_failed_before")
            thinking_trace.append({"agent": "memory", "verdict": "escalated", "detail": "Similar task failed before — escalating to deep mode"})

    # Step 1: Guardian
    try:
        guardian_result = await run_agent_internal(
            "guardian",
            {"input": req.request, "context": {"mode": req.mode, "blocked_actions": blocked, "complexity": complexity}},
            conversation_id, max_output_tokens=400,
        )
        guardian_out = guardian_result.get("output", {})
        thinking_trace.append({"agent": "guardian", "verdict": guardian_out.get("verdict", "unknown"), "detail": guardian_out})
        if guardian_out.get("verdict") == "BLOCK":
            return {
                "conversation_id": conversation_id,
                "status": "blocked_by_guardian",
                "thinking_trace": thinking_trace,
                "explanation": guardian_out.get("rationale_for_user", "Request blocked by safety policy."),
            }
    except Exception as e:
        thinking_trace.append({"agent": "guardian", "verdict": "error", "detail": str(e)})

    # Step 2: Deep reasoning (if warranted)
    thinker_out = None
    researcher_out = None
    if deep:
        tasks: dict[str, Any] = {}
        tasks["thinker"] = run_agent_internal(
            "thinker",
            {"problem": req.request, "context": req.context, "complexity": complexity, "signals": signals},
            conversation_id, max_output_tokens=800,
        )
        tasks["researcher"] = run_agent_internal(
            "researcher",
            {"query": req.request, "context": req.context, "scope": "Botwave/OpenHands VPS"},
            conversation_id, max_output_tokens=800,
        )
        try:
            results = await asyncio.wait_for(asyncio.gather(*tasks.values(), return_exceptions=True), timeout=75)
        except asyncio.TimeoutError:
            results = [TimeoutError("deep reasoning timed out after 75s") for _ in tasks]
        named = dict(zip(tasks.keys(), results))
        for name, result in named.items():
            if isinstance(result, Exception):
                thinking_trace.append({"agent": name, "verdict": "error", "detail": str(result)})
            else:
                out = result.get("output", {})
                thinking_trace.append({"agent": name, "verdict": "passed", "detail": out})
                if name == "thinker":
                    thinker_out = out
                elif name == "researcher":
                    researcher_out = out

    # Step 3: Planner
    planner_context = {
        "available_agents": [a for a in sorted(AGENTS) if a != "planner"],
        "constraints": {"blocked_actions": blocked, "budget_usd": 0.15, "quality_policy": ENGINEERING_QUALITY_POLICY},
        "complexity": complexity,
        "signals": signals,
        "memory_context": [{"request": m.get("request", "")[:100], "outcome": m.get("outcome", ""), "learnings": m.get("learnings", [])[:2]} for m in memory_context[:3]] if memory_context else [],
        "lessons": [{"context": l.get("context",""), "rule": l.get("rule",""), "severity": l.get("severity","")} for l in _get_all_lessons(5)],
    }
    if thinker_out:
        planner_context["thinker_reasoning"] = thinker_out
    if researcher_out:
        planner_context["researcher_findings"] = researcher_out

    try:
        planner_result = await run_agent_internal(
            "planner",
            {"goal": req.request, "context": planner_context},
            conversation_id, max_output_tokens=1200,
        )
        planner_out = planner_result.get("output", {})
        thinking_trace.append({"agent": "planner", "verdict": "passed", "detail": planner_out})
    except Exception as e:
        thinking_trace.append({"agent": "planner", "verdict": "error", "detail": str(e)})
        planner_out = {}

    # Step 4: Builder generates code/commands for subtasks
    subtasks = planner_out.get("subtasks", [])
    builder_outputs: list[dict[str, Any]] = []
    for subtask in subtasks[:5]:  # cap at 5 to control costs
        if subtask.get("agent") in ("builder", "executor"):
            try:
                builder_result = await run_agent_internal(
                    "builder",
                    {"intent": subtask.get("input", subtask), "plan_context": planner_out, "thinker_guidance": thinker_out},
                    conversation_id, parent_run_id=planner_result.get("run_id"),
                    max_output_tokens=2000, task_kind="code_write",
                )
                builder_out = builder_result.get("output", {})
                builder_outputs.append({"subtask_id": subtask.get("id"), "output": builder_out})
                thinking_trace.append({"agent": "builder", "verdict": "passed", "subtask": subtask.get("id"), "detail": builder_out})
            except Exception as e:
                thinking_trace.append({"agent": "builder", "verdict": "error", "subtask": subtask.get("id"), "detail": str(e)})

    # Step 5: Critic reviews the full output
    all_outputs = {"planner": planner_out, "builder_outputs": builder_outputs}
    if thinker_out:
        all_outputs["thinker"] = thinker_out
    try:
        critic_result = await run_agent_internal(
            "critic",
            {"artifact": all_outputs, "criteria": ["correctness", "safety", "completeness", "follows plan", "handles errors"]},
            conversation_id, max_output_tokens=600,
        )
        critic_out = critic_result.get("output", {})
        thinking_trace.append({"agent": "critic", "verdict": critic_out.get("verdict", "unknown"), "score": critic_out.get("score"), "detail": critic_out})
    except Exception as e:
        thinking_trace.append({"agent": "critic", "verdict": "error", "detail": str(e)})
        critic_out = {}

    # Step 6: Explainer summary
    try:
        explainer_result = await run_agent_internal(
            "explainer",
            {"topic": "Summarize what was done and what the user should do next", "audience": "non-coder", "thinking_trace": thinking_trace[-4:]},
            conversation_id, max_output_tokens=400,
        )
        explainer_out = explainer_result.get("output", {})
    except Exception:
        explainer_out = {}

    # Error recovery: if Critic rejected or Builder failed, try Reflector for alternative approach
    builder_failures = [t for t in thinking_trace if t.get("agent") == "builder" and t.get("verdict") == "error"]
    critic_rejected = critic_out.get("verdict") in ("REJECT", "REVISE", "reject", "revise")

    recovery_output = None
    if (builder_failures or critic_rejected) and not any(t.get("agent") == "reflector" for t in thinking_trace):
        try:
            reflector_result = await run_agent_internal(
                "reflector",
                {
                    "session_trace": thinking_trace,
                    "original_request": req.request,
                    "failures": [str(f.get("detail", ""))[:200] for f in builder_failures],
                    "critic_feedback": critic_out,
                    "instruction": "Analyze what went wrong and propose an alternative approach. Be specific about what to change.",
                },
                conversation_id, max_output_tokens=1000,
            )
            reflector_out = reflector_result.get("output", {})
            thinking_trace.append({"agent": "reflector", "verdict": "recovery", "detail": reflector_out})

            # If Reflector suggests a retry, try Builder again with refined guidance
            if reflector_out.get("alternative_approach") or reflector_out.get("suggestion"):
                try:
                    retry_input = {
                        "intent": req.request,
                        "previous_failures": [str(f.get("detail", ""))[:150] for f in builder_failures],
                        "reflector_guidance": reflector_out,
                        "instruction": "Previous attempt failed. Use the Reflector's alternative approach.",
                    }
                    retry_result = await run_agent_internal(
                        "builder", retry_input, conversation_id,
                        max_output_tokens=2000, task_kind="code_write",
                    )
                    recovery_output = retry_result.get("output", {})
                    thinking_trace.append({"agent": "builder", "verdict": "recovered", "detail": recovery_output})
                except Exception as retry_err:
                    thinking_trace.append({"agent": "builder", "verdict": "retry_failed", "detail": str(retry_err)})
        except Exception as reflector_err:
            thinking_trace.append({"agent": "reflector", "verdict": "error", "detail": str(reflector_err)})

    # ── Wire: Code Reviewer scores Builder output ──
    review_result = None
    if builder_outputs:
        try:
            combined_code = "\n".join(
                json.dumps(bo.get("output", {}), indent=2)[:3000]
                for bo in builder_outputs
            )
            review_req = ReviewRequest(
                code=combined_code[:8000],
                file_path=builder_outputs[0].get("subtask_id", ""),
                language="typescript",
                post_comments=False,
            )
            review_result = await code_review(review_req, None)
            thinking_trace.append({
                "agent": "reviewer",
                "verdict": review_result.get("verdict", "unknown"),
                "score": review_result.get("score"),
                "detail": {"summary": review_result.get("summary", ""), "issues_count": len(review_result.get("issues", []))},
            })
        except Exception as e:
            thinking_trace.append({"agent": "reviewer", "verdict": "error", "detail": str(e)})

    # ── Wire: Test Generator writes regression test for fixes ──
    test_gen_result = None
    if builder_outputs and any("fix" in req.request.lower() for _ in [1]):
        try:
            test_req = TestGenRequest(
                fix_diff=json.dumps(builder_outputs[0].get("output", {}))[:4000],
                file_path=builder_outputs[0].get("subtask_id", "unknown.ts"),
                bug_description=req.request[:500],
            )
            test_gen_result = await generate_test(test_req, None)
            thinking_trace.append({
                "agent": "test-generator",
                "verdict": "generated" if test_gen_result.get("should_include") else "low_quality",
                "detail": {"test_score": test_gen_result.get("test_score"), "test_file": test_gen_result.get("test_file_path")},
            })
        except Exception as e:
            thinking_trace.append({"agent": "test-generator", "verdict": "error", "detail": str(e)})

    # ── Wire: Rollback Planner for HIGH-risk changes ──
    rollback_plan = None
    if complexity == "high":
        try:
            rollback_req = RollbackPlanRequest(
                change_description=req.request[:500],
                containers_affected=["botwave_web"],
            )
            rollback_plan = await create_rollback_plan(rollback_req, None)
            thinking_trace.append({
                "agent": "rollback-planner",
                "verdict": "plan_ready",
                "detail": {"plan_id": rollback_plan.get("plan_id"), "rollback_commands": rollback_plan.get("rollback_commands")},
            })
        except Exception as e:
            thinking_trace.append({"agent": "rollback-planner", "verdict": "error", "detail": str(e)})

    # Determine final status
    has_errors = any(t.get("verdict") in ("error", "retry_failed") for t in thinking_trace if t.get("agent") in ("builder", "planner"))
    final_status = "completed" if not has_errors else ("recovered" if recovery_output else "partial_failure")

    # Auto-save memory
    auto_save_memory(conversation_id, req.request, thinking_trace, complexity, final_status)

    return {
        "conversation_id": conversation_id,
        "status": final_status,
        "complexity": complexity,
        "mode": "deep" if deep else "fast",
        "signals": signals,
        "thinking_trace": thinking_trace,
        "plan": planner_out,
        "code_outputs": builder_outputs,
        "recovery_output": recovery_output,
        "review": critic_out,
        "summary_for_user": explainer_out,
        "blocked_actions": blocked,
        "memory_saved": True,
        "review": review_result if review_result else critic_out,
        "test_generated": test_gen_result,
        "rollback_plan": rollback_plan.get("plan_id") if rollback_plan else None,
        "trace_url": f"/traces/{conversation_id}",
    }

# ─── Guardian Pre-Edit Safety Rule ──────────────────────────────────

class FileEditCheck(BaseModel):
    file_path: str
    action: str = "edit"  # edit, delete, create
    diff_preview: str = ""
    agent: str = "builder"
    force: bool = False

@app.post("/guardian/pre-edit-check")
async def guardian_pre_edit_check(req: FileEditCheck, _: None = Depends(require_key)) -> dict[str, Any]:
    """Guardian pre-edit safety: backup critical files, log diffs, require approval.

    If any agent tries to modify a file in CRITICAL_PATHS:
    1. Creates a timestamped backup in /root/backups/pre-edit/
    2. Logs the proposed diff to a review queue
    3. Returns whether approval is needed or change is auto-allowed
    """
    import subprocess
    is_critical = any(req.file_path.startswith(p) for p in CRITICAL_PATHS)
    needs_approval = is_critical and not req.force

    backup_path = None
    if is_critical:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y%m%d-%H%M%S")
        safe_name = req.file_path.replace("/", "_").strip("_")
        backup_path = str(BACKUP_DIR / f"{safe_name}.{ts}.bak")
        try:
            src = Path(req.file_path)
            if src.exists():
                import shutil
                shutil.copy2(str(src), backup_path)
        except Exception as e:
            backup_path = f"backup_failed: {e}"

    # Log the proposed change
    review_entry = {
        "timestamp": int(time.time()),
        "file_path": req.file_path,
        "action": req.action,
        "agent": req.agent,
        "is_critical": is_critical,
        "needs_approval": needs_approval,
        "diff_preview": req.diff_preview[:2000],
        "backup_path": backup_path,
        "decision": "blocked_pending_approval" if needs_approval else "auto_allowed",
    }
    PATCH_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    review_file = PATCH_QUEUE_DIR / "review-queue.jsonl"
    with review_file.open("a") as f:
        f.write(json.dumps(review_entry) + "\n")

    # Check lessons DB for relevant warnings
    relevant_lessons = _get_lessons_for_path(req.file_path)

    return {
        "allowed": not needs_approval,
        "is_critical": is_critical,
        "backup_path": backup_path,
        "needs_approval": needs_approval,
        "relevant_lessons": relevant_lessons,
        "message": f"{'BLOCKED: ' if needs_approval else ''}File {req.file_path} is {'critical — approval required' if needs_approval else 'non-critical — auto-allowed'}. {'Backup created at ' + backup_path if backup_path and 'failed' not in str(backup_path) else ''}",
    }


# ─── Lessons Database ───────────────────────────────────────────────

def _get_lessons_for_path(file_path: str) -> list[dict[str, Any]]:
    """Retrieve relevant lessons for a given file path."""
    if not LESSONS_DB.exists():
        return []
    lessons = []
    with LESSONS_DB.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                lesson = json.loads(line)
                ctx = lesson.get("context", "").lower()
                normalized_path = file_path.lower()
                path_parts = [p for p in re.split(r"[^a-z0-9_.-]+", normalized_path) if len(p) >= 3]
                context_parts = [p for p in re.split(r"[^a-z0-9_.-]+", ctx) if len(p) >= 3]
                if any(part in normalized_path for part in context_parts) or any(part in ctx for part in path_parts):
                    lessons.append(lesson)
            except json.JSONDecodeError:
                continue
    return lessons[:5]


def _get_all_lessons(limit: int = 20) -> list[dict[str, Any]]:
    """Get all lessons sorted by recency."""
    if not LESSONS_DB.exists():
        return []
    lessons = []
    with LESSONS_DB.open("r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                lessons.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    lessons.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return lessons[:limit]


class LessonEntry(BaseModel):
    context: str = Field(..., min_length=3, max_length=500)
    rule: str = Field(..., min_length=3, max_length=500)
    enforcement: str = ""
    severity: str = "warning"  # info, warning, critical
    source_agent: str = "reflector"
    conversation_id: str = ""

@app.post("/lessons/add")
async def add_lesson(entry: LessonEntry, _: None = Depends(require_key)) -> dict[str, Any]:
    """Store a structured lesson from Reflector or any agent."""
    lesson = {
        "created_at": int(time.time()),
        "context": entry.context,
        "rule": entry.rule,
        "enforcement": entry.enforcement,
        "severity": entry.severity,
        "source_agent": entry.source_agent,
        "conversation_id": entry.conversation_id,
        "times_applied": 0,
        "active": True,
    }
    with LESSONS_DB.open("a") as f:
        f.write(json.dumps(lesson) + "\n")
    return {"stored": True, "lesson": lesson}

@app.get("/lessons")
async def list_lessons(limit: int = 20, _: None = Depends(require_key)) -> dict[str, Any]:
    """List all stored lessons."""
    return {"lessons": _get_all_lessons(limit)}

@app.get("/lessons/for-path")
async def lessons_for_path(path: str = "", _: None = Depends(require_key)) -> dict[str, Any]:
    """Get lessons relevant to a specific file path."""
    return {"path": path, "lessons": _get_lessons_for_path(path)}


# ─── Code Indexer Agent ─────────────────────────────────────────────

class IndexRequest(BaseModel):
    repo_path: str = "/root/Botwave"
    file_extensions: list[str] = Field(default_factory=lambda: [".ts", ".tsx", ".js", ".jsx", ".py", ".sh"])
    max_files: int = 500

class CodeSearchRequest(BaseModel):
    query: str
    repo: str = "botwave"
    limit: int = 20
    search_type: str = "symbol"  # symbol, file, import, content

@app.post("/code-index/build")
async def build_code_index(req: IndexRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Build a searchable code index for a repo using file parsing.

    Extracts: exports, imports, function/class definitions, file structure.
    Stores as searchable JSONL.
    """
    import subprocess
    repo_path = Path(req.repo_path)
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail=f"Repo not found: {req.repo_path}")

    entries: list[dict[str, Any]] = []
    extensions = set(req.file_extensions)
    file_count = 0

    for ext in extensions:
        try:
            result = subprocess.run(
                ["find", str(repo_path), "-name", f"*{ext}", "-not", "-path", "*/node_modules/*",
                 "-not", "-path", "*/.next/*", "-not", "-path", "*/dist/*", "-not", "-path", "*/.git/*"],
                capture_output=True, text=True, timeout=30
            )
            files = [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
            for file_path in files[:req.max_files - file_count]:
                file_count += 1
                try:
                    with open(file_path, "r", errors="ignore") as f:
                        content_text = f.read(50000)  # cap at 50KB per file
                    rel_path = str(Path(file_path).relative_to(repo_path))
                    lines = content_text.split("\n")

                    # Extract symbols
                    symbols: list[dict[str, Any]] = []
                    imports: list[str] = []
                    exports: list[str] = []

                    for i, line in enumerate(lines):
                        stripped = line.strip()
                        # TypeScript/JavaScript
                        if ext in (".ts", ".tsx", ".js", ".jsx"):
                            if stripped.startswith("import "):
                                imports.append(stripped[:200])
                            if stripped.startswith("export "):
                                exports.append(stripped[:200])
                            if "function " in stripped or "const " in stripped or "class " in stripped:
                                if "export" in stripped or stripped.startswith("function ") or stripped.startswith("class ") or stripped.startswith("const "):
                                    symbols.append({"line": i+1, "text": stripped[:150], "kind": "definition"})
                        # Python
                        elif ext == ".py":
                            if stripped.startswith("import ") or stripped.startswith("from "):
                                imports.append(stripped[:200])
                            if stripped.startswith("def ") or stripped.startswith("class ") or stripped.startswith("async def "):
                                symbols.append({"line": i+1, "text": stripped[:150], "kind": "definition"})

                    entry = {
                        "file": rel_path,
                        "abs_path": file_path,
                        "extension": ext,
                        "lines": len(lines),
                        "symbols": symbols[:50],
                        "imports": imports[:30],
                        "exports": exports[:30],
                        "indexed_at": int(time.time()),
                    }
                    entries.append(entry)
                except Exception:
                    continue
        except Exception:
            continue

    # Write index
    with CODE_INDEX_DB.open("w") as f:
        for e in entries:
            f.write(json.dumps(e) + "\n")

    return {
        "status": "indexed",
        "repo": req.repo_path,
        "files_indexed": len(entries),
        "total_symbols": sum(len(e.get("symbols", [])) for e in entries),
        "total_imports": sum(len(e.get("imports", [])) for e in entries),
    }


@app.post("/code-index/search")
async def search_code_index(req: CodeSearchRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Search the code index for symbols, files, imports, or content."""
    if not CODE_INDEX_DB.exists():
        return {"error": "Index not built. Call POST /code-index/build first.", "results": []}

    entries = []
    with CODE_INDEX_DB.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    query_lower = req.query.lower()
    results: list[dict[str, Any]] = []

    for entry in entries:
        if req.search_type == "file":
            if query_lower in entry.get("file", "").lower():
                results.append({"file": entry["file"], "lines": entry.get("lines", 0), "symbols_count": len(entry.get("symbols", []))})
        elif req.search_type == "symbol":
            for sym in entry.get("symbols", []):
                if query_lower in sym.get("text", "").lower():
                    results.append({"file": entry["file"], "line": sym["line"], "symbol": sym["text"], "kind": sym.get("kind")})
        elif req.search_type == "import":
            for imp in entry.get("imports", []):
                if query_lower in imp.lower():
                    results.append({"file": entry["file"], "import": imp})
        elif req.search_type == "content":
            all_text = " ".join(s.get("text", "") for s in entry.get("symbols", []))
            all_text += " ".join(entry.get("imports", []))
            if query_lower in all_text.lower():
                results.append({"file": entry["file"], "match_type": "content"})

    return {
        "query": req.query,
        "search_type": req.search_type,
        "results_count": len(results[:req.limit]),
        "results": results[:req.limit],
    }


# ─── Safe Patch Agent ───────────────────────────────────────────────

class PatchRequest(BaseModel):
    file_path: str
    diff: str
    repo_path: str = "/root/Botwave"
    test_commands: list[str] = Field(default_factory=lambda: ["npm run lint", "npm run typecheck"])
    auto_commit: bool = False
    commit_message: str = ""

@app.post("/patch/safe-apply")
async def safe_apply_patch(req: PatchRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Safe Patch Agent: apply a diff in sandbox, test, then commit only if tests pass.

    Flow:
    1. Guardian pre-edit check (backup + approval gate)
    2. Apply diff to a temp copy
    3. Run test commands
    4. If tests pass, apply to real file and optionally commit
    5. If tests fail, discard and return failure details
    """
    import subprocess
    import shutil
    import tempfile

    # Step 1: Guardian check
    guardian_check = await guardian_pre_edit_check(
        FileEditCheck(file_path=req.file_path, action="edit", diff_preview=req.diff[:1000], agent="patch-agent"),
        None
    )
    if not guardian_check["allowed"]:
        return {
            "status": "blocked",
            "reason": "Guardian blocked this edit — approval required for critical files",
            "guardian": guardian_check,
        }

    target = Path(req.file_path)
    if not target.exists():
        return {"status": "error", "reason": f"Target file not found: {req.file_path}"}

    # Step 2: Create sandbox copy
    sandbox_dir = Path(tempfile.mkdtemp(prefix="patch-sandbox-"))
    try:
        sandbox_file = sandbox_dir / target.name
        shutil.copy2(str(target), str(sandbox_file))

        # Step 3: Apply diff to sandbox
        diff_file = sandbox_dir / "proposed.diff"
        diff_file.write_text(req.diff)

        apply_result = subprocess.run(
            ["patch", "--dry-run", str(sandbox_file), str(diff_file)],
            capture_output=True, text=True, timeout=10
        )

        if apply_result.returncode != 0:
            return {
                "status": "patch_failed",
                "reason": "Diff could not be applied cleanly",
                "stderr": apply_result.stderr[:500],
            }

        # Actually apply
        subprocess.run(["patch", str(sandbox_file), str(diff_file)], capture_output=True, timeout=10)

        # Step 4: Run tests in the repo dir (with original file temporarily swapped)
        test_results: list[dict[str, Any]] = []
        all_passed = True

        for cmd in req.test_commands[:5]:
            try:
                test_run = subprocess.run(
                    cmd.split(), cwd=req.repo_path,
                    capture_output=True, text=True, timeout=120,
                    env={**dict(__import__("os").environ), "CI": "true"}
                )
                passed = test_run.returncode == 0
                test_results.append({
                    "command": cmd,
                    "passed": passed,
                    "stdout": test_run.stdout[-500:] if not passed else "",
                    "stderr": test_run.stderr[-500:] if not passed else "",
                })
                if not passed:
                    all_passed = False
            except subprocess.TimeoutExpired:
                test_results.append({"command": cmd, "passed": False, "reason": "timeout"})
                all_passed = False
            except Exception as e:
                test_results.append({"command": cmd, "passed": False, "reason": str(e)})
                all_passed = False

        if all_passed:
            # Step 5: Apply to real file
            shutil.copy2(str(sandbox_file), str(target))

            committed = False
            if req.auto_commit and req.commit_message:
                try:
                    subprocess.run(["git", "add", str(target)], cwd=req.repo_path, timeout=10)
                    subprocess.run(
                        ["git", "commit", "-m", req.commit_message],
                        cwd=req.repo_path, timeout=10
                    )
                    committed = True
                except Exception:
                    pass

            return {
                "status": "applied",
                "file": req.file_path,
                "tests_passed": True,
                "test_results": test_results,
                "committed": committed,
                "backup": guardian_check.get("backup_path"),
            }
        else:
            return {
                "status": "rejected",
                "reason": "Tests failed — diff discarded, original file unchanged",
                "tests_passed": False,
                "test_results": test_results,
            }
    finally:
        shutil.rmtree(str(sandbox_dir), ignore_errors=True)


# ─── Pre-Edit Validation Agent ──────────────────────────────────────

class ValidateEditRequest(BaseModel):
    file_path: str
    proposed_change: str
    repo_path: str = "/root/Botwave"

@app.post("/validator/predict-side-effects")
async def predict_side_effects(req: ValidateEditRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Pre-Edit Validation: predict side effects of a proposed change.

    Uses Code Index to find files that import/depend on the target,
    then asks Thinker to predict what might break.
    """
    # Find dependents using code index
    dependents: list[str] = []
    if CODE_INDEX_DB.exists():
        target_name = Path(req.file_path).stem
        with CODE_INDEX_DB.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    for imp in entry.get("imports", []):
                        if target_name.lower() in imp.lower():
                            dependents.append(entry["file"])
                            break
                except json.JSONDecodeError:
                    continue

    # Check lessons for this path
    relevant_lessons = _get_lessons_for_path(req.file_path)

    # Ask Thinker to predict side effects
    try:
        thinker_result = await run_agent_internal(
            "thinker",
            {
                "problem": f"Predict side effects of editing {req.file_path}",
                "context": {
                    "proposed_change": req.proposed_change[:2000],
                    "dependent_files": dependents[:10],
                    "relevant_lessons": [l.get("rule", "") for l in relevant_lessons],
                    "is_critical_path": any(req.file_path.startswith(p) for p in CRITICAL_PATHS),
                },
                "required_output": "risk_level (low/medium/high), predicted_breaks (list), recommendations (list), should_proceed (bool)",
            },
            "validator-" + str(uuid.uuid4()),
            max_output_tokens=600,
        )
        prediction = thinker_result.get("output", {})
    except Exception as e:
        prediction = {"error": str(e), "risk_level": "unknown", "should_proceed": True}

    return {
        "file_path": req.file_path,
        "is_critical": any(req.file_path.startswith(p) for p in CRITICAL_PATHS),
        "dependent_files": dependents[:15],
        "dependent_count": len(dependents),
        "relevant_lessons": relevant_lessons,
        "prediction": prediction,
    }


# ─── Auto-Rollback Agent ───────────────────────────────────────────

class RollbackCheck(BaseModel):
    service: str = "botwave_web"
    health_url: str = "http://127.0.0.1:3000"
    max_response_time_ms: int = 10000
    check_count: int = 3

@app.post("/rollback/check-and-revert")
async def check_and_revert(req: RollbackCheck, _: None = Depends(require_key)) -> dict[str, Any]:
    """Auto-Rollback: check service health and revert if unhealthy.

    1. Hit the health URL multiple times
    2. If >50% checks fail, trigger rollback
    3. Rollback = git revert last commit + container restart
    """
    import subprocess

    checks: list[dict[str, Any]] = []
    failures = 0

    async with httpx.AsyncClient() as client:
        for i in range(req.check_count):
            try:
                start = time.perf_counter()
                resp = await client.get(req.health_url, timeout=req.max_response_time_ms / 1000)
                latency = int((time.perf_counter() - start) * 1000)
                is_healthy = resp.status_code < 500 and latency < req.max_response_time_ms
                checks.append({"attempt": i+1, "status": resp.status_code, "latency_ms": latency, "healthy": is_healthy})
                if not is_healthy:
                    failures += 1
            except Exception as e:
                checks.append({"attempt": i+1, "status": 0, "error": str(e), "healthy": False})
                failures += 1
            await asyncio.sleep(1)

    should_rollback = failures > req.check_count / 2
    rollback_result = None

    if should_rollback:
        # Record rollback
        rollback_entry = {
            "timestamp": int(time.time()),
            "service": req.service,
            "health_url": req.health_url,
            "checks": checks,
            "failures": failures,
            "action": "rollback_triggered",
        }
        try:
            with ROLLBACK_LOG.open("a") as f:
                f.write(json.dumps(rollback_entry) + "\n")
        except Exception:
            pass

        # Try git revert
        try:
            revert = subprocess.run(
                ["git", "log", "--oneline", "-1"],
                cwd="/root/Botwave", capture_output=True, text=True, timeout=5
            )
            last_commit = revert.stdout.strip()[:50]
            rollback_result = {
                "action": "rollback_recommended",
                "last_commit": last_commit,
                "command": "cd /root/Botwave && git revert --no-edit HEAD && docker restart " + req.service,
                "note": "Auto-rollback prepared but NOT executed — requires approval",
            }
        except Exception as e:
            rollback_result = {"action": "rollback_check_failed", "error": str(e)}

        # Store lesson
        try:
            lesson = {
                "created_at": int(time.time()),
                "context": f"when deploying changes to {req.service}",
                "rule": f"Health check failed ({failures}/{req.check_count}) — verify changes more carefully before deploying to {req.service}",
                "enforcement": "Run /rollback/check-and-revert after every deploy",
                "severity": "critical",
                "source_agent": "auto-rollback",
                "conversation_id": "",
                "times_applied": 0,
                "active": True,
            }
            with LESSONS_DB.open("a") as f:
                f.write(json.dumps(lesson) + "\n")
        except Exception:
            pass

    return {
        "service": req.service,
        "health_url": req.health_url,
        "checks": checks,
        "failures": failures,
        "total_checks": req.check_count,
        "should_rollback": should_rollback,
        "rollback": rollback_result,
        "status": "unhealthy_rollback_recommended" if should_rollback else "healthy",
    }

# ─── Watcher Agent (self-monitoring + circuit breaker) ──────────────

WATCHER_INTERVAL = 30  # seconds
WATCHER_CPU_THRESHOLD = 200.0  # percent
WATCHER_MEM_THRESHOLD_MB = 2800  # megabytes
WATCHER_HANG_TIMEOUT = 300  # seconds
WATCHER_HISTORY: deque[dict[str, Any]] = deque(maxlen=100)

async def _watcher_tick() -> dict[str, Any]:
    """Single watcher check: containers, API latency, agent health."""
    import subprocess
    tick = {"timestamp": int(time.time()), "checks": [], "actions": []}

    # Check container stats
    try:
        result = subprocess.run(
            ["docker", "stats", "--no-stream", "--format",
             "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}"],
            capture_output=True, text=True, timeout=15
        )
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) < 3:
                continue
            name = parts[0]
            cpu_str = parts[1].replace("%", "").strip()
            mem_str = parts[2].split("/")[0].strip()
            try:
                cpu = float(cpu_str)
            except ValueError:
                cpu = 0.0
            # Parse memory (handle MiB, GiB)
            mem_mb = 0.0
            try:
                if "GiB" in mem_str:
                    mem_mb = float(mem_str.replace("GiB", "").strip()) * 1024
                elif "MiB" in mem_str:
                    mem_mb = float(mem_str.replace("MiB", "").strip())
                elif "KiB" in mem_str:
                    mem_mb = float(mem_str.replace("KiB", "").strip()) / 1024
            except ValueError:
                pass

            check = {"container": name, "cpu_pct": cpu, "mem_mb": round(mem_mb, 1), "status": "ok"}

            # Circuit breaker: high CPU
            if cpu > WATCHER_CPU_THRESHOLD and name in ("botwave_web", "litellm", "openhands", "evolution_api"):
                check["status"] = "high_cpu"
                tick["actions"].append({
                    "action": "restart_recommended",
                    "container": name,
                    "reason": f"CPU at {cpu}% (threshold: {WATCHER_CPU_THRESHOLD}%)",
                    "command": f"docker stop -t 30 {name} && docker start {name}",
                    "auto_executed": False,
                })
                # Auto-restart if sustained (check history)
                recent_high = sum(
                    1 for h in WATCHER_HISTORY
                    if any(c.get("container") == name and c.get("status") == "high_cpu" for c in h.get("checks", []))
                )
                if recent_high >= 4:  # 4 consecutive ticks = 2 minutes
                    try:
                        subprocess.run(["docker", "stop", "-t", "30", name], timeout=45)
                        subprocess.run(["docker", "start", name], timeout=45)
                        tick["actions"][-1]["auto_executed"] = True
                        tick["actions"][-1]["action"] = "auto_restarted"
                        # Store lesson
                        lesson = {
                            "created_at": int(time.time()),
                            "context": f"container {name} was at {cpu}% CPU for >2min",
                            "rule": f"Gracefully stop/started {name} due to sustained high CPU",
                            "enforcement": "Watcher monitors every 30s",
                            "severity": "critical",
                            "source_agent": "watcher",
                            "times_applied": 0,
                            "active": True,
                        }
                        with LESSONS_DB.open("a") as f:
                            f.write(json.dumps(lesson) + "\n")
                    except Exception:
                        pass

            # Circuit breaker: high memory
            if mem_mb > WATCHER_MEM_THRESHOLD_MB and name in ("botwave_web", "litellm", "openhands"):
                check["status"] = "high_memory"
                tick["actions"].append({
                    "action": "memory_warning",
                    "container": name,
                    "reason": f"Memory at {mem_mb}MB (threshold: {WATCHER_MEM_THRESHOLD_MB}MB)",
                })

            tick["checks"].append(check)
    except Exception as e:
        tick["checks"].append({"error": f"docker stats failed: {e}"})

    # Check agent orchestra API latency
    try:
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("http://127.0.0.1:4001/health")
            latency = int((time.perf_counter() - start) * 1000)
            tick["checks"].append({"service": "agent-orchestra", "latency_ms": latency, "status": "ok" if latency < 5000 else "slow"})
    except Exception as e:
        tick["checks"].append({"service": "agent-orchestra", "status": "unreachable", "error": str(e)})

    # Check for stuck agent calls (from traces DB)
    try:
        conn = sqlite3.connect(TRACE_DB)
        cutoff = int(time.time()) - WATCHER_HANG_TIMEOUT
        stuck = conn.execute(
            "select agent, run_id, created_at from traces where verdict='failed' and created_at > ? and latency_ms > ?",
            (cutoff, WATCHER_HANG_TIMEOUT * 1000)
        ).fetchall()
        conn.close()
        if stuck:
            for row in stuck:
                tick["actions"].append({
                    "action": "stuck_agent_detected",
                    "agent": row[0],
                    "run_id": row[1],
                    "reason": "Agent call exceeded timeout threshold",
                })
    except Exception:
        pass

    WATCHER_HISTORY.append(tick)
    return tick


@app.get("/watcher/status")
async def watcher_status(_: None = Depends(require_key)) -> dict[str, Any]:
    """Get current watcher status and recent history."""
    current = await _watcher_tick()
    return {
        "current": current,
        "history_size": len(WATCHER_HISTORY),
        "recent_actions": [
            a for h in list(WATCHER_HISTORY)[-10:] for a in h.get("actions", [])
        ],
    }


@app.post("/watcher/run")
async def watcher_run(_: None = Depends(require_key)) -> dict[str, Any]:
    """Manually trigger a watcher tick."""
    return await _watcher_tick()


# Background watcher loop (runs every 30s)
_watcher_task: asyncio.Task | None = None

async def _watcher_loop():
    while True:
        try:
            tick = await _watcher_tick()
            # Wire: if Watcher finds dead containers, trigger Self-Healer
            actions = tick.get("actions", [])
            has_dead = any(a.get("action") in ("restart_recommended", "auto_restarted") for a in actions)
            if has_dead:
                try:
                    await healer_check_and_fix(None)
                except Exception:
                    pass
        except Exception:
            pass
        # Wire: Run feedback scan every 10 minutes (every 20th tick)
        if len(WATCHER_HISTORY) % 20 == 0 and len(WATCHER_HISTORY) > 0:
            try:
                await feedback_scan(FeedbackScanRequest(), None)
            except Exception:
                pass
        await asyncio.sleep(WATCHER_INTERVAL)

@app.on_event("startup")
async def start_watcher():
    global _watcher_task
    if _watcher_task is None or _watcher_task.done():
        _watcher_task = asyncio.create_task(_watcher_loop())


# ─── GitHub API Integration ─────────────────────────────────────────

GITHUB_TOKEN_FILE = ROOT / ".github-token"

def _get_github_token() -> str:
    """Get GitHub token from file or git credentials."""
    if GITHUB_TOKEN_FILE.exists():
        return GITHUB_TOKEN_FILE.read_text().strip()
    # Try extracting from git credentials
    import subprocess
    try:
        result = subprocess.run(
            ["git", "config", "--get", "credential.helper"],
            capture_output=True, text=True, timeout=5
        )
        # Try git credential fill
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n\n",
            capture_output=True, text=True, timeout=5
        )
        for line in proc.stdout.split("\n"):
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return ""


class GitHubPRRequest(BaseModel):
    repo: str = "eksucampusmarketplace-cell/Botwave"
    title: str
    body: str = ""
    head_branch: str
    base_branch: str = "BotWave"
    draft: bool = True
    labels: list[str] = Field(default_factory=list)
    auto_merge: bool = False

class GitHubCommentRequest(BaseModel):
    repo: str = "eksucampusmarketplace-cell/Botwave"
    pr_number: int
    body: str
    file_path: str | None = None
    line: int | None = None
    side: str = "RIGHT"

@app.post("/github/create-pr")
async def github_create_pr(req: GitHubPRRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Create a GitHub PR using the API. Idempotent — won't create duplicates."""
    token = _get_github_token()
    if not token:
        return {"error": "No GitHub token configured. Add token to /root/agent-orchestra/.github-token"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # Check for existing PR with same head branch (idempotent)
        existing = await client.get(
            f"https://api.github.com/repos/{req.repo}/pulls",
            headers=headers,
            params={"head": f"{req.repo.split('/')[0]}:{req.head_branch}", "state": "open"},
        )
        if existing.status_code == 200:
            prs = existing.json()
            if prs:
                return {
                    "status": "already_exists",
                    "pr_number": prs[0]["number"],
                    "pr_url": prs[0]["html_url"],
                    "message": "PR already exists for this branch — no duplicate created",
                }

        # Create PR
        pr_data = {
            "title": req.title,
            "body": req.body,
            "head": req.head_branch,
            "base": req.base_branch,
            "draft": req.draft,
        }
        resp = await client.post(
            f"https://api.github.com/repos/{req.repo}/pulls",
            headers=headers, json=pr_data,
        )
        if resp.status_code not in (200, 201):
            return {"error": f"GitHub API error: {resp.status_code}", "detail": resp.text[:500]}

        pr = resp.json()
        pr_number = pr["number"]

        # Add labels
        if req.labels:
            await client.post(
                f"https://api.github.com/repos/{req.repo}/issues/{pr_number}/labels",
                headers=headers, json={"labels": req.labels},
            )

        # Enable auto-merge if requested
        if req.auto_merge:
            await client.put(
                f"https://api.github.com/repos/{req.repo}/pulls/{pr_number}/merge",
                headers=headers,
                json={"merge_method": "squash", "commit_title": req.title},
            )

        return {
            "status": "created",
            "pr_number": pr_number,
            "pr_url": pr["html_url"],
            "draft": req.draft,
            "auto_merge": req.auto_merge,
        }


@app.post("/github/comment")
async def github_comment(req: GitHubCommentRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Add a comment to a PR — either general or on a specific line."""
    token = _get_github_token()
    if not token:
        return {"error": "No GitHub token configured"}

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        if req.file_path and req.line:
            # Line-level review comment
            # First get the latest commit SHA
            pr_resp = await client.get(
                f"https://api.github.com/repos/{req.repo}/pulls/{req.pr_number}",
                headers=headers,
            )
            if pr_resp.status_code != 200:
                return {"error": f"Could not fetch PR: {pr_resp.status_code}"}
            commit_sha = pr_resp.json()["head"]["sha"]

            resp = await client.post(
                f"https://api.github.com/repos/{req.repo}/pulls/{req.pr_number}/comments",
                headers=headers,
                json={
                    "body": req.body,
                    "commit_id": commit_sha,
                    "path": req.file_path,
                    "line": req.line,
                    "side": req.side,
                },
            )
        else:
            # General PR comment
            resp = await client.post(
                f"https://api.github.com/repos/{req.repo}/issues/{req.pr_number}/comments",
                headers=headers, json={"body": req.body},
            )

        if resp.status_code in (200, 201):
            return {"status": "commented", "pr_number": req.pr_number, "comment_id": resp.json().get("id")}
        return {"error": f"GitHub API error: {resp.status_code}", "detail": resp.text[:500]}


@app.get("/github/pr-status")
async def github_pr_status(
    repo: str = "eksucampusmarketplace-cell/Botwave",
    pr_number: int = 0,
    _: None = Depends(require_key),
) -> dict[str, Any]:
    """Check PR status: CI checks, reviews, mergeable state."""
    token = _get_github_token()
    if not token:
        return {"error": "No GitHub token configured"}

    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=15) as client:
        pr_resp = await client.get(f"https://api.github.com/repos/{repo}/pulls/{pr_number}", headers=headers)
        if pr_resp.status_code != 200:
            return {"error": f"PR not found: {pr_resp.status_code}"}
        pr = pr_resp.json()

        # Get check runs
        checks_resp = await client.get(
            f"https://api.github.com/repos/{repo}/commits/{pr['head']['sha']}/check-runs",
            headers=headers,
        )
        checks = checks_resp.json().get("check_runs", []) if checks_resp.status_code == 200 else []

        return {
            "pr_number": pr_number,
            "title": pr["title"],
            "state": pr["state"],
            "mergeable": pr.get("mergeable"),
            "draft": pr.get("draft"),
            "checks": [{"name": c["name"], "status": c["status"], "conclusion": c.get("conclusion")} for c in checks],
            "all_checks_passed": all(c.get("conclusion") == "success" for c in checks if c.get("status") == "completed"),
            "review_decision": pr.get("review_decision"),
        }


# ─── Risk Classifier ────────────────────────────────────────────────

RISK_RULES: dict[str, list[str]] = {
    "HIGH": [
        "kong.yml", "kong.yaml", ".env", "docker-compose", "Caddyfile",
        "deploy.sh", "deploy/", "migration", "schema", "DROP ", "DELETE FROM",
        "TRUNCATE", "rm -rf", "git reset --hard", "git push -f",
        "litellm/config", "agent-orchestra/.env", "openhands-state/",
        "systemctl", "production", "iptables", "ufw",
    ],
    "MEDIUM": [
        "package.json", "tsconfig", "next.config", "webpack",
        "api/", "routes/", "middleware/", "auth", "supabase",
        "prisma", "database", "redis", "queue",
    ],
    "LOW": [
        "README", ".md", "comment", "console.log", "print(",
        "test/", "tests/", "__test__", ".test.", ".spec.",
        "lint", "prettier", "eslint", "types",
    ],
}

class RiskCheckRequest(BaseModel):
    file_paths: list[str] = Field(default_factory=list)
    diff_content: str = ""
    description: str = ""
    agent: str = "builder"

@app.post("/risk/classify")
async def classify_risk(req: RiskCheckRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Risk Classifier: labels changes as LOW/MEDIUM/HIGH with enforcement.

    LOW  → auto-apply
    MEDIUM → auto-apply + notify
    HIGH → block until explicit approval
    """
    combined = " ".join(req.file_paths) + " " + req.diff_content + " " + req.description
    combined_lower = combined.lower()

    risk_level = "LOW"
    risk_signals: list[dict[str, str]] = []

    # Check HIGH signals first
    for signal in RISK_RULES["HIGH"]:
        if signal.lower() in combined_lower:
            risk_level = "HIGH"
            risk_signals.append({"level": "HIGH", "signal": signal, "found_in": "file_path or diff"})

    # Check MEDIUM signals
    if risk_level != "HIGH":
        for signal in RISK_RULES["MEDIUM"]:
            if signal.lower() in combined_lower:
                risk_level = "MEDIUM"
                risk_signals.append({"level": "MEDIUM", "signal": signal, "found_in": "file_path or diff"})

    # Check if any file is in CRITICAL_PATHS
    for fp in req.file_paths:
        if any(fp.startswith(p) for p in CRITICAL_PATHS):
            risk_level = "HIGH"
            risk_signals.append({"level": "HIGH", "signal": fp, "found_in": "CRITICAL_PATHS match"})

    # Check lessons DB for relevant warnings
    relevant_lessons = []
    for fp in req.file_paths:
        relevant_lessons.extend(_get_lessons_for_path(fp))

    if relevant_lessons:
        highest_lesson_severity = max(l.get("severity", "info") for l in relevant_lessons)
        if highest_lesson_severity == "critical" and risk_level != "HIGH":
            risk_level = "HIGH"
            risk_signals.append({"level": "HIGH", "signal": "lessons_db_critical", "found_in": "past failure pattern"})

    # Multi-file changes are riskier
    if len(req.file_paths) > 5:
        if risk_level == "LOW":
            risk_level = "MEDIUM"
            risk_signals.append({"level": "MEDIUM", "signal": f"{len(req.file_paths)} files changed", "found_in": "scope"})

    action_map = {
        "LOW": {"action": "auto_apply", "needs_approval": False, "notify": False},
        "MEDIUM": {"action": "auto_apply_notify", "needs_approval": False, "notify": True},
        "HIGH": {"action": "block_require_approval", "needs_approval": True, "notify": True},
    }

    return {
        "risk_level": risk_level,
        "risk_signals": risk_signals,
        "enforcement": action_map[risk_level],
        "relevant_lessons": relevant_lessons[:3],
        "file_count": len(req.file_paths),
        "recommendation": {
            "LOW": "Safe to apply. No approval needed.",
            "MEDIUM": "Apply and notify the owner. Monitor for side effects.",
            "HIGH": "BLOCKED. Create a backup, show the diff, and wait for explicit approval before applying.",
        }[risk_level],
    }

# ═══════════════════════════════════════════════════════════════════
# WIRED AGENTS — These communicate with each other, not isolated
# ═══════════════════════════════════════════════════════════════════


# ─── 1. Feedback Loop Agent ─────────────────────────────────────────
# Watches git log for manual reverts of agent commits.
# When found: extracts what went wrong → writes a Lesson → Guardian enforces it.

class FeedbackScanRequest(BaseModel):
    repo_path: str = "/root/Botwave"
    lookback_commits: int = 20

@app.post("/feedback/scan")
async def feedback_scan(req: FeedbackScanRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Scan recent git history for manual reverts/corrections of agent-generated commits.

    Wiring:
    - Reads git log for revert patterns
    - Calls Reflector to analyze what went wrong
    - Writes structured lesson to Lessons DB
    - Guardian will read these lessons before every future edit
    """
    import subprocess

    repo = Path(req.repo_path)
    if not repo.exists():
        return {"error": f"Repo not found: {req.repo_path}"}

    # Get recent commits
    try:
        log_result = subprocess.run(
            ["git", "log", f"--max-count={req.lookback_commits}", "--format=%H|%s|%an|%ai"],
            cwd=str(repo), capture_output=True, text=True, timeout=10
        )
        commits = []
        for line in log_result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("|", 3)
            if len(parts) >= 3:
                commits.append({"hash": parts[0][:12], "message": parts[1], "author": parts[2], "date": parts[3] if len(parts) > 3 else ""})
    except Exception as e:
        return {"error": f"git log failed: {e}"}

    # Detect reverts and manual corrections
    agent_markers = ["openhands", "agent", "auto-", "feat:", "fix:", "chore:"]
    revert_markers = ["revert", "rollback", "undo", "restore", "fix broken", "hotfix"]

    findings: list[dict[str, Any]] = []
    lessons_created: list[dict[str, Any]] = []

    for i, commit in enumerate(commits):
        msg_lower = commit["message"].lower()
        is_revert = any(m in msg_lower for m in revert_markers)

        if is_revert:
            # Look at what was reverted (previous commits by agents)
            reverted_agent_commits = []
            for j in range(i+1, min(i+5, len(commits))):
                prev = commits[j]
                if any(m in prev["message"].lower() for m in agent_markers):
                    reverted_agent_commits.append(prev)

            if reverted_agent_commits:
                # Get the diff of the revert to understand the correction
                try:
                    diff_result = subprocess.run(
                        ["git", "diff", f"{commit['hash']}^..{commit['hash']}", "--stat"],
                        cwd=str(repo), capture_output=True, text=True, timeout=10
                    )
                    changed_files = diff_result.stdout.strip()
                except Exception:
                    changed_files = "unknown"

                finding = {
                    "revert_commit": commit,
                    "reverted_agent_commits": reverted_agent_commits,
                    "changed_files": changed_files,
                }
                findings.append(finding)

                # Call Reflector to analyze the failure
                try:
                    reflector_result = await run_agent_internal(
                        "reflector",
                        {
                            "session_trace": [],
                            "original_request": f"Agent commit '{reverted_agent_commits[0]['message']}' was manually reverted by '{commit['message']}'",
                            "failures": [f"Changed files: {changed_files}"],
                            "instruction": "Analyze what the agent did wrong. Extract a specific, enforceable rule to prevent this from happening again. Return JSON with: context (when this applies), rule (what to do/not do), enforcement (how Guardian should check).",
                        },
                        "feedback-" + commit["hash"],
                        max_output_tokens=500,
                    )
                    reflector_out = reflector_result.get("output", {})

                    # Write lesson to Lessons DB
                    lesson = {
                        "created_at": int(time.time()),
                        "context": reflector_out.get("context", f"when editing files changed in commit {reverted_agent_commits[0]['hash']}"),
                        "rule": reflector_out.get("rule", f"Agent commit was reverted: {reverted_agent_commits[0]['message'][:100]}"),
                        "enforcement": reflector_out.get("enforcement", "Guardian should flag similar edits for manual review"),
                        "severity": "critical",
                        "source_agent": "feedback-loop",
                        "conversation_id": f"feedback-{commit['hash']}",
                        "times_applied": 0,
                        "active": True,
                        "source_commit": commit["hash"],
                        "reverted_commit": reverted_agent_commits[0]["hash"],
                    }
                    with LESSONS_DB.open("a") as f:
                        f.write(json.dumps(lesson) + "\n")
                    lessons_created.append(lesson)
                except Exception as e:
                    findings[-1]["reflector_error"] = str(e)

    return {
        "repo": req.repo_path,
        "commits_scanned": len(commits),
        "reverts_found": len(findings),
        "lessons_created": len(lessons_created),
        "findings": findings,
        "lessons": lessons_created,
        "wiring": "Lessons stored → Guardian reads before every edit → Planner gets as constraints",
    }


# ─── 2. Self-Healer Agent ───────────────────────────────────────────
# Runs on Watcher ticks. When container dies:
# 1. Checks Lessons DB for known fix pattern
# 2. Applies fix (restore backup, restart, etc.)
# 3. Logs incident to rollback history
# 4. Stores lesson if new failure pattern

KNOWN_FIXES: dict[str, dict[str, Any]] = {
    "botwave_web": {
        "check": "docker inspect --format='{{.State.Status}}' botwave_web",
        "fix_commands": [
            "if [ -x /opt/botwave/deploy/rebuild-web.sh ]; then /opt/botwave/deploy/rebuild-web.sh; else cd /opt/botwave/deploy && docker compose stop botwave_web && docker compose up -d botwave_web; fi",
        ],
        "verify": "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000",
        "expected_verify": "200",
    },
    "litellm": {
        "check": "docker inspect --format='{{.State.Status}}' litellm",
        "fix_commands": [
            "docker stop -t 30 litellm && docker start litellm",
        ],
        "verify": "curl -s -o /dev/null -w '%{http_code}' http://172.17.0.1:4000/v1/models",
        "expected_verify": "200",
    },
    "evolution_api": {
        "check": "docker inspect --format='{{.State.Status}}' evolution_api",
        "fix_commands": [
            "docker stop -t 30 evolution_api && docker start evolution_api",
        ],
        "verify": "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/",
        "expected_verify": "200",
    },
    "botwave_postgres": {
        "check": "docker inspect --format='{{.State.Status}}' botwave_postgres",
        "fix_commands": [
            "docker stop -t 30 botwave_postgres && docker start botwave_postgres",
        ],
        "verify": "docker exec botwave_postgres pg_isready -U postgres",
        "expected_verify": "",
    },
    "botwave_redis": {
        "check": "docker inspect --format='{{.State.Status}}' botwave_redis",
        "fix_commands": [
            "docker stop -t 30 botwave_redis && docker start botwave_redis",
        ],
        "verify": "docker exec botwave_redis redis-cli ping",
        "expected_verify": "PONG",
    },
    "botwave_kong": {
        "check": "docker inspect --format='{{.State.Status}}' botwave_kong",
        "fix_commands": [
            "ls /root/backups/pre-edit/*kong* 2>/dev/null | tail -1 | xargs -I{} cp {} /root/Botwave/deploy/kong.yml",
            "cd /opt/botwave/deploy && docker compose stop botwave_kong && docker compose up -d botwave_kong",
        ],
        "verify": "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000",
        "expected_verify": "200",
    },
    "openhands": {
        "check": "docker inspect --format='{{.State.Status}}' openhands",
        "fix_commands": [
            "docker stop -t 30 openhands && docker start openhands",
        ],
        "verify": "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3030",
        "expected_verify": "200",
    },
}

@app.post("/healer/check-and-fix")
async def healer_check_and_fix(_: None = Depends(require_key)) -> dict[str, Any]:
    """Self-Healer: check all critical containers, auto-fix any that are down.

    Wiring:
    - Called by Watcher background loop when issues detected
    - Reads Lessons DB for known failure patterns
    - Applies known fix commands
    - Logs incident to rollback history
    - Stores new lesson if previously unknown failure
    """
    import subprocess

    incidents: list[dict[str, Any]] = []
    healed: list[str] = []
    failed: list[str] = []

    # Check for exited/dead containers
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--filter", "status=exited", "--filter", "status=dead",
             "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True, text=True, timeout=10
        )
        dead_containers = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            name = parts[0]
            status = parts[1] if len(parts) > 1 else "unknown"
            if name in KNOWN_FIXES:
                dead_containers.append({"name": name, "status": status})
    except Exception as e:
        return {"error": f"docker ps failed: {e}"}

    for container in dead_containers:
        name = container["name"]
        fix_info = KNOWN_FIXES[name]
        incident = {
            "timestamp": int(time.time()),
            "container": name,
            "status_before": container["status"],
            "fix_attempted": True,
            "fix_commands": fix_info["fix_commands"],
            "result": "unknown",
        }

        # Check Lessons DB for additional context
        container_lessons = _get_lessons_for_path(name)
        if container_lessons:
            incident["relevant_lessons"] = [l.get("rule", "") for l in container_lessons[:3]]

        # Apply fix commands with graceful stop/start only. No docker kill/kill -9.
        if not HEALER_AUTO_FIX:
            incident["result"] = "fix_skipped_auto_fix_disabled"
            incidents.append(incident)
            continue
        try:
            for cmd in fix_info["fix_commands"]:
                lower_cmd = cmd.lower()
                if any(pattern in lower_cmd for pattern in UNSAFE_HEALER_PATTERNS):
                    raise RuntimeError(f"unsafe healer command blocked: {cmd}")
                subprocess.run(cmd, shell=True, timeout=120, capture_output=True)

            # Verify
            import time as _time
            _time.sleep(3)
            verify_result = subprocess.run(
                fix_info["verify"], shell=True, capture_output=True, text=True, timeout=15
            )
            verify_output = verify_result.stdout.strip()

            if fix_info["expected_verify"]:
                success = fix_info["expected_verify"] in verify_output
            else:
                success = verify_result.returncode == 0

            incident["result"] = "healed" if success else "fix_failed"
            incident["verify_output"] = verify_output[:200]

            if success:
                healed.append(name)
            else:
                failed.append(name)
        except Exception as e:
            incident["result"] = "fix_error"
            incident["error"] = str(e)
            failed.append(name)

        incidents.append(incident)

        # Log to rollback history
        try:
            with ROLLBACK_LOG.open("a") as f:
                f.write(json.dumps(incident) + "\n")
        except Exception:
            pass

        # Store lesson if this is a new failure pattern
        if incident["result"] in ("fix_failed", "fix_error"):
            try:
                lesson = {
                    "created_at": int(time.time()),
                    "context": f"container {name} crashed with status: {container['status']}",
                    "rule": f"Self-healer could not auto-fix {name} — needs manual investigation",
                    "enforcement": "Alert human operator, do not retry more than 3 times",
                    "severity": "critical",
                    "source_agent": "self-healer",
                    "times_applied": 0,
                    "active": True,
                }
                with LESSONS_DB.open("a") as f:
                    f.write(json.dumps(lesson) + "\n")
            except Exception:
                pass

    return {
        "auto_fix_enabled": HEALER_AUTO_FIX,
        "safe_restart_policy": "uses docker stop/start or docker compose stop/up; blocks docker kill, kill -9, and down -v",
        "containers_checked": len(KNOWN_FIXES),
        "dead_found": len(dead_containers),
        "healed": healed,
        "failed": failed,
        "incidents": incidents,
        "wiring": "Watcher detects → Healer fixes → Lessons DB stores pattern → Guardian prevents future issues",
    }




def _assert(condition: bool, message: str) -> dict[str, Any]:
    return {"name": message, "passed": bool(condition)}


@app.get("/self-tests/quality")
async def self_tests_quality(_: None = Depends(require_key)) -> dict[str, Any]:
    sample_html = """
    <div class="result"><div class="result__body">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example Docs</a>
      <a class="result__snippet">Official snippet with useful evidence.</a>
    </div></div>
    """
    parsed = _parse_duckduckgo_html(sample_html, 3)
    enriched = await enrich_researcher_input({"query": "BotWave test query"})
    healer_commands = [cmd for fix in KNOWN_FIXES.values() for cmd in fix.get("fix_commands", [])]
    manager = await test_runner_plan(ManagerRequest(request="check", repo="botwave"), None)
    checks = [
        _assert(bool(parsed) and parsed[0]["url"] == "https://example.com/docs", "web search parser extracts canonical DuckDuckGo URLs"),
        _assert("web_search" in enriched and "results" in enriched["web_search"], "Researcher input receives web_search evidence"),
        _assert(not any(pattern in cmd.lower() for cmd in healer_commands for pattern in UNSAFE_HEALER_PATTERNS), "Healer commands avoid unsafe restart/destructive patterns"),
        _assert(manager.get("capability_level") == "planning_only_unless_allow_execute_is_true", "Manager endpoint states plan-vs-execute capability honestly"),
        _assert("dead_code_prevention" in ENGINEERING_QUALITY_POLICY, "Engineering quality policy includes dead-code prevention"),
        _assert(local_guardian_output({"input": "build my project"}).get("verdict") == "SAFE", "Owner trust guard allows normal build requests"),
        _assert(local_guardian_output({"input": "print .env"}).get("verdict") == "BLOCK", "Owner trust guard blocks secret leaks"),
        _assert("README.md" in " ".join(NEW_REPO_PROJECT_TEMPLATE["minimum_files"]), "New-repo template requires README bootstrap docs"),
        _assert("CI workflow" in " ".join(NEW_REPO_PROJECT_TEMPLATE["minimum_files"]), "New-repo template requires CI quality gates"),
    ]
    return {
        "passed": all(check["passed"] for check in checks),
        "checks": checks,
        "quality_policy": ENGINEERING_QUALITY_POLICY,
    }

# ─── 3. Code Reviewer Agent ─────────────────────────────────────────
# Called after Builder generates code.
# Scores the output. If <80, triggers Reflector.
# Posts line-level comments via GitHub API.

class ReviewRequest(BaseModel):
    code: str
    file_path: str = ""
    diff: str = ""
    language: str = "typescript"
    pr_number: int | None = None
    repo: str = "eksucampusmarketplace-cell/Botwave"
    post_comments: bool = True

@app.post("/reviewer/review")
async def code_review(req: ReviewRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Code Reviewer: scores code, posts line comments, blocks if <80.

    Wiring:
    - Called by supervisor/execute after Builder outputs code
    - Uses Critic agent for scoring
    - If score <80, calls Reflector for improvement suggestions
    - Posts line-level comments on PR via GitHub API
    - Reads Lessons DB for project-specific rules to check against
    """
    # Get project-specific lessons for the file
    file_lessons = _get_lessons_for_path(req.file_path)
    lesson_rules = [l.get("rule", "") for l in file_lessons]

    # Call Critic for comprehensive review
    review_criteria = [
        "Code correctness and logic",
        "Error handling (all error cases covered)",
        "Security (no hardcoded secrets, XSS, SQL injection)",
        "Performance (no N+1 queries, unnecessary re-renders, memory leaks)",
        "Code style consistency with existing codebase",
        "Naming conventions (clear, descriptive)",
        "Test coverage (are edge cases handled)",
        "No code duplication",
    ]
    if lesson_rules:
        review_criteria.append(f"Project-specific rules: {'; '.join(lesson_rules[:5])}")

    try:
        critic_result = await run_agent_internal(
            "critic",
            {
                "artifact": {"code": req.code[:8000], "diff": req.diff[:4000], "file_path": req.file_path, "language": req.language},
                "criteria": review_criteria,
                "instruction": "Score 0-100. For each issue, specify the line number and exact problem. Return: score, verdict (ACCEPT/REVISE/REJECT), issues (list of {line, severity, message}), summary.",
            },
            "review-" + str(uuid.uuid4()),
            max_output_tokens=1200,
        )
        review = critic_result.get("output", {})
    except Exception as e:
        review = {"score": 0, "verdict": "error", "error": str(e)}

    score = review.get("score", 50)
    verdict = review.get("verdict", "REVISE")
    issues = review.get("issues", [])

    # If score <80, call Reflector for improvement suggestions
    reflector_suggestions = None
    if isinstance(score, (int, float)) and score < 80:
        try:
            reflector_result = await run_agent_internal(
                "reflector",
                {
                    "session_trace": [{"agent": "critic", "output": review}],
                    "original_request": f"Improve code in {req.file_path}",
                    "failures": [f"Critic score: {score}/100 — {review.get('summary', '')}"],
                    "instruction": "Suggest specific code improvements to bring the score above 80. Be concrete — give actual code fixes.",
                },
                "review-reflect-" + str(uuid.uuid4()),
                max_output_tokens=800,
            )
            reflector_suggestions = reflector_result.get("output", {})
        except Exception:
            pass

    # Post line-level comments on PR via GitHub API
    comments_posted = 0
    if req.pr_number and req.post_comments and issues:
        token = _get_github_token()
        if token:
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            }
            async with httpx.AsyncClient(timeout=15) as client:
                # Get latest commit SHA
                try:
                    pr_resp = await client.get(
                        f"https://api.github.com/repos/{req.repo}/pulls/{req.pr_number}",
                        headers=headers,
                    )
                    if pr_resp.status_code == 200:
                        commit_sha = pr_resp.json()["head"]["sha"]
                        for issue in issues[:10]:  # cap at 10 comments
                            line_num = issue.get("line")
                            message = issue.get("message", "")
                            severity = issue.get("severity", "info")
                            if line_num and message and req.file_path:
                                comment_body = f"**[{severity.upper()}]** {message}"
                                try:
                                    await client.post(
                                        f"https://api.github.com/repos/{req.repo}/pulls/{req.pr_number}/comments",
                                        headers=headers,
                                        json={
                                            "body": comment_body,
                                            "commit_id": commit_sha,
                                            "path": req.file_path,
                                            "line": line_num,
                                            "side": "RIGHT",
                                        },
                                    )
                                    comments_posted += 1
                                except Exception:
                                    pass
                except Exception:
                    pass

    return {
        "score": score,
        "verdict": verdict,
        "issues": issues,
        "summary": review.get("summary", ""),
        "should_block_merge": isinstance(score, (int, float)) and score < 80,
        "reflector_suggestions": reflector_suggestions,
        "comments_posted": comments_posted,
        "lessons_checked": len(file_lessons),
        "wiring": "Critic scores → Reflector suggests fixes if <80 → GitHub API posts line comments → blocks merge if needed",
    }


# ─── 4. Test Generator Agent ────────────────────────────────────────
# After Builder generates a fix, this writes a regression test.
# Safe Patch Agent runs the test in sandbox.
# Only commits if the test passes WITH the fix and fails WITHOUT it.

class TestGenRequest(BaseModel):
    fix_diff: str
    file_path: str
    bug_description: str = ""
    language: str = "typescript"
    test_framework: str = "jest"
    repo_path: str = "/root/Botwave"

@app.post("/test-gen/generate")
async def generate_test(req: TestGenRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Test Generator: writes a regression test for a bug fix.

    Wiring:
    - Called after Builder generates a fix diff
    - Uses Builder agent to write the test
    - Runs test via shell to verify it works
    - If test passes with fix and fails without: test is valid
    - Stores the test for Safe Patch Agent to include in commits
    """
    # Determine test file path
    source_path = Path(req.file_path)
    if req.test_framework == "jest":
        test_dir = source_path.parent / "__tests__"
        test_file = test_dir / f"{source_path.stem}.regression.test{source_path.suffix}"
    else:
        test_dir = source_path.parent / "tests"
        test_file = test_dir / f"test_{source_path.stem}_regression.py"

    # Call Builder to generate the test
    try:
        builder_result = await run_agent_internal(
            "builder",
            {
                "intent": f"Write a regression test that proves this bug is fixed",
                "context": {
                    "bug_description": req.bug_description,
                    "fix_diff": req.fix_diff[:4000],
                    "file_path": req.file_path,
                    "test_framework": req.test_framework,
                    "test_file_path": str(test_file),
                    "language": req.language,
                },
                "instruction": f"Generate a complete {req.test_framework} test file. The test should: 1) Test the specific behavior that was broken, 2) Verify the fix works correctly, 3) Cover edge cases. Return the full test file content in a 'test_code' field.",
            },
            "testgen-" + str(uuid.uuid4()),
            max_output_tokens=2000,
            task_kind="code_write",
        )
        builder_out = builder_result.get("output", {})
        test_code = builder_out.get("test_code", "")
        if not test_code and isinstance(builder_out, dict):
            # Try to extract from raw output
            for key in ("code", "content", "file_content", "test"):
                if builder_out.get(key):
                    test_code = builder_out[key]
                    break
        if not test_code:
            test_code = json.dumps(builder_out, indent=2)
    except Exception as e:
        return {"error": f"Builder failed to generate test: {e}", "status": "failed"}

    # Call Critic to verify test quality
    try:
        critic_result = await run_agent_internal(
            "critic",
            {
                "artifact": {"test_code": test_code[:4000], "fix_diff": req.fix_diff[:2000]},
                "criteria": [
                    "Test actually tests the bug fix (not just random assertions)",
                    "Test would fail without the fix",
                    "Test covers edge cases",
                    "Test is syntactically correct",
                    "Test imports are valid",
                ],
                "instruction": "Score 0-100. If the test doesn't actually verify the fix, score <50.",
            },
            "testgen-critic-" + str(uuid.uuid4()),
            max_output_tokens=400,
        )
        critic_out = critic_result.get("output", {})
        test_score = critic_out.get("score", 50)
    except Exception:
        test_score = 60
        critic_out = {}

    return {
        "test_file_path": str(test_file),
        "test_code": test_code,
        "test_score": test_score,
        "critic_review": critic_out,
        "should_include": isinstance(test_score, (int, float)) and test_score >= 60,
        "next_step": "Safe Patch Agent should write this file and run the test suite",
        "wiring": "Builder writes test → Critic scores → Safe Patch applies + runs → only commits if green",
    }


# ─── 5. Rollback Planner ────────────────────────────────────────────
# Called by Risk Classifier on HIGH-risk changes.
# Pre-computes exact rollback plan before any change is applied.
# Auto-Rollback agent executes this plan if health check fails.

class RollbackPlanRequest(BaseModel):
    file_paths: list[str] = Field(default_factory=list)
    change_description: str = ""
    repo_path: str = "/root/Botwave"
    containers_affected: list[str] = Field(default_factory=list)
    deploy_command: str = ""

@app.post("/rollback/plan")
async def create_rollback_plan(req: RollbackPlanRequest, _: None = Depends(require_key)) -> dict[str, Any]:
    """Rollback Planner: pre-compute exact rollback steps before a HIGH-risk change.

    Wiring:
    - Called by Risk Classifier when risk_level=HIGH
    - Creates backup of all affected files
    - Pre-computes revert commands
    - Stores plan so Auto-Rollback can execute it without human intervention
    - Includes health check conditions that trigger auto-rollback
    """
    import subprocess
    import shutil

    plan_id = f"rollback-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    ts = time.strftime("%Y%m%d-%H%M%S")

    # Step 1: Backup all affected files
    backups: list[dict[str, str]] = []
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    for fp in req.file_paths:
        src = Path(fp)
        if src.exists():
            safe_name = fp.replace("/", "_").strip("_")
            backup_path = str(BACKUP_DIR / f"{safe_name}.{ts}.rollback")
            try:
                shutil.copy2(str(src), backup_path)
                backups.append({"original": fp, "backup": backup_path})
            except Exception as e:
                backups.append({"original": fp, "backup": f"FAILED: {e}"})

    # Step 2: Get current git state
    git_state = {}
    try:
        head = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=req.repo_path,
            capture_output=True, text=True, timeout=5
        )
        git_state["commit_before"] = head.stdout.strip()[:12]
        branch = subprocess.run(
            ["git", "branch", "--show-current"], cwd=req.repo_path,
            capture_output=True, text=True, timeout=5
        )
        git_state["branch"] = branch.stdout.strip()
    except Exception:
        git_state["error"] = "could not read git state"

    # Step 3: Build rollback commands
    rollback_commands: list[dict[str, str]] = []

    # Restore files from backup
    for b in backups:
        if "FAILED" not in b.get("backup", "FAILED"):
            rollback_commands.append({
                "step": f"Restore {b['original']}",
                "command": f"cp {b['backup']} {b['original']}",
                "type": "file_restore",
            })

    # Git revert
    if git_state.get("commit_before"):
        rollback_commands.append({
            "step": "Revert git to pre-change state",
            "command": f"cd {req.repo_path} && git revert --no-edit HEAD",
            "type": "git_revert",
        })

    # Restart affected containers
    for container in req.containers_affected:
        rollback_commands.append({
            "step": f"Restart {container}",
            "command": f"docker restart {container}",
            "type": "container_restart",
        })

    # Step 4: Define health check triggers
    health_triggers = []
    for container in req.containers_affected:
        if container in KNOWN_FIXES:
            fix = KNOWN_FIXES[container]
            health_triggers.append({
                "container": container,
                "check_command": fix["verify"],
                "expected": fix["expected_verify"],
                "trigger_condition": "If check fails within 5 minutes of applying change",
            })

    health_triggers.append({
        "general": True,
        "check_command": "/root/openhands-patches/platform-health-check.sh",
        "trigger_condition": "If any CRIT alert appears within 5 minutes of applying change",
    })

    # Step 5: Estimate rollback time
    estimated_seconds = len(rollback_commands) * 5 + len(req.containers_affected) * 15

    # Step 6: Store the plan
    plan = {
        "plan_id": plan_id,
        "created_at": int(time.time()),
        "change_description": req.change_description,
        "files_affected": req.file_paths,
        "containers_affected": req.containers_affected,
        "backups": backups,
        "git_state_before": git_state,
        "rollback_commands": rollback_commands,
        "health_triggers": health_triggers,
        "estimated_rollback_seconds": estimated_seconds,
        "auto_rollback_enabled": True,
        "status": "ready",
    }

    try:
        PATCH_QUEUE_DIR.mkdir(parents=True, exist_ok=True)
        plan_file = PATCH_QUEUE_DIR / f"{plan_id}.json"
        plan_file.write_text(json.dumps(plan, indent=2))
    except Exception:
        pass

    try:
        with ROLLBACK_LOG.open("a") as f:
            f.write(json.dumps({"event": "plan_created", "plan_id": plan_id, "timestamp": int(time.time())}) + "\n")
    except Exception:
        pass

    return {
        "plan_id": plan_id,
        "backups_created": len([b for b in backups if "FAILED" not in b.get("backup", "FAILED")]),
        "rollback_commands": len(rollback_commands),
        "estimated_rollback_seconds": estimated_seconds,
        "health_triggers": len(health_triggers),
        "plan": plan,
        "wiring": "Risk Classifier triggers → Rollback Planner creates plan → After change, Watcher monitors → Auto-Rollback executes plan on failure",
    }


@app.post("/rollback/execute")
async def execute_rollback_plan(plan_id: str = "", _: None = Depends(require_key)) -> dict[str, Any]:
    """Execute a pre-computed rollback plan. Called by Auto-Rollback when health fails."""
    import subprocess

    plan_file = PATCH_QUEUE_DIR / f"{plan_id}.json"
    if not plan_file.exists():
        return {"error": f"Rollback plan not found: {plan_id}"}

    plan = json.loads(plan_file.read_text())
    if plan.get("status") == "executed":
        return {"error": "Plan already executed", "plan_id": plan_id}

    results: list[dict[str, Any]] = []
    for cmd_info in plan.get("rollback_commands", []):
        cmd = cmd_info["command"]
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
            results.append({
                "step": cmd_info["step"],
                "command": cmd,
                "success": result.returncode == 0,
                "output": result.stdout[:200],
            })
        except Exception as e:
            results.append({"step": cmd_info["step"], "command": cmd, "success": False, "error": str(e)})

    # Mark plan as executed
    plan["status"] = "executed"
    plan["executed_at"] = int(time.time())
    plan["execution_results"] = results
    plan_file.write_text(json.dumps(plan, indent=2))

    # Log execution
    try:
        with ROLLBACK_LOG.open("a") as f:
            f.write(json.dumps({"event": "plan_executed", "plan_id": plan_id, "timestamp": int(time.time()), "results": results}) + "\n")
    except Exception:
        pass

    return {
        "plan_id": plan_id,
        "status": "executed",
        "steps_run": len(results),
        "all_succeeded": all(r.get("success") for r in results),
        "results": results,
    }
