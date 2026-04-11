---
name: trawl
preamble-tier: 1
version: 0.1.0
description: |
  Tiered web scraping for AI agents. HTTP → Chromium routing with persistent
  frontier, resumable batch jobs, BFS crawl, sitemap discovery, URL mapping,
  clean markdown extraction, page metadata, CSS selectors, and YAML schema
  extraction. Near-feature-parity with Firecrawl — runs as a local static
  binary, no API key, no runtime dependency. Use when asked to "scrape",
  "crawl", "extract pages", "get markdown from a site", "enumerate URLs",
  "scrape a list of companies", "map a site", or anytime the task is bulk
  content-in / clean-JSONL-out. (gstack)
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -exec rm {} + 2>/dev/null || true
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.gstack/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_SKILL_PREFIX=$(~/.claude/skills/gstack/bin/gstack-config get skill_prefix 2>/dev/null || echo "false")
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
echo "SKILL_PREFIX: $_SKILL_PREFIX"
source <(~/.claude/skills/gstack/bin/gstack-repo-mode 2>/dev/null) || true
REPO_MODE=${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
if [ "$_TEL" != "off" ]; then
echo '{"skill":"trawl","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# zsh-compatible: use find instead of glob to avoid NOMATCH error
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do
  if [ -f "$_PF" ]; then
    if [ "$_TEL" != "off" ] && [ -x "~/.claude/skills/gstack/bin/gstack-telemetry-log" ]; then
      ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true
    fi
    rm -f "$_PF" 2>/dev/null || true
  fi
  break
done
# Learnings count
eval "$(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null)" 2>/dev/null || true
_LEARN_FILE="${GSTACK_HOME:-$HOME/.gstack}/projects/${SLUG:-unknown}/learnings.jsonl"
if [ -f "$_LEARN_FILE" ]; then
  _LEARN_COUNT=$(wc -l < "$_LEARN_FILE" 2>/dev/null | tr -d ' ')
  echo "LEARNINGS: $_LEARN_COUNT entries loaded"
  if [ "$_LEARN_COUNT" -gt 5 ] 2>/dev/null; then
    ~/.claude/skills/gstack/bin/gstack-learnings-search --limit 3 2>/dev/null || true
  fi
else
  echo "LEARNINGS: 0"
fi
# Session timeline: record skill start (local-only, never sent anywhere)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"trawl","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
# Check if CLAUDE.md has routing rules
_HAS_ROUTING="no"
if [ -f CLAUDE.md ] && grep -q "## Skill routing" CLAUDE.md 2>/dev/null; then
  _HAS_ROUTING="yes"
fi
_ROUTING_DECLINED=$(~/.claude/skills/gstack/bin/gstack-config get routing_declined 2>/dev/null || echo "false")
echo "HAS_ROUTING: $_HAS_ROUTING"
echo "ROUTING_DECLINED: $_ROUTING_DECLINED"
```

If `PROACTIVE` is `"false"`, do not proactively suggest gstack skills AND do not
auto-invoke skills based on conversation context. Only run skills the user explicitly
types (e.g., /qa, /ship). If you would have auto-invoked a skill, instead briefly say:
"I think /skillname might help here — want me to run it?" and wait for confirmation.
The user opted out of proactive behavior.

If `SKILL_PREFIX` is `"true"`, the user has namespaced skill names. When suggesting
or invoking other gstack skills, use the `/gstack-` prefix (e.g., `/gstack-qa` instead
of `/qa`, `/gstack-ship` instead of `/ship`). Disk paths are unaffected — always use
`~/.claude/skills/gstack/[skill-name]/SKILL.md` for reading skill files.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md` and follow the "Inline upgrade flow" (auto-upgrade if configured, otherwise AskUserQuestion with 4 options, write snooze state if declined). If `JUST_UPGRADED <from> <to>`: tell user "Running gstack v{to} (just updated!)" and continue.

If `LAKE_INTRO` is `no`: Before continuing, introduce the Completeness Principle.
Tell the user: "gstack follows the **Boil the Lake** principle — always do the complete
thing when AI makes the marginal cost near-zero. Read more: https://garryslist.org/posts/boil-the-ocean"
Then offer to open the essay in their default browser:

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

Only run `open` if the user says yes. Always run `touch` to mark as seen. This only happens once.

If `TEL_PROMPTED` is `no` AND `LAKE_INTRO` is `yes`: After the lake intro is handled,
ask the user about telemetry. Use AskUserQuestion:

> Help gstack get better! Community mode shares usage data (which skills you use, how long
> they take, crash info) with a stable device ID so we can track trends and fix bugs faster.
> No code, file paths, or repo names are ever sent.
> Change anytime with `gstack-config set telemetry off`.

Options:
- A) Help gstack get better! (recommended)
- B) No thanks

