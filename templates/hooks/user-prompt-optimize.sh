#!/usr/bin/env bash
# user-prompt-optimize.sh
# EVENT: UserPromptSubmit
# DESCRIPTION: Optional prompt compressor for Copilot
#
# This hook is off by default. Enable it with CPTO_PROMPT_OPTIMIZER_ENABLED=1.
# The company hook bundle is still responsible for context injection and snapshots.
#
# The prompt optimizer keeps its log compact and structured. It never records the
# full prompt; only a short decision record with hashes, counts, and selected skills.
#
# Skill discovery is dynamic:
# - It reads optional local skill manifests from the workspace.
# - It falls back to project-derived signals when no manifests are present.
# - It does not rely on a single static skill list.
#
# Default output is plain text so it can slot into normal UserPromptSubmit hook
# pipelines. Set CPTO_PROMPT_OPTIMIZER_OUTPUT_FORMAT=json if you are wrapping it
# yourself and want structured output instead.

set -u

RUNTIME_DIR="${COPILOT_RUNTIME_DIR:-.copilot-runtime}"
OPTIMIZER_LOG="$RUNTIME_DIR/prompt-optimizer.ndjson"
mkdir -p "$RUNTIME_DIR"

DISABLE_FLAG="${CPTO_PROMPT_OPTIMIZER_DISABLE:-${COPILOT_PROMPT_OPTIMIZER_DISABLE:-0}}"
OUTPUT_FORMAT="${CPTO_PROMPT_OPTIMIZER_OUTPUT_FORMAT:-text}"
MAX_SKILLS="${CPTO_PROMPT_OPTIMIZER_MAX_SKILLS:-24}"

if [[ "$DISABLE_FLAG" == "1" || "${CPTO_PROMPT_OPTIMIZER_ENABLED:-0}" != "1" ]]; then
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    echo '{}'
  fi
  exit 0
fi

API_KEY="${CPTO_PROMPT_OPTIMIZER_API_KEY:-${FAST_LLM_API_KEY:-}}"
ENDPOINT="${CPTO_PROMPT_OPTIMIZER_ENDPOINT:-${FAST_LLM_ENDPOINT:-https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent}}"
MOCK_RESPONSE="${CPTO_PROMPT_OPTIMIZER_MOCK_RESPONSE:-}"
DEBUG_SYSTEM_FILE="${CPTO_PROMPT_OPTIMIZER_DEBUG_SYSTEM_FILE:-}"

