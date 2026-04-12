---
name: dead-code
preamble-tier: 1
version: 1.0.0
description: |
  Find and remove dead code. Two modes: report (find unused files, exports,
  functions, imports, and dependencies — structured report with confidence
  ratings) and clean (remove dead code with test verification after each
  deletion). Framework-agnostic — wraps knip (JS/TS), deadcode (Go),
  psalm (PHP/Laravel), vulture (Python), and falls back to grep-based
  analysis for other languages.
  Use when asked to "find dead code", "unused code", "clean up dead code",
  "remove unused", "dead code report", or "what's unused".
  Proactively suggest after large refactors, before major releases, or
  when the codebase feels bloated. (gstack)
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
  - Edit
  - Write
  - AskUserQuestion
  - Agent
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
echo '{"skill":"dead-code","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"dead-code","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
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
thing when AI makes the marginal cost near-zero."

```bash
touch ~/.gstack/.completeness-intro-seen
```

Always run `touch` to mark as seen. This only happens once.

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

# /dead-code: Find and Remove Dead Code

Two modes:

- **Report** (default): Scan the repo and produce a structured dead code report.
  Does not modify any files.
- **Clean**: Remove dead code found in the report. Verifies each removal
  with the project's test suite. Commits atomically.

If the user says "dead code", "find unused", or "what's unused" → **report mode**.
If the user says "clean up dead code", "remove unused", or "delete dead code" → **clean mode**.
If unclear, default to **report mode** and ask before cleaning.

---

## Step 0: Detect project stack

```bash
# Languages
[ -f package.json ] && echo "LANG:js/ts"
[ -f tsconfig.json ] && echo "LANG:typescript"
[ -f go.mod ] && echo "LANG:go"
[ -f composer.json ] && echo "LANG:php"
[ -f artisan ] && echo "FRAMEWORK:laravel"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "LANG:python"
[ -f Cargo.toml ] && echo "LANG:rust"
[ -f Gemfile ] && echo "LANG:ruby"
[ -f mix.exs ] && echo "LANG:elixir"
[ -f *.csproj ] 2>/dev/null && echo "LANG:csharp"
```

Also read CLAUDE.md for any project-specific test command. You will need this
for clean mode verification.

If multiple languages detected, run analysis for ALL of them and merge results.

---

## Step 1: Install and run dead code tool

For each detected language, run the best available dead code detector.
Use the deterministic tool first. Only fall back to grep-based analysis
if the tool is unavailable or the language has no good tooling.

### JS/TS: knip

knip is the gold standard — entry-point aware, understands framework config
(Next.js pages, React components, test files, scripts in package.json).

**Before running knip**, check if the project uses a framework that needs
entry point hints. knip often over-reports "unused files" when it doesn't
know about convention-based routing:

1. **Inertia.js** (`@inertiajs/vue3` or `@inertiajs/react` in package.json):
   Pages are resolved by convention, not explicit imports. knip will flag
   every page as unused. Skip knip's `files` category for Inertia projects
   and instead check pages against controller `Inertia::render()` calls.

2. **Next.js** (`next` in package.json): knip has a built-in Next.js plugin.
   Usually works correctly out of the box.

3. **Nuxt** (`nuxt` in package.json): Auto-imports mean most composables
   and components look "unused" to knip. Use `--include dependencies` to
   limit the scan to deps only, and do component/composable analysis via grep.

```bash
npx knip --reporter json 2>/dev/null | head -3000
```

If knip fails (e.g., config issues), fall back to:
```bash
npx ts-prune 2>/dev/null | grep -v "used in module" | head -200
```

**Parse knip JSON output** into these categories:
- `files`: Entirely unused files (highest confidence — but see framework caveats above)
- `dependencies`: Unused packages in package.json
- `devDependencies`: Unused dev packages
- `unlisted`: Used but not declared dependencies
- `exports`: Exported symbols never imported elsewhere
- `types`: Exported types never used
- `duplicates`: Re-exported from multiple places
- `enumMembers`: Unused enum values

**Dependency verification**: For each dependency knip flags as unused, do a
quick grep to verify. If it's imported in even 1 file, it is NOT unused —
move it to a "low-usage dependency" note (informational, not actionable).
Only flag as P1 if there are truly zero imports/requires anywhere in the
codebase.

### Go: deadcode

```bash
# Official Go dead code tool
go install golang.org/x/tools/cmd/deadcode@latest 2>/dev/null
deadcode -test ./... 2>&1 | head -500
```