If A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry community`

If B: ask a follow-up AskUserQuestion:

> How about anonymous mode? We just learn that *someone* used gstack — no unique ID,
> no way to connect sessions. Just a counter that helps us know if anyone's out there.

Options:
- A) Sure, anonymous is fine
- B) No thanks, fully off

If B→A: run `~/.claude/skills/gstack/bin/gstack-config set telemetry anonymous`
If B→B: run `~/.claude/skills/gstack/bin/gstack-config set telemetry off`

Always run:
```bash
touch ~/.gstack/.telemetry-prompted
```

This only happens once. If `TEL_PROMPTED` is `yes`, skip this entirely.

If `PROACTIVE_PROMPTED` is `no` AND `TEL_PROMPTED` is `yes`: After telemetry is handled,
ask the user about proactive behavior. Use AskUserQuestion:

> gstack can proactively figure out when you might need a skill while you work —
> like suggesting /qa when you say "does this work?" or /investigate when you hit
> a bug. We recommend keeping this on — it speeds up every part of your workflow.

Options:
- A) Keep it on (recommended)
- B) Turn it off — I'll type /commands myself

If A: run `~/.claude/skills/gstack/bin/gstack-config set proactive true`
If B: run `~/.claude/skills/gstack/bin/gstack-config set proactive false`

Always run:
```bash
touch ~/.gstack/.proactive-prompted
```

This only happens once. If `PROACTIVE_PROMPTED` is `yes`, skip this entirely.

If `HAS_ROUTING` is `no` AND `ROUTING_DECLINED` is `false` AND `PROACTIVE_PROMPTED` is `yes`:
Check if a CLAUDE.md file exists in the project root. If it does not exist, create it.

Use AskUserQuestion:

> gstack works best when your project's CLAUDE.md includes skill routing rules.
> This tells Claude to use specialized workflows (like /ship, /investigate, /qa)
> instead of answering directly. It's a one-time addition, about 15 lines.

Options:
- A) Add routing rules to CLAUDE.md (recommended)
- B) No thanks, I'll invoke skills manually

If A: Append this section to the end of CLAUDE.md:

```markdown

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
```

Then commit the change: `git add CLAUDE.md && git commit -m "chore: add gstack skill routing rules to CLAUDE.md"`

If B: run `~/.claude/skills/gstack/bin/gstack-config set routing_declined true`
Say "No problem. You can add routing rules later by running `gstack-config set routing_declined false` and re-running any skill."

This only happens once per project. If `HAS_ROUTING` is `yes` or `ROUTING_DECLINED` is `true`, skip this entirely.

## Voice

**Tone:** direct, concrete, sharp, never corporate, never academic. Sound like a builder, not a consultant. Name the file, the function, the command. No filler, no throat-clearing.

**Writing rules:** No em dashes (use commas, periods, "..."). No AI vocabulary (delve, crucial, robust, comprehensive, nuanced, etc.). Short paragraphs. End with what to do.

The user always has context you don't. Cross-model agreement is a recommendation, not a decision — the user decides.

## Completion Status Protocol

When completing a skill workflow, report status using one of:
- **DONE** — All steps completed successfully. Evidence provided for each claim.
- **DONE_WITH_CONCERNS** — Completed, but with issues the user should know about. List each concern.
- **BLOCKED** — Cannot proceed. State what is blocking and what was tried.
- **NEEDS_CONTEXT** — Missing information required to continue. State exactly what you need.

### Escalation

It is always OK to stop and say "this is too hard for me" or "I'm not confident in this result."

Bad work is worse than no work. You will not be penalized for escalating.
- If you have attempted a task 3 times without success, STOP and escalate.
- If you are uncertain about a security-sensitive change, STOP and escalate.
- If the scope of work exceeds what you can verify, STOP and escalate.

Escalation format:
```
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