input_json=$(cat)
raw_prompt=$(printf '%s' "$input_json" | python3 -c '
import json
import sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(1)
print(data.get("prompt", ""))
')

if [[ -z "$raw_prompt" ]]; then
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    echo '{}'
  fi
  exit 0
fi

export CPTO_PROMPT_OPTIMIZER_SKILLS_FILE="${CPTO_PROMPT_OPTIMIZER_SKILLS_FILE:-}"
export CPTO_PROMPT_OPTIMIZER_SKILLS="${CPTO_PROMPT_OPTIMIZER_SKILLS:-}"
export CPTO_PROMPT_OPTIMIZER_SKILLS_DIRS="${CPTO_PROMPT_OPTIMIZER_SKILLS_DIRS:-}"
export CPTO_PROMPT_OPTIMIZER_MAX_SKILLS="$MAX_SKILLS"

skills_catalog_json=$(python3 - <<'PYEOF'
import json
import os
import pathlib
import re

cwd = pathlib.Path.cwd()
max_skills = int(os.environ.get("CPTO_PROMPT_OPTIMIZER_MAX_SKILLS", "24"))

seen = set()
catalog = []

def normalize_name(value):
    value = str(value or "").strip()
    value = re.sub(r"\s+", " ", value)
    return value.strip(" -:;")

def add_skill(name, description="", source=""):
    name = normalize_name(name)
    if not name:
        return
    key = name.lower()
    if key in seen:
        return
    seen.add(key)
    entry = {"name": name}
    if description:
        entry["description"] = normalize_name(description)[:180]
    if source:
        entry["source"] = source
    catalog.append(entry)

def add_many(entries, source):
    for item in entries:
        if isinstance(item, str):
            add_skill(item, "", source)
        elif isinstance(item, dict):
            add_skill(
                item.get("name") or item.get("skill") or item.get("title"),
                item.get("description") or item.get("desc") or item.get("summary"),
                source,
            )

def parse_markdown_skill_file(path, source):
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return
    lines = [line.rstrip() for line in content.splitlines()]
    heading = None
    for line in lines:
        match = re.match(r"^#{1,3}\s+(.+)$", line.strip())
        if match:
            heading = match.group(1).strip()
            break
    if not heading:
        heading = path.stem.replace("-", " ").replace("_", " ").strip()
    description_lines = []
    seen_heading = False
    for line in lines:
        if re.match(r"^#{1,3}\s+(.+)$", line.strip()):
            seen_heading = True
            continue
        if not seen_heading:
            continue
        stripped = line.strip()
        if not stripped:
            if description_lines:
                break
            continue
        if stripped.startswith((chr(96) * 3, "---")):
            continue
        if stripped.startswith(("-", "*")) and not description_lines:
            continue
        description_lines.append(stripped)
        if len(" ".join(description_lines)) >= 180:
            break
    description = " ".join(description_lines).strip()
    add_skill(heading, description, source)

def parse_json_skill_file(path, source):
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        parse_markdown_skill_file(path, source)
        return
    if isinstance(data, list):
        add_many(data, source)
        return
    if isinstance(data, dict):
        if isinstance(data.get("skills"), list):
            add_many(data["skills"], source)
        elif any(key in data for key in ("name", "skill", "title")):
            add_skill(
                data.get("name") or data.get("skill") or data.get("title"),
                data.get("description") or data.get("desc") or data.get("summary"),
                source,
            )
        else:
            for key, value in data.items():
                if isinstance(value, dict):
                    add_skill(key, value.get("description") or value.get("summary"), source)
                elif isinstance(value, str):
                    add_skill(key, value, source)

def parse_skill_file(path, source):
    suffix = "".join(path.suffixes).lower()
    if suffix.endswith(".json"):
        parse_json_skill_file(path, source)
    elif suffix.endswith(".yml") or suffix.endswith(".yaml"):
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return
        name_match = re.search(r"^name:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
        desc_match = re.search(r"^description:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
        if name_match or desc_match:
            add_skill(
                name_match.group(1).strip() if name_match else path.stem.replace("-", " ").replace("_", " ").strip(),
                desc_match.group(1).strip() if desc_match else "",
                source,
            )
        else:
            parse_markdown_skill_file(path, source)
    else:
        parse_markdown_skill_file(path, source)

def scan_skill_directory(base_dir, source_prefix):
    if not base_dir.exists() or not base_dir.is_dir():
        return
    for root, dirs, files in os.walk(base_dir):
        root_path = pathlib.Path(root)
        depth = len(root_path.relative_to(base_dir).parts)
        if depth >= 3:
            dirs[:] = []
        for filename in files:
            lower = filename.lower()
            if not (
                lower == "skill.md"
                or lower == "skills.md"
                or lower == "skill.json"
                or lower.endswith(".skill.md")
                or lower.endswith(".skill.json")
                or lower.endswith(".skill.yml")
                or lower.endswith(".skill.yaml")
            ):
                continue
            parse_skill_file(root_path / filename, f"{source_prefix}:{root_path.relative_to(base_dir)}")

def parse_inline_skills(raw, source):
    if not raw.strip():
        return
    try:
        data = json.loads(raw)
    except Exception:
        data = None
    if isinstance(data, list):
        add_many(data, source)
        return
    for chunk in re.split(r"[\n,;]+", raw):
        chunk = chunk.strip()
        if not chunk:
            continue
        if chunk.startswith(("- ", "* ")):
            chunk = chunk[2:].strip()
        if ":" in chunk:
            name, description = chunk.split(":", 1)
            add_skill(name, description, source)
        else:
            add_skill(chunk, "", source)

def detect_project_skills():
    def add_project_skill(name, description, source):
        add_skill(name, description, source)

    package_json = cwd / "package.json"
    if package_json.exists():
        try:
            data = json.loads(package_json.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            data = {}
        deps = {}
        for section in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            deps.update(data.get(section, {}) or {})
        dep_names = {name.lower() for name in deps}
        if any(name in dep_names for name in ("next", "nextjs")):
            add_project_skill("nextjs", "Next.js app work", "workspace:package.json")
        if any(name in dep_names for name in ("react", "react-dom")):
            add_project_skill("react", "React UI work", "workspace:package.json")
        if any(name in dep_names for name in ("vue", "vue-router")):
            add_project_skill("vue", "Vue application work", "workspace:package.json")
        if any(name in dep_names for name in ("nuxt", "nuxtjs")):
            add_project_skill("nuxtjs", "Nuxt application work", "workspace:package.json")
        if "angular" in dep_names:
            add_project_skill("angular", "Angular application work", "workspace:package.json")
        if "svelte" in dep_names:
            add_project_skill("svelte", "Svelte application work", "workspace:package.json")
        if any(name in dep_names for name in ("express",)):
            add_project_skill("express", "Express backend work", "workspace:package.json")
        if any(name in dep_names for name in ("@nestjs/core", "nestjs")):
            add_project_skill("nestjs", "NestJS backend work", "workspace:package.json")
        if any(name in dep_names for name in ("zod", "react-hook-form")):
            add_project_skill("form-validation", "Form validation and schema rules", "workspace:package.json")
        if any(name in dep_names for name in ("@tanstack/react-query", "@tanstack/query-core", "react-query")):
            add_project_skill("state-management", "Server-state and cache boundaries", "workspace:package.json")
        if any(name in dep_names for name in ("tailwindcss", "styled-components", "@emotion/react")):
            add_project_skill("styling", "UI styling and design-system work", "workspace:package.json")
        if any(name in dep_names for name in ("jest", "vitest", "@testing-library/react", "playwright", "cypress")):
            add_project_skill("testing", "Testing and verification work", "workspace:package.json")
        if any(name in dep_names for name in ("prisma", "drizzle-orm", "sequelize", "knex", "typeorm")):
            add_project_skill("database", "Data access and persistence work", "workspace:package.json")

    markers = [
        ("requirements.txt", "python", "Python application work"),
        ("pyproject.toml", "python", "Python application work"),
        ("Pipfile", "python", "Python application work"),
        ("Gemfile", "ruby", "Ruby application work"),
        ("composer.json", "php", "PHP application work"),
        ("go.mod", "go", "Go application work"),
        ("Cargo.toml", "rust", "Rust application work"),
        ("pom.xml", "java", "Java application work"),
        ("build.gradle", "java", "Java application work"),
        ("build.gradle.kts", "java", "Java application work"),
        ("Dockerfile", "docker", "Containerization work"),
    ]
    for filename, skill, description in markers:
        if (cwd / filename).exists():
            add_project_skill(skill, description, f"workspace:{filename}")

    if any(cwd.glob("**/*.tf")):
        add_project_skill("terraform", "Infrastructure as code work", "workspace:terraform")
    if (cwd / "docs").exists() or (cwd / "README.md").exists():
        add_project_skill("documentation", "Documentation work", "workspace:docs")
    if (cwd / ".github").exists() or (cwd / ".gitlab-ci.yml").exists():
        add_project_skill("ci-cd", "Pipeline and automation work", "workspace:ci")
    if (cwd / "migrations").exists() or (cwd / "db").exists():
        add_project_skill("database", "Database schema or migration work", "workspace:db")

def collect_catalog():
    explicit_file = os.environ.get("CPTO_PROMPT_OPTIMIZER_SKILLS_FILE", "").strip()
    explicit_inline = os.environ.get("CPTO_PROMPT_OPTIMIZER_SKILLS", "").strip()
    explicit_dirs = os.environ.get("CPTO_PROMPT_OPTIMIZER_SKILLS_DIRS", "").strip()

    if explicit_inline:
        parse_inline_skills(explicit_inline, "env:inline")

    if explicit_file:
        path = pathlib.Path(explicit_file)
        if path.exists():
            if path.is_dir():
                scan_skill_directory(path, "env:dir")
            else:
                parse_skill_file(path, f"env:file:{path.name}")

    default_dirs = [
        cwd / "skills",
        cwd / ".copilot" / "skills",
        cwd / ".codex" / "skills",
        cwd / ".agents" / "skills",
        cwd / "docs" / "skills",
        cwd / "templates" / "skills",
    ]

    for base in default_dirs:
        scan_skill_directory(base, "workspace")

    if explicit_dirs:
        for raw_dir in re.split(re.escape(os.pathsep), explicit_dirs):
            raw_dir = raw_dir.strip()
            if not raw_dir:
                continue
            scan_skill_directory(pathlib.Path(raw_dir), "env:dir")

    if not catalog:
        detect_project_skills()

    return catalog[:max_skills]

print(json.dumps(collect_catalog(), separators=(",", ":")))
PYEOF
)

export OPTIMIZER_LOG
export SKILLS_CATALOG_JSON="$skills_catalog_json"

COMPRESSOR_SYSTEM_INSTRUCTION="Role: Senior Prompt Optimizer.
Goal: Normalize user inputs into concise, deterministic, cache-friendly prompts.

Rules for compressed_prompt:
1. Strip conversational framing, pleasantries, and filler.
2. Keep exact code blocks, variables, file paths, and error messages unchanged.
3. Start with a direct action verb when possible.
4. Keep multi-step requests concise and ordered.

Skills catalog (dynamically discovered from the workspace and configured skill files):
${skills_catalog_json}

Rules for required_skills:
1. Choose only from the catalog above.
2. Use the minimum set of skills that clearly match.
3. If the catalog is empty or nothing fits, return [].
4. Never invent a skill name.
"

if [[ -n "$DEBUG_SYSTEM_FILE" ]]; then
  mkdir -p "$(dirname "$DEBUG_SYSTEM_FILE")"
  printf '%s' "$COMPRESSOR_SYSTEM_INSTRUCTION" > "$DEBUG_SYSTEM_FILE"
fi

export RAW_PROMPT="$raw_prompt"
export COMPRESSOR_SYS="$COMPRESSOR_SYSTEM_INSTRUCTION"
export FAST_LLM_API_KEY="$API_KEY"
export FAST_LLM_ENDPOINT="$ENDPOINT"
export MOCK_RESPONSE="$MOCK_RESPONSE"
export LOG_SOURCE="api"
export DAILY_LOG="$RUNTIME_DIR/prompt-optimizer-daily.ndjson"
export DAILY_REPORT="$RUNTIME_DIR/prompt-optimizer-daily.md"
export CREDIT_MODEL="${CPTO_PROMPT_OPTIMIZER_CREDIT_MODEL:-gpt-5-mini}"

if [[ -n "$MOCK_RESPONSE" ]]; then
  routing_payload="$MOCK_RESPONSE"
  routing_status=0
  routing_source="mock"
else
  routing_payload=$(python3 - <<'PYEOF'
import json
import os
import sys
import urllib.request

endpoint = os.environ.get("FAST_LLM_ENDPOINT")
api_key = os.environ.get("FAST_LLM_API_KEY")
raw_prompt = os.environ.get("RAW_PROMPT", "")
system_instruction = os.environ.get("COMPRESSOR_SYS", "")

if not api_key or not raw_prompt or not endpoint:
    sys.exit(1)

payload = {
    "systemInstruction": {
        "parts": [{"text": system_instruction}]
    },
    "contents": [{
        "parts": [{"text": raw_prompt}]
    }],
    "generationConfig": {
        "temperature": 0.0,
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "OBJECT",
            "properties": {
                "compressed_prompt": {"type": "STRING"},
                "required_skills": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                }
            },
            "required": ["compressed_prompt", "required_skills"]
        }
    }
}

try:
    req = urllib.request.Request(
        f"{endpoint}?key={api_key}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as response:
        res_data = json.loads(response.read().decode("utf-8"))
        print(res_data["candidates"][0]["content"]["parts"][0]["text"].strip())
except Exception:
    sys.exit(1)
PYEOF
)
  routing_status=$?
  routing_source="api"
fi

if [[ $routing_status -ne 0 || -z "$routing_payload" ]]; then
  reason="api_error"
  if [[ -z "$API_KEY" ]]; then
    reason="missing_api_key"
  fi

  if [[ "$reason" == "missing_api_key" ]]; then
    export LOG_STATUS="bypass"
  else
    export LOG_STATUS="error"
  fi
  export LOG_REASON="$reason"
  export LOG_SOURCE="${routing_source:-api}"
  export COMPRESSED_PROMPT=""
  export REQUIRED_SKILLS_JSON="[]"
  python3 - <<'PYEOF'
import hashlib
import json
import os
import pathlib
import re
from datetime import datetime

PRICE_TABLE = {
    "gpt-5-mini": {"input": 0.25, "output": 2.00},
    "gpt-5.3-codex": {"input": 1.75, "output": 14.00},
    "gpt-5.4": {"input": 2.50, "output": 15.00},
    "gpt-5.4-long": {"input": 5.00, "output": 22.50},
    "gpt-5.4-mini": {"input": 0.75, "output": 4.50},
    "gpt-5.4-nano": {"input": 0.20, "output": 1.25},
    "gpt-5.5": {"input": 5.00, "output": 30.00},
    "gpt-5.5-long": {"input": 10.00, "output": 45.00},
    "claude-haiku-4.5": {"input": 1.00, "output": 5.00},
    "claude-sonnet-4": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4.5": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4.6": {"input": 3.00, "output": 15.00},
    "claude-opus-4.5": {"input": 5.00, "output": 25.00},
    "claude-opus-4.6": {"input": 5.00, "output": 25.00},
    "claude-opus-4.7": {"input": 5.00, "output": 25.00},
    "claude-opus-4.8": {"input": 5.00, "output": 25.00},
    "raptor-mini": {"input": 0.25, "output": 2.00},
    "mai-code-1-flash": {"input": 0.75, "output": 4.50},
}

def estimate_tokens(text):
    words = re.findall(r"\S+", text or "")
    if not words:
        return 0
    return max(1, int(round(len(words) * 1.3)))

def credits_from_tokens(token_count, rate_per_million):
    return (token_count * rate_per_million) / 1_000_000 / 0.01

def read_jsonl(path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:
            continue
    return rows

def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, separators=(",", ":")) + "\n")

def render_daily_markdown(rows):
    lines = [
        "# Prompt Optimizer Daily Summary",
        "",
        "| Date | Attempts | Success | Bypass | Error | Tokens In | Tokens Out | AI Credits | USD | Model |",
        "|------|----------|---------|--------|-------|-----------|------------|------------|-----|-------|",
    ]
    for row in rows:
        lines.append(
            "| {date} | {attempts} | {success} | {bypass} | {error} | {tokens_in} | {tokens_out} | {credits:.6f} | ${usd:.6f} | `{model}` |".format(
                date=row["date"],
                attempts=row["attempts"],
                success=row["success_runs"],
                bypass=row["bypass_runs"],
                error=row["error_runs"],
                tokens_in=row["tokens_in"],
                tokens_out=row["tokens_out"],
                credits=row["credits"],
                usd=row["usd"],
                model=row["model"],
            )
        )
    lines.append("")
    return "\n".join(lines)

def resolve_model_key(raw):
    key = (raw or "gpt-5-mini").strip().lower()
    return key if key in PRICE_TABLE else "gpt-5-mini"

now = datetime.now().astimezone()
date = now.date().isoformat()
status = os.environ.get("LOG_STATUS", "error")
reason = os.environ.get("LOG_REASON", "api_error")
source = os.environ.get("LOG_SOURCE", "api")
raw_prompt = os.environ.get("RAW_PROMPT", "")
compressed_prompt = os.environ.get("COMPRESSED_PROMPT", "")
skills = json.loads(os.environ.get("REQUIRED_SKILLS_JSON", "[]") or "[]")
catalog = json.loads(os.environ.get("SKILLS_CATALOG_JSON", "[]") or "[]")
model_key = resolve_model_key(os.environ.get("CREDIT_MODEL", "gpt-5-mini"))

record = {
    "ts": now.isoformat(timespec="seconds"),
    "status": status,
    "reason": reason,
    "prompt_hash": hashlib.sha256(raw_prompt.encode("utf-8")).hexdigest()[:12],
    "raw_chars": len(raw_prompt),
    "compressed_chars": len(compressed_prompt),
    "raw_tokens_est": estimate_tokens(raw_prompt),
    "compressed_tokens_est": 0,
    "credit_model": model_key,
    "input_ai_credits": 0.0,
    "output_ai_credits": 0.0,
    "total_ai_credits": 0.0,
    "usd_estimate": 0.0,
    "skill_count": len(skills) if isinstance(skills, list) else 0,
    "skills": skills if isinstance(skills, list) else [],
    "catalog_count": len(catalog) if isinstance(catalog, list) else 0,
    "source": source,
}

run_log = pathlib.Path(os.environ["OPTIMIZER_LOG"])
run_log.parent.mkdir(parents=True, exist_ok=True)
with run_log.open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, separators=(",", ":")) + "\n")

