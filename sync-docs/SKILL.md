---
name: sync-docs
version: 1.0.0
preamble-tier: 1
description: |
  Sync all documentation with reality. Discovers every markdown file in the project,
  cross-references against current code state, and updates anything stale. Works
  post-session, post-feature, or anytime docs drift from code. Unlike /document-release,
  this is not tied to shipping — no branch diff, no PR body, no CHANGELOG ceremony.
  Use when asked to "sync docs", "update docs", "update all documentation",
  "docs are stale", or at the end of a work session. (gstack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
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
echo '{"skill":"sync-docs","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
~/.claude/skills/gstack/bin/gstack-timeline-log '{"skill":"sync-docs","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
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

# Sync Docs: Update All Documentation to Match Reality

You are running the `/sync-docs` workflow. Your job: find every documentation file in
the project and make sure it matches the current state of the code. This is not tied
to a specific branch, PR, or ship event — it works anytime.

You are mostly automated. Make obvious factual updates directly. Stop and ask only for
risky or subjective decisions.

**Only stop for:**
- Narrative or philosophical changes (project positioning, design rationale)
- Removing sections or large rewrites (more than ~10 lines in one section)
- Ambiguous situations where you're not sure what the doc *should* say
- New documentation files that should be created

**Never stop for:**
- Factual corrections clearly visible in the code (paths, counts, command names)
- Adding items to tables or lists to match what exists
- Fixing stale cross-references or broken internal links
- Updating project structure trees
- Removing references to files/features that no longer exist

---

## Step 1: Discover All Documentation

Find every markdown file in the project, excluding generated output and dependencies:

```bash
find . -name "*.md" \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./vendor/*" \
  -not -path "./dist/*" \
  -not -path "./.gstack/*" \
  -not -path "./.context/*" \
  | sort
```

Also check for other common doc formats:

```bash
find . -maxdepth 2 \( -name "*.rst" -o -name "*.txt" -name "*.adoc" \) \
  -not -path "./.git/*" -not -path "./node_modules/*" \
  | sort
```

**Classify each file into one of these buckets:**

1. **Project docs** — README, CLAUDE.md, ARCHITECTURE, CONTRIBUTING, etc. These describe
   how the project works and how to use it. Always audit these.
2. **Feature/module docs** — docs inside subdirectories that describe a specific feature,
   API, or subsystem (e.g., `docs/prompt-guide.md`, `genre-templates/README.md`). Audit
   these against the code they describe.
3. **Reference material** — Content files, notes, specs, or captured knowledge that describe
   external things (not the code itself). Examples: editorial notes, meeting notes, research.
   Skip these — they are not meant to track the codebase.
4. **Generated docs** — Output from build tools, auto-generated indexes, API docs from
   code comments. Skip these — they should be regenerated, not hand-edited.
5. **AI context files** — `.ai-codex/`, codebase indexes, context files for AI tools.
   Audit these — stale AI context is actively harmful.

Output your classification:

```
Found N markdown files:
  Project docs (K):    README.md, CLAUDE.md, ...
  Feature docs (M):    docs/usage-guide.md, ...
  Reference (R):       goodch3/calibration.md, ... [skipping]
  Generated (G):       ... [skipping]
  AI context (A):      .ai-codex/INDEX.md, ...
```

If unsure whether a file is reference material or a feature doc, read its first 20 lines
to determine its purpose. Reference material talks about external concepts; feature docs
talk about how this codebase works.

---

## Step 2: Gather Current Code State

Build a picture of what the project actually looks like right now. This is your source
of truth — documentation must match this, not vice versa.

```bash
# Project structure (top 3 levels)
find . -maxdepth 3 -type f \
  -not -path "./.git/*" \
  -not -path "./node_modules/*" \
  -not -path "./vendor/*" \
  -not -path "./dist/*" \
  -not -path "./output/*" \
  | head -200
```

Check for project config that reveals commands and structure:

```bash
# Package manager scripts
cat package.json 2>/dev/null | head -60
cat Makefile 2>/dev/null | head -40
cat composer.json 2>/dev/null | head -40
cat Cargo.toml 2>/dev/null | head -40
cat pyproject.toml 2>/dev/null | head -40
```

Also look at recent changes to understand what might have drifted:

```bash
git log --oneline -20
```

---

## Step 3: Audit Each Documentation File

For each file in the "Project docs", "Feature docs", and "AI context" buckets:

1. **Read the file** in full.
2. **Cross-reference against reality.** For each claim the doc makes, check:
   - Does this file/directory still exist?
   - Does this command still work? (Check package.json, Makefile, etc.)
   - Are these counts/lists still accurate?
   - Are code examples still valid?
   - Do cross-references to other docs point to files that exist?
3. **Classify each needed update** as auto-update or ask-user (using the rules above).

**Common staleness patterns to watch for:**

- **File trees** that list files/directories that don't exist or miss new ones
- **Command references** that don't match the actual scripts in package.json/Makefile
- **Feature lists** that are missing recently added features
- **"Coming soon"** items that have actually been built
- **Removed features** still described in docs
- **Config instructions** that reference old env vars, old flags, or old file paths
- **Counts** ("we have 12 endpoints") that have changed
- **Internal links** to docs that were renamed or moved

---

## Step 4: Apply Updates

Make all clear, factual updates directly using the Edit tool. For each edit, output a
one-line summary:

```
  CLAUDE.md:           Updated project structure tree (added docs/ subdirectory)
  README.md:           Fixed command — `npm test` changed to `bun test`
  docs/usage-guide.md: Removed reference to deleted config option --legacy-mode
  .ai-codex/routes.md: Added 3 new API routes, removed 2 deprecated ones
```

**Batch related edits per file** — don't make 10 separate Edit calls on the same file
when you can make 2-3 larger ones.

For ask-user items, collect them all and present them together:

> I found 3 changes that need your input:
>
> 1. **README.md** — The "Philosophy" section mentions "we prioritize X over Y" but the
>    code now does both. Should I update the framing or leave it?
> 2. **docs/prompt-guide.md** — This file describes a workflow that no longer exists in
>    the code. Remove the file, or update it to describe the current workflow?
> 3. **CLAUDE.md** — Should I add a section documenting the new `/generate` command?

Wait for answers, then apply.

---

## Step 5: Discoverability Check

After updating individual files, verify that every doc is reachable:

1. Read README.md and CLAUDE.md (the two entry points).
2. For each doc file in the project, check if it's linked from at least one of:
   - README.md
   - CLAUDE.md
   - Another doc that IS linked from README or CLAUDE.md
3. Flag any orphaned docs — files that exist but aren't discoverable from any entry point.

For orphaned docs, suggest where to add a link. Auto-add if it's clearly the right place
(e.g., a `docs/` file that should be in a "Documentation" section of README). Ask if
the placement is ambiguous.

---

## Step 6: Report

Output a scannable summary of everything:

```
Documentation sync complete.

  Files audited:    N
  Files updated:    M
  Files skipped:    R (reference/generated)
  Files current:    K (no changes needed)

  Changes made:
    CLAUDE.md           — Updated project structure, added new commands
    README.md           — Fixed install instructions, updated feature list
    docs/usage-guide.md — Removed stale config reference
    .ai-codex/INDEX.md  — Regenerated module index

  Still needs attention:
    docs/old-api.md     — Describes removed API; user chose to keep for now
```

If there are unstaged changes, remind: "Changes are unstaged. Review with `git diff`
and commit when ready."

---

## Important Rules

- **Read before editing.** Always read the full content of a file before modifying it.
- **Reality wins.** If the code says one thing and the docs say another, the code is right.
- **Don't create docs.** This skill updates existing documentation. If a major new feature
  has zero docs, flag it and ask if you should create a new file — but default to no.
- **Don't touch content files.** Reference material, notes, specs, editorial content — these
  describe the world, not the codebase. Leave them alone.
- **Be explicit about what changed.** Every edit gets a one-line summary in the report.
- **Preserve voice.** Match the existing tone of each document. A casual README stays casual.
  A formal architecture doc stays formal. Don't homogenize.