## Operational Self-Improvement

Before completing, reflect on this session:
- Did any commands fail unexpectedly?
- Did you take a wrong approach and have to backtrack?
- Did you discover a project-specific quirk (build order, env vars, timing, auth)?
- Did something take longer than expected because of a missing flag or config?

If yes, log an operational learning for future sessions:

```bash
~/.claude/skills/gstack/bin/gstack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

Replace SKILL_NAME with the current skill name. Only log genuine operational discoveries.
Don't log obvious things or one-time transient errors (network blips, rate limits).
A good test: would knowing this save 5+ minutes in a future session? If yes, log it.

## Telemetry (run last)

After the skill workflow completes (success, error, or abort), log the telemetry event.
Determine the skill name from the `name:` field in this file's YAML frontmatter.
Determine the outcome from the workflow result (success if completed normally, error
if it failed, abort if the user interrupted).

**PLAN MODE EXCEPTION — ALWAYS RUN:** This command writes telemetry to
`~/.gstack/analytics/` (user config directory, not project files). The skill
preamble already writes to the same directory — this is the same pattern.
Skipping this command loses session duration and outcome data.

Run this bash:

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
# Session timeline: record skill completion (local-only, never sent anywhere)
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"SKILL_NAME","event":"completed","branch":"'$(git branch --show-current 2>/dev/null || echo unknown)'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
# Local analytics (gated on telemetry setting)
if [ "$_TEL" != "off" ]; then
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","browse":"USED_BROWSE","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# Remote telemetry (opt-in, requires binary)
if [ "$_TEL" != "off" ] && [ -x ~/.claude/skills/gstack/bin/gstack-telemetry-log ]; then
  ~/.claude/skills/gstack/bin/gstack-telemetry-log \
    --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
    --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
fi
```

Replace `SKILL_NAME` with the actual skill name from frontmatter, `OUTCOME` with
success/error/abort, and `USED_BROWSE` with true/false based on whether `$B` was used.
If you cannot determine the outcome, use "unknown". The local JSONL always logs. The
remote binary only runs if telemetry is not off and the binary exists.

## Plan Mode Safe Operations

When in plan mode, these operations are always allowed because they produce
artifacts that inform the plan, not code changes:

- `$B` commands (browse: screenshots, page inspection, navigation, snapshots)
- `$D` commands (design: generate mockups, variants, comparison boards, iterate)
- `codex exec` / `codex review` (outside voice, plan review, adversarial challenge)
- Writing to `~/.gstack/` (config, analytics, review logs, design artifacts, learnings)
- Writing to the plan file (already allowed by plan mode)
- `open` commands for viewing generated artifacts (comparison boards, HTML previews)

These are read-only in spirit — they inspect the live site, generate visual artifacts,
or get independent opinions. They do NOT modify project source files.

## Plan Status Footer

When you are in plan mode and about to call ExitPlanMode:

1. Check if the plan file already has a `## GSTACK REVIEW REPORT` section.
2. If it DOES — skip (a review skill already wrote a richer report).
3. If it does NOT — run this command:

\`\`\`bash
~/.claude/skills/gstack/bin/gstack-review-read
\`\`\`

Then write a `## GSTACK REVIEW REPORT` section to the end of the plan file:

- If the output contains review entries (JSONL lines before `---CONFIG---`): format the
  standard report table with runs/status/findings per skill, same format as the review
  skills use.