daily_log = pathlib.Path(os.environ["DAILY_LOG"])
daily_rows = read_jsonl(daily_log)
day = None
for row in daily_rows:
    if row.get("date") == date:
        day = row
        break
if day is None:
    day = {
        "date": date,
        "attempts": 0,
        "success_runs": 0,
        "bypass_runs": 0,
        "error_runs": 0,
        "tokens_in": 0,
        "tokens_out": 0,
        "credits": 0.0,
        "usd": 0.0,
        "model": model_key,
        "last_prompt_hash": "",
    }
    daily_rows.append(day)

day["attempts"] += 1
if status == "bypass":
    day["bypass_runs"] += 1
else:
    day["error_runs"] += 1
day["model"] = model_key
day["last_prompt_hash"] = record["prompt_hash"]

daily_rows = sorted(daily_rows, key=lambda row: row.get("date", ""))
write_jsonl(daily_log, daily_rows)

daily_report = pathlib.Path(os.environ["DAILY_REPORT"])
daily_report.parent.mkdir(parents=True, exist_ok=True)
daily_report.write_text(render_daily_markdown(daily_rows), encoding="utf-8")
PYEOF

  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    echo '{}'
  fi
  exit 0
fi

export ROUTING_JSON="$routing_payload"
compressed_prompt=$(python3 - <<'PYEOF'
import json
import os
import sys

try:
    data = json.loads(os.environ.get("ROUTING_JSON", "{}"))
except Exception:
    sys.exit(1)

print(data.get("compressed_prompt", "").strip())
PYEOF
)