If deadcode is not available:
```bash
# Fallback: find exported functions not referenced elsewhere
grep -rn "^func [A-Z]" --include="*.go" | while read line; do
  FUNC=$(echo "$line" | grep -oP 'func \K[A-Z]\w+')
  FILE=$(echo "$line" | cut -d: -f1)
  COUNT=$(grep -rn "\b$FUNC\b" --include="*.go" | grep -v "^$FILE:" | wc -l)
  [ "$COUNT" -eq 0 ] && echo "UNUSED_EXPORT:$line"
done
```

Also check for unused files:
```bash
# Go files not imported by any other Go file
for f in $(find . -name "*.go" -not -name "*_test.go" -not -path "./vendor/*"); do
  PKG=$(head -1 "$f" | awk '{print $2}')
  IMPORTS=$(grep -rn "\".*$PKG\"" --include="*.go" | grep -v "$f" | wc -l)
  [ "$IMPORTS" -eq 0 ] && echo "MAYBE_UNUSED_FILE:$f (package: $PKG)"
done
```

### PHP/Laravel: psalm

```bash
# Check for psalm
./vendor/bin/psalm --version 2>/dev/null || echo "INSTALL_NEEDED"
```

If psalm is available:
```bash
./vendor/bin/psalm --find-dead-code --output-format=json 2>/dev/null | head -2000
```

If not, install temporarily:
```bash
composer require --dev vimeo/psalm 2>/dev/null
./vendor/bin/psalm --init 2>/dev/null
./vendor/bin/psalm --find-dead-code --output-format=json 2>/dev/null | head -2000
```

**Laravel-specific:** Run these checks. Use `find | while read` (not
`for f in glob`) to avoid errors when directories are empty.

Check for unused middleware — search bootstrap/app.php, Kernel.php, routes,
and config for references:

```bash
find app/Http/Middleware -name "*.php" 2>/dev/null | sort | while read f; do
  CLASS=$(basename "$f" .php)
  REFS=$(grep -rl "$CLASS" app/ routes/ bootstrap/ config/ --include="*.php" 2>/dev/null | grep -v "$f" | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_MIDDLEWARE:$f"
done
```

Check for unused models — search controllers, services, jobs, tests, and
other models for references:

```bash
find app/Models -name "*.php" 2>/dev/null | sort | while read model; do
  CLASS=$(basename "$model" .php)
  REFS=$(grep -rl "\b${CLASS}\b" app/ routes/ database/ tests/ --include="*.php" 2>/dev/null | grep -v "$model" | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_MODEL:$model"
done
```

Check for unused Blade views — search for the dot-notation view name in
PHP and Blade files:

```bash
find resources/views -name "*.blade.php" -not -path "*/vendor/*" 2>/dev/null | sort | while read blade; do
  VIEW=$(echo "$blade" | sed 's|resources/views/||;s|\.blade\.php||;s|/|.|g')
  REFS=$(grep -rl "'$VIEW'\|\"$VIEW\"" app/ routes/ resources/ --include="*.php" --include="*.blade.php" 2>/dev/null | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_VIEW:$blade (view: $VIEW)"
done
```

Check for unused services/actions — classes in app/Services/ or app/Actions/
not referenced by any controller, job, or other service:

```bash
find app/Services app/Actions -name "*.php" 2>/dev/null | sort | while read svc; do
  CLASS=$(basename "$svc" .php)
  REFS=$(grep -rl "\b${CLASS}\b" app/ --include="*.php" 2>/dev/null | grep -v "$svc" | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_SERVICE:$svc"
done
```

**Inertia page verification** — for Inertia projects, check which Vue/React
pages are actually rendered by controllers:

```bash
# Extract all Inertia::render page names from PHP
grep -rn "Inertia::render\|inertia(" app/ routes/ --include="*.php" 2>/dev/null | \
  grep -oP "(?:render|inertia)\(['\"]([^'\"]+)" | \
  sed "s/.*['\"]//;s/['\"].*//" | sort -u > /tmp/rendered-pages.txt

# Find all page Vue files
find resources/js/Pages -name "*.vue" 2>/dev/null | \
  sed 's|resources/js/Pages/||;s|\.vue||;s|/|/|g' | sort > /tmp/all-pages.txt

# Pages that exist but are never rendered
comm -23 /tmp/all-pages.txt /tmp/rendered-pages.txt
```

### Python: vulture

```bash
vulture --version 2>/dev/null || pip install vulture 2>/dev/null
vulture . --min-confidence 80 2>&1 | head -500
```

### Rust: compiler warnings

```bash
cargo build 2>&1 | grep "warning.*dead_code\|warning.*unused" | head -200
```

### Vue/React component scanning (for any JS/TS project)