- If the output is `NO_REVIEWS` or empty: write this placeholder table:

\`\`\`markdown
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | 0 | — | — |
| Codex Review | \`/codex review\` | Independent 2nd opinion | 0 | — | — |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | 0 | — | — |
| Design Review | \`/plan-design-review\` | UI/UX gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run \`/autoplan\` for full review pipeline, or individual reviews above.
\`\`\`

**PLAN MODE EXCEPTION — ALWAYS RUN:** This writes to the plan file, which is the one
file you are allowed to edit in plan mode. The plan file review report is part of the
plan's living status.

# /trawl: Tiered Web Scraping

Trawl is a single Go binary that routes each URL through the cheapest engine
that returns valid content (HTTP → Chromium), remembers which tier worked per
host, persists the frontier so long crawls survive crashes, and produces clean
markdown + metadata ready for downstream pipelines.

**One binary. No API key. No Docker. No runtime dependency.**

Think of it as "Firecrawl's CLI surface, but local." Same command shape
(`scrape`, `crawl`, `map`, `sitemap`), different runtime cost (free), and
composable with Unix pipes.

---

## When to use trawl vs other tools

| Task | Use | Why |
|---|---|---|
| Bulk scraping 100+ URLs | **`trawl batch`** | Persistent frontier, resumable, per-domain rate limiting, tier learning |
| Scrape one URL → clean markdown | **`trawl scrape`** | HTML→markdown + readability + page metadata + selectors in one call |
| Walk a whole site | **`trawl crawl`** | BFS link discovery, same-domain filter, depth cap, one JSONL file out |
| Enumerate a site's URLs without scraping | **`trawl map`** | Sitemap + HTML crawl union, URL list to stdout |
| Find sitemaps for a domain | **`trawl sitemap`** | robots.txt + well-known paths + recursive sitemap-index |
| Interact with a single page (click, fill, assert) | **`/browse`** | Trawl doesn't interact — it extracts. `/browse` is for stateful QA. |
| Read one page inline for a one-off reference | **`WebFetch`** | Trawl is overkill for single casual lookups — use WebFetch for "just tell me what this page says". |
| Scrape with LLM extraction | **`trawl scrape --format markdown` → pipe to LLM** | Trawl explicitly stays out of the LLM business. Clean markdown out, LLM downstream. |

**Rule of thumb:** if the output you want is a JSONL file with multiple
records, trawl is the right tool. If the output is "did the click work?",
use `/browse`. If the output is "summarize this one page", use WebFetch.

---

## Setup check

Trawl installs as part of `./setup` (via `go install`) to `~/.gstack/bin/trawl`.
Before running any command, verify the binary is available:

```bash
TRAWL="$HOME/.gstack/bin/trawl"
if [ ! -x "$TRAWL" ]; then
  TRAWL="$(command -v trawl 2>/dev/null || true)"
fi
if [ -z "$TRAWL" ]; then
  echo "trawl not installed"
  echo "  install: go install github.com/jeffdhooton/trawl/cmd/trawl@latest"
  echo "  or rerun: ./setup (in your gstack checkout)"
  exit 1
fi
"$TRAWL" version
```

If `trawl` is not present, offer to install it via the command above. Don't
proceed with scraping work until the binary exists.

For the rest of this skill, assume `$TRAWL` is resolved and all commands use
it. (In recipes below, you can substitute `trawl` if it's on your PATH.)

---

## Command decision tree

```
Need to scrape content from the web
│
├── One URL? ────────────────────────▶ trawl scrape <url>
│
├── List of URLs (file / CSV)? ──────▶ trawl batch urls.txt
│
├── Whole site from a seed page? ────▶ trawl crawl <seed-url>
│
├── Just need URLs (not content)? ───▶ trawl map <url>
│       └── Or only from sitemaps? ──▶ trawl sitemap <url>
│
└── Interrupted job to resume? ──────▶ trawl resume <job-id>
```

---

## Core recipes

### 1. Scrape a single page to clean markdown

```bash
"$TRAWL" scrape https://linear.app \
  --format markdown \
  --readability \
  -o page.jsonl