if [[ -z "$compressed_prompt" ]]; then
  compressed_prompt="$raw_prompt"
fi

required_skills_json=$(python3 - <<'PYEOF'
import json
import os
import sys

try:
    data = json.loads(os.environ.get("ROUTING_JSON", "{}"))
except Exception:
    sys.exit(1)

skills = data.get("required_skills", [])
if not isinstance(skills, list):
    skills = []
skills = [skill for skill in skills if skill]
print(json.dumps(skills, separators=(",", ":")))
PYEOF
)

final_prompt="$compressed_prompt"
if [[ "$required_skills_json" != "[]" && "${CPTO_PROMPT_OPTIMIZER_APPEND_SKILLS:-1}" == "1" ]]; then
  skills_text=$(python3 - <<'PYEOF'
import json
import os
import sys

skills = json.loads(os.environ.get("REQUIRED_SKILLS_JSON", "[]"))
print(", ".join(skills))
PYEOF
)
  if [[ -n "$skills_text" ]]; then
    final_prompt="${final_prompt}"$'\n\n'"Likely areas: ${skills_text}"
  fi
fi

log_usage() {
  python3 - <<'PYEOF'
import hashlib
import json
import os
import pathlib
import re
from datetime import datetime

PRICE_TABLE = {
    "gpt-5-mini": {"input": 0.25, "output": 2.00},
    "gpt-5.3-codex": {"input": 1.75, "output": 14.00},
    "gpt-5.4": {"input": 2.50, "output": 15.00},
    "gpt-5.4-long": {"input": 5.00, "output": 22.50},
    "gpt-5.4-mini": {"input": 0.75, "output": 4.50},
    "gpt-5.4-nano": {"input": 0.20, "output": 1.25},
    "gpt-5.5": {"input": 5.00, "output": 30.00},
    "gpt-5.5-long": {"input": 10.00, "output": 45.00},
    "claude-haiku-4.5": {"input": 1.00, "output": 5.00},
    "claude-sonnet-4": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4.5": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4.6": {"input": 3.00, "output": 15.00},
    "claude-opus-4.5": {"input": 5.00, "output": 25.00},
    "claude-opus-4.6": {"input": 5.00, "output": 25.00},
    "claude-opus-4.7": {"input": 5.00, "output": 25.00},
    "claude-opus-4.8": {"input": 5.00, "output": 25.00},
    "raptor-mini": {"input": 0.25, "output": 2.00},
    "mai-code-1-flash": {"input": 0.75, "output": 4.50},
}

def estimate_tokens(text):
    words = re.findall(r"\S+", text or "")
    if not words:
        return 0
    return max(1, int(round(len(words) * 1.3)))

def credits_from_tokens(token_count, rate_per_million):
    return (token_count * rate_per_million) / 1_000_000 / 0.01

def read_jsonl(path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:
            continue
    return rows

def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, separators=(",", ":")) + "\n")