For projects with Vue or React components, check for unused components and
composables/hooks that knip may have missed or over-reported:

```bash
# Unused Vue components (not imported by any other Vue/TS/JS file)
find resources/js/components src/components -name "*.vue" 2>/dev/null | sort | while read comp; do
  NAME=$(basename "$comp" .vue)
  REFS=$(grep -rl "$NAME" --include="*.vue" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "$comp" | grep -v node_modules | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_COMPONENT:$comp"
done
```

```bash
# Unused composables/hooks
find resources/js/composables src/composables src/hooks -name "*.ts" -o -name "*.js" 2>/dev/null | sort | while read comp; do
  NAME=$(basename "$comp" | sed 's/\.[^.]*$//')
  REFS=$(grep -rl "$NAME" --include="*.vue" --include="*.ts" --include="*.js" --include="*.tsx" . 2>/dev/null | grep -v "$comp" | grep -v node_modules | wc -l)
  [ "$REFS" -eq 0 ] && echo "UNUSED_COMPOSABLE:$comp"
done
```

### Fallback: grep-based analysis

For any language without a dedicated tool, run a general-purpose scan:

1. **Find files not imported/required by any other file:**
```bash
# Get all source files
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.go" -o -name "*.php" -o -name "*.py" -o -name "*.rb" \) \
  -not -path "*/node_modules/*" -not -path "*/vendor/*" -not -path "*/.git/*" \
  -not -path "*/dist/*" -not -path "*/build/*" | head -500
```

2. **For each file, check if it's referenced elsewhere:**
   Search for the filename (without extension) in all other source files.
   Files referenced zero times are candidates for dead code.

3. **Find exported functions/classes never referenced:**
   Grep for `export function`, `export class`, `export const`, `public function`,
   `def `, `func `, then check if each symbol appears in other files.

**Confidence rating for grep-based results:**
- File not imported anywhere + not an entry point = HIGH confidence
- Exported symbol not referenced = MEDIUM confidence (could be used dynamically)
- Function defined but not called in same file = LOW confidence (could be called externally)

---

## Step 2: Generate Report

Compile all findings into a structured report. Group by confidence tier.

### Report format:

```
# Dead Code Report

**Project:** {repo name}
**Stack:** {detected languages}
**Tool(s):** {tools used}
**Scan date:** {date}

## Summary

| Category        | Count | Confidence |
|-----------------|-------|------------|
| Unused files    |   N   | HIGH       |
| Unused exports  |   N   | MEDIUM     |
| Unused deps     |   N   | HIGH       |
| Unused imports  |   N   | HIGH       |
| Unreachable code|   N   | VARIES     |

**Estimated removable lines:** ~N lines across M files
**Estimated removable deps:** N packages

---

## P0: Unused Files (HIGH confidence)

These files are not imported, required, or referenced by any other file.
Safe to remove.

| File | Lines | Last modified | Notes |
|------|-------|---------------|-------|
| ... | ... | ... | ... |

## P1: Unused Dependencies (HIGH confidence)

Packages declared in the manifest but never imported.

| Package | Manifest | Type |
|---------|----------|------|
| ... | ... | dev/prod |

## P2: Unused Exports (MEDIUM confidence)

Exported symbols (functions, classes, constants, types) not imported
by any other file. May be used via dynamic imports, reflection, or
as public API.

| Symbol | File:Line | Type |
|--------|-----------|------|
| ... | ... | function/class/const/type |

## P3: Unused Variables & Imports (HIGH confidence)

Variables declared but never read. Imports that aren't used.

| Symbol | File:Line | Type |
|--------|-----------|------|
| ... | ... | variable/import |

## P4: Unreachable Code (LOW confidence)

Code after return statements, dead branches, commented-out blocks.
Review manually before removing.

| Location | File:Line | Notes |
|----------|-----------|-------|
| ... | ... | ... |

---

## Framework-Specific Findings

{Only if Laravel, Next.js, or other framework detected}

### Laravel
- Unused routes: ...
- Unused middleware: ...
- Unused models: ...
- Unused Blade views: ...
- Unused migrations (no matching table): ...

### Next.js / React
- Unused pages: ...
- Unused components: ...
- Unused API routes: ...
```

**Important:** For each finding, include the file path and line number
so the user (or clean mode) can navigate directly to the dead code.

### "Verified in-use" section

**Always end the report with a "Not flagged (verified in-use)" section.**
This builds trust by showing what you checked and cleared. List categories
of things you verified are NOT dead code, with brief reasons:

```
## Not flagged (verified in-use)

- All middleware — referenced in bootstrap/app.php or route groups
- All models — referenced by controllers/services/tests
- All Blade views — referenced by controllers or other views
- canvas-confetti, three — imported in JS code (1-2 files each)
- scripts/deploy.sh — referenced in CI workflow
```

This section is especially important when the tool (e.g., knip) initially
flagged many items that turned out to be false positives. The user needs to
know you investigated and dismissed them, not that you silently ignored them.

### Low-usage dependencies (informational)

If a dependency is imported in only 1-2 files, note it as informational
but do NOT flag it as P1 unused. It's used — just lightly. Frame it as:

> **Low-usage dependencies** (not dead, but worth knowing):
> - `sharp` — imported only in `app/Services/ImageProcessor.php`
> - `ws` — imported only in `scripts/chat-ws-proxy.mjs`

This helps the user decide if they want to consolidate or remove these
during a future cleanup, without the report crying wolf.

If in **report mode**, stop here. Print the report and do NOT modify any files.

---

## Step 3: Clean Mode

Only run this step if the user explicitly asked for clean mode ("clean up
dead code", "remove unused", "delete dead code").

### 3a. Confirm scope with user

Before deleting anything, present the report from Step 2 and ask:

> I found N items of dead code across M files. Which tiers do you want me to clean?
>
> A) P0 only — unused files (safest, N files)
> B) P0 + P1 — unused files + dependencies (N items)
> C) P0 + P1 + P2 — includes unused exports (more aggressive)
> D) All tiers (most aggressive — review P3/P4 manually first)
>
> I'll run your test suite after each removal to verify nothing breaks.

### 3b. Read test command from CLAUDE.md

Check CLAUDE.md for the project's test command. If not found, ask:

> What command runs your tests? (e.g., `npm test`, `go test ./...`, `php artisan test`)

### 3c. Remove dead code, verify after each batch

Process removals in order of confidence (P0 first, then P1, etc.).

**For unused files (P0):**
1. Delete the file
2. Remove any imports/requires of that file from other files
3. Run the test suite
4. If tests pass, commit: `chore: remove unused file {filename}`
5. If tests fail, revert and mark as "false positive — used indirectly"

**For unused dependencies (P1):**
1. Remove from manifest (package.json, composer.json, go.mod, etc.)
2. Run the package manager's install/tidy command
3. Run the test suite
4. If tests pass, commit: `chore: remove unused dependency {package}`
5. If tests fail, revert and note the hidden usage

**For unused exports (P2):**
1. Remove the `export` keyword (keep the function if it's used internally)
2. If the entire function/class is unused, remove it
3. Run the test suite
4. Commit: `chore: remove unused export {symbol} from {file}`

**For unused imports/variables (P3):**
1. Remove the import line or variable declaration
2. Run the test suite (batch these — one commit per file)
3. Commit: `chore: remove unused imports in {file}`

### 3d. Summary

After all removals, print:

```
## Clean Summary

Removed: N items across M files
  - Files deleted: N
  - Dependencies removed: N
  - Exports removed: N
  - Imports/variables removed: N
Lines removed: ~N
Commits: N

Skipped (false positives): N
  - {reason for each skip}

All tests passing. ✓
```

---

## Edge Cases & False Positive Awareness

**Known false positive patterns — do NOT flag these as dead code:**

- **Entry points:** main.go, index.ts, artisan, manage.py, bin/* — these
  are called by the runtime, not imported by other files
- **Framework convention files:** Next.js pages/, app/, Laravel routes/,
  migrations, seeders, factories, middleware registered in Kernel/bootstrap
- **Inertia.js pages:** Pages resolved by `Inertia::render('Page/Name')` —
  they look unused to import-based tools but are loaded at runtime by name.
  Cross-reference against controller render calls, not import graphs.
- **Test files:** *_test.go, *.test.ts, *.spec.js — used by test runner
- **Config files:** *.config.js, .eslintrc, webpack.config, vite.config
- **Type declarations:** *.d.ts, *.types.ts — consumed by compiler
- **CLI scripts:** files in bin/, scripts/ referenced from package.json scripts
- **Plugin/hook systems:** WordPress hooks, Laravel service providers,
  event listeners registered in config
- **Dynamic imports:** `require(variable)`, `import()`, `__autoload`,
  `spl_autoload_register` — tool may miss these
- **Reflection/meta-programming:** Go `reflect`, PHP `get_class()`,
  Python `getattr()`, Ruby `send()`
- **Public API surface:** If the project is a library, exported symbols
  ARE the product — only flag if not in the package's main export

When in doubt, rate as MEDIUM or LOW confidence rather than HIGH.