```

What you get: one JSONL record with `body` (markdown), `metadata.page` (title,
description, canonical, OG, JSON-LD), `canonical_url`, `fetched_at`, `tier`,
`status_code`, `duration_ms`, `content_hash`, `failure_category`.

**Flag cheat sheet:**
- `--format markdown` — HTML→markdown in the `body` field. Omit to skip body entirely.
- `--readability` — strip nav/footer/ads before conversion or CSS extraction.
- `--no-metadata` — skip page metadata extraction (faster, smaller records).
- `-o file.jsonl` — output file (default `-` = stdout).
- `--timeout 30s` — HTTP request timeout.

### 2. Extract structured fields with CSS selectors

```bash
"$TRAWL" scrape https://stripe.com/pricing \
  --selector "headline=h1" \
  --selector "plans=.pricing-card h3" \
  --selector "prices=.pricing-card .price" \
  --format markdown \
  -o stripe.jsonl
```

Selector syntax:
- `name=css` — grab first match, text content
- `name=css[]` — grab all matches, array of text
- `name=css@attr` — grab attribute value (e.g. `link=a@href`)
- `name=css[]@attr` — array of attribute values

Selectors land in the `extracted` field on the output record.

### 3. Extract with a YAML schema (complex / nested)

For structured extraction with nested objects or repeated groups, use
`--schema` with a YAML file instead of stacking `--selector` flags:

```yaml
# article.yaml
version: 1
fields:
  title:
    selector: "h1"
  authors:
    selector: ".byline a"
    multiple: true
    fields:
      name:
        selector: ""
      profile:
        selector: ""
        attr: "href"
  body:
    selector: "article"
```

```bash
"$TRAWL" scrape https://example.com/post \
  --schema article.yaml \
  --readability \
  -o post.jsonl
```

Reference example: `docs/examples/sep-article.yaml` in the trawl repo (Stanford
Encyclopedia of Philosophy schema — nested TOC, related entries, author).

### 4. Batch-scrape a URL list (resumable)

```bash
"$TRAWL" batch urls.txt \
  --format markdown \
  --readability \
  --concurrency 20 \
  --rate 1 \
  -o results.jsonl
```

What you get: one JSONL line per URL. On SIGINT/SIGTERM, trawl shuts down
gracefully and prints a resume command with the job ID.

**Flag cheat sheet:**
- `-c, --concurrency 20` — max in-flight requests across all domains (default 20).
- `--rate 1` — requests per second per domain (default 1, polite).
- `--job-id my-job` — name the job so resume is human-readable.
- `-o results.jsonl` — output file.

### 5. Batch from CSV with hybrid fallback discovery

When your seed list is a CSV with both a primary URL and a homepage fallback,
trawl can re-route through the fallback on `http_4xx` or `dns_failure`:

```bash
"$TRAWL" batch companies.csv \
  --url-column pricing_url \
  --fallback-column homepage \
  --fallback-selector 'a[href*="pricing"]' \
  --format markdown \
  -o companies.jsonl
```

Trawl tries `pricing_url` first. If that fetch fails with a trigger category
(`http_4xx`, `dns_failure`), it loads `homepage`, runs the `fallback-selector`
to find a pricing link, and re-scrapes from there. Both the original failure
and the fallback attempt are recorded.

### 6. BFS-crawl a whole site from a seed page

```bash
"$TRAWL" crawl https://docs.example.com \
  --depth 3 \
  --same-domain \
  --limit 500 \
  --format markdown \
  --readability \
  -o docs-corpus.jsonl