def render_daily_markdown(rows):
    lines = [
        "# Prompt Optimizer Daily Summary",
        "",
        "| Date | Attempts | Success | Bypass | Error | Tokens In | Tokens Out | AI Credits | USD | Model |",
        "|------|----------|---------|--------|-------|-----------|------------|------------|-----|-------|",
    ]
    for row in rows:
        lines.append(
            "| {date} | {attempts} | {success} | {bypass} | {error} | {tokens_in} | {tokens_out} | {credits:.6f} | ${usd:.6f} | `{model}` |".format(
                date=row["date"],
                attempts=row["attempts"],
                success=row["success_runs"],
                bypass=row["bypass_runs"],
                error=row["error_runs"],
                tokens_in=row["tokens_in"],
                tokens_out=row["tokens_out"],
                credits=row["credits"],
                usd=row["usd"],
                model=row["model"],
            )
        )
    lines.append("")
    return "\n".join(lines)

def resolve_model_key(raw):
    key = (raw or "gpt-5-mini").strip().lower()
    return key if key in PRICE_TABLE else "gpt-5-mini"

now = datetime.now().astimezone()
date = now.date().isoformat()
status = os.environ.get("LOG_STATUS", "ok")
reason = os.environ.get("LOG_REASON", "")
source = os.environ.get("LOG_SOURCE", "api")
raw_prompt = os.environ.get("RAW_PROMPT", "")
compressed_prompt = os.environ.get("COMPRESSED_PROMPT", "")
skills = json.loads(os.environ.get("REQUIRED_SKILLS_JSON", "[]") or "[]")
catalog = json.loads(os.environ.get("SKILLS_CATALOG_JSON", "[]") or "[]")
model_key = resolve_model_key(os.environ.get("CREDIT_MODEL", "gpt-5-mini"))
rates = PRICE_TABLE[model_key]

raw_tokens = estimate_tokens(raw_prompt)
compressed_tokens = estimate_tokens(compressed_prompt)
input_credits = credits_from_tokens(raw_tokens, rates["input"]) if status == "ok" else 0.0
output_credits = credits_from_tokens(compressed_tokens, rates["output"]) if status == "ok" else 0.0
total_credits = input_credits + output_credits

record = {
    "ts": now.isoformat(timespec="seconds"),
    "status": status,
    "reason": reason,
    "prompt_hash": hashlib.sha256(raw_prompt.encode("utf-8")).hexdigest()[:12],
    "raw_chars": len(raw_prompt),
    "compressed_chars": len(compressed_prompt),
    "raw_tokens_est": raw_tokens,
    "compressed_tokens_est": compressed_tokens if status == "ok" else 0,
    "credit_model": model_key,
    "input_ai_credits": round(input_credits, 6),
    "output_ai_credits": round(output_credits, 6),
    "total_ai_credits": round(total_credits, 6),
    "usd_estimate": round(total_credits * 0.01, 6),
    "skill_count": len(skills) if isinstance(skills, list) else 0,
    "skills": skills if isinstance(skills, list) else [],
    "catalog_count": len(catalog) if isinstance(catalog, list) else 0,
    "source": source,
}

run_log = pathlib.Path(os.environ["OPTIMIZER_LOG"])
run_log.parent.mkdir(parents=True, exist_ok=True)
with run_log.open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, separators=(",", ":")) + "\n")