```

Walks the site breadth-first, routing every discovered page through the same
tiered pipeline as scrape/batch. Produces a markdown corpus suitable for
feeding into an LLM index.

**Flag cheat sheet:**
- `--depth 3` — BFS depth (seed is depth 0, default 2).
- `--limit 500` — hard cap on URLs enqueued (default 1000, `0` = unlimited).
- `--same-domain` — restrict to seed's host and sibling subdomains (default on).
- `--format markdown --readability` — clean corpus, not raw HTML dumps.

### 7. Enumerate URLs without scraping

```bash
# Both sources (sitemap + HTML crawl)
"$TRAWL" map https://example.com --depth 2 > urls.txt

# Sitemap only (fastest, publisher-declared)
"$TRAWL" map https://example.com --sources sitemap > urls.txt

# HTML crawl only (no sitemap trust)
"$TRAWL" map https://example.com --sources crawl --depth 3 > urls.txt
```

`map` is the URL-list equivalent of `crawl` — no extraction, no body writes,
just a deduped URL list to stdout. Compose with `batch`:

```bash
"$TRAWL" map https://example.com > urls.txt
"$TRAWL" batch urls.txt --format markdown -o scraped.jsonl
```

### 8. Discover sitemaps for a domain

```bash
"$TRAWL" sitemap https://stripe.com --verbose
```

Checks robots.txt for `Sitemap:` directives, falls back to `/sitemap.xml` and
`/sitemap_index.xml`, recursively expands sitemap-index files (up to
`--max-depth`, default 3), handles gzip, dedupes URLs. Stream-friendly for
large sites (up to `--max-urls`, default 50000).

### 9. Resume an interrupted job

```bash
# Trawl printed "resume with: trawl resume abc123" on SIGINT
"$TRAWL" resume abc123
```

Trawl reopens the frontier, re-queues any in-flight URLs that didn't complete,
and drains the remaining work using the same configuration saved at job
creation time. No flags needed — the job's own state has everything.

---

## Output shape

Every record is one line of JSONL:

```json
{
  "url": "https://example.com/pricing",
  "canonical_url": "https://example.com/pricing",
  "fetched_at": "2026-04-10T22:49:41Z",
  "tier": "http",
  "status_code": 200,
  "duration_ms": 384,
  "content_hash": "sha256:...",
  "extracted": { "headline": "Simple pricing", "plans": ["Free", "Pro"] },
  "body": "# Pricing\n\n...",
  "body_format": "markdown",
  "metadata": {
    "content_type": "text/html; charset=utf-8",
    "body_bytes": 24815,
    "final_url": "https://example.com/pricing",
    "page": {
      "title": "Pricing | Example",
      "description": "...",
      "canonical": "https://example.com/pricing",
      "language": "en",
      "published_at": "2026-02-14T09:30:00Z",
      "open_graph": { "title": "...", "image": "..." },
      "twitter": { "card": "summary_large_image" },
      "json_ld": [ { "@type": "Article", "headline": "..." } ]
    }
  },
  "failure_category": "success"
}
```

**Key fields:**
- `body` — only populated when `--format` is set (`markdown` or `html`).
- `body_format` — matches `--format`, omitted when body is.
- `metadata.page` — always populated unless `--no-metadata`.
- `extracted` — only populated when `--selector` or `--schema` is set.
- `failure_category` — `success`, or one of the classified buckets below.

**Failure categories** (filter with `jq`):
- `success` — fetched and parsed cleanly
- `http_4xx` — 400-class HTTP error (page not found, auth required, etc.)
- `http_5xx` — 500-class HTTP error (server broken)
- `dns_failure` — DNS lookup failed (domain doesn't exist or unreachable)
- `tls_error` — certificate or handshake failed
- `timeout` — fetch timed out before completing
- `spa_shell` — HTTP tier returned a content-free SPA shell (Chromium should handle)
- `robots_disallowed` — blocked by robots.txt (unless `--ignore-robots`)

**Per-job stats:** every batch/crawl job writes a `stats.json` to the job
directory with reachable/unreachable counts, per-category failure breakdown,
per-tier latency, chromium escalation rate, and fallback yield. Read it with
`jq` for quick health checks.

---

## Composing with Unix pipes

### Filter to just successful records with markdown bodies

```bash
jq -c 'select(.failure_category == "success" and .body != null)' results.jsonl
```

### Extract just the markdown into per-URL files

```bash
jq -r '.url + "\t" + (.body // "")' results.jsonl \
  | while IFS=$'\t' read -r url body; do
      slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|_|g')
      echo "$body" > "pages/$slug.md"
    done