daily_log = pathlib.Path(os.environ["DAILY_LOG"])
daily_rows = read_jsonl(daily_log)
day = None
for row in daily_rows:
    if row.get("date") == date:
        day = row
        break
if day is None:
    day = {
        "date": date,
        "attempts": 0,
        "success_runs": 0,
        "bypass_runs": 0,
        "error_runs": 0,
        "tokens_in": 0,
        "tokens_out": 0,
        "credits": 0.0,
        "usd": 0.0,
        "model": model_key,
        "last_prompt_hash": "",
    }
    daily_rows.append(day)

day["attempts"] += 1
if status == "ok":
    day["success_runs"] += 1
    day["tokens_in"] += raw_tokens
    day["tokens_out"] += compressed_tokens
    day["credits"] = round(float(day["credits"]) + total_credits, 6)
    day["usd"] = round(float(day["usd"]) + (total_credits * 0.01), 6)
elif status == "bypass":
    day["bypass_runs"] += 1
else:
    day["error_runs"] += 1
day["model"] = model_key
day["last_prompt_hash"] = record["prompt_hash"]

daily_rows = sorted(daily_rows, key=lambda row: row.get("date", ""))
write_jsonl(daily_log, daily_rows)

daily_report = pathlib.Path(os.environ["DAILY_REPORT"])
daily_report.parent.mkdir(parents=True, exist_ok=True)
daily_report.write_text(render_daily_markdown(daily_rows), encoding="utf-8")
PYEOF
}

export LOG_STATUS="ok"
export LOG_REASON=""
export LOG_SOURCE="$routing_source"
export REQUIRED_SKILLS_JSON="$required_skills_json"
export COMPRESSED_PROMPT="$compressed_prompt"
log_usage

if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  export FINAL_PROMPT="$final_prompt"
  export COMPRESSED_PROMPT="$compressed_prompt"
  python3 - <<'PYEOF'
import json
import os

print(json.dumps({
    "prompt": os.environ.get("FINAL_PROMPT", ""),
    "compressed_prompt": os.environ.get("COMPRESSED_PROMPT", ""),
    "required_skills": json.loads(os.environ.get("REQUIRED_SKILLS_JSON", "[]")),
    "catalog_count": len(json.loads(os.environ.get("SKILLS_CATALOG_JSON", "[]"))),
    "log_file": os.environ.get("OPTIMIZER_LOG", ""),
}, separators=(",", ":")))
PYEOF
else
  printf '%s\n' "$final_prompt"
fi