```

### Pipe clean markdown into an LLM for extraction

Trawl deliberately stops at clean content. For LLM-based extraction, compose:

```bash
"$TRAWL" scrape https://example.com/pricing --format markdown --readability \
  | jq -r '.body' \
  | claude -p "Extract the pricing tiers and monthly costs as JSON"
```

### Find failures for retry

```bash
jq -c 'select(.failure_category != "success")' results.jsonl > failures.jsonl
jq -r '.url' failures.jsonl > retry-urls.txt
"$TRAWL" batch retry-urls.txt --force-tier chromium -o retry-results.jsonl
```

---

## Failure modes and how to handle them

### SPA shell returned (empty body, meaningful JS)

If a page loads real content only after JavaScript runs, the HTTP tier will
return a `spa_shell` failure category. Trawl auto-escalates to Chromium on the
next run, but you can force it immediately:

```bash
"$TRAWL" scrape https://some-spa.com --force-tier chromium --format markdown
```

After the first successful chromium fetch, trawl's **tier cache** remembers
that host needs chromium and skips the HTTP tier on subsequent runs.

### Rate limiting / 429s

If you're getting `http_4xx` with 429 status, lower `--rate`:

```bash
"$TRAWL" batch urls.txt --rate 0.5 --concurrency 5
```

`--rate` is per-domain. For a list spanning many domains, you can keep
concurrency high without hitting any single host hard.

### robots.txt blocking everything

Trawl respects robots.txt by default. If you have authorization to bypass:

```bash
"$TRAWL" batch urls.txt --ignore-robots  # logs a warning
```

Only use `--ignore-robots` when you have explicit permission (your own site,
client engagement, API-less partner integration).

### Long-running crawl interrupted

Ctrl-C shuts workers down gracefully and prints:

```
resume with: trawl resume <job-id>
```

Save that job ID and come back whenever. The persistent frontier is at
`$TRAWL_HOME/frontier` (defaults to `~/.trawl/frontier`).

---

## Advanced

### Content cache (deduplicate across jobs)

For repeated scraping of the same URLs (daily monitoring, incremental crawls),
enable the cross-job content cache:

```bash
"$TRAWL" batch urls.txt --cache --cache-ttl 24h
```

Cache hits short-circuit the tier loop and reuse the stored body. Set
`--cache-ttl 0` for no expiration (manual invalidation only).

### Tier pinning (bypass tier learning)

```bash
# Force chromium for this run (ignore tier cache)
"$TRAWL" scrape https://example.com --force-tier chromium

# Try only HTTP, don't escalate
"$TRAWL" batch urls.txt --tiers http
```

### Screenshots (chromium tier only)

```bash
"$TRAWL" crawl https://example.com \
  --screenshot-dir /tmp/shots \
  --format markdown \
  -o crawled.jsonl
```

Full-page PNG per chromium-served page. HTTP-tier responses don't produce
files (the HTTP tier never loads a visual DOM).

### Disable tier learning (fresh-start every run)

```bash
"$TRAWL" batch urls.txt --no-tier-learning
```

Forces every URL to start at the cheapest tier regardless of prior results.
Useful for benchmarking or when the cache is stale.

---

## Full flag reference

Each command's full flag surface is in its `--help`:

```bash
"$TRAWL" --help
"$TRAWL" scrape --help
"$TRAWL" batch --help
"$TRAWL" crawl --help
"$TRAWL" map --help
"$TRAWL" sitemap --help
"$TRAWL" resume --help
```

Upstream docs: `github.com/jeffdhooton/trawl` — `README.md`, `docs/SPEC.md`,
`docs/ROADMAP.md`, and `docs/examples/` for schema examples.
