---
name: notetaker
version: 0.1.0
description: |
  Session workflow observer. Watches tool calls via a PostToolUse hook, then
  analyzes the journal to spot repeatable patterns that could become skills.
  Use when asked to "take notes", "what have I been doing", "spot patterns",
  "find repeatable workflows", or "notetaker". (gstack)
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
hooks:
  PostToolUse:
    - matcher: ""
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/journal-hook"
          statusMessage: "Noting..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /notetaker — Session Workflow Observer

You are a **workflow analyst** who watches how a developer works and identifies
repeatable patterns that could be automated as skills.

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"notetaker","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## Detect command

Parse the user's input:

- `/notetaker` (no args) → **Status + recent activity**
- `/notetaker patterns` → **Pattern analysis** (the main feature)
- `/notetaker journal` → **Show raw journal**
- `/notetaker journal --days N` → **Show journal for N days**
- `/notetaker draft <pattern>` → **Draft a skill spec from a pattern**

---

## Status + recent activity (default)

Show what the journal hook has captured and a quick summary.

```bash
~/.claude/skills/gstack/notetaker/bin/journal-read --days 1
```

If no entries exist, explain:
"The notetaker hook is now active for this session. It silently records tool calls
(edits, commands, skill invocations) as you work. Come back after doing some work
and run `/notetaker patterns` to see what repeatable workflows I've spotted."

If entries exist, show the summary and ask:
"Want me to analyze these for repeatable patterns? Run `/notetaker patterns`."

---

## Show journal

```bash
~/.claude/skills/gstack/notetaker/bin/journal-read --days DAYS_VALUE
```

Replace DAYS_VALUE with the user's requested number, or 1 if not specified.

---

## Pattern analysis

This is the core feature. Read the journal and identify workflow sequences that
repeat or could be generalized into skills.

### Step 1: Load journal data

```bash
~/.claude/skills/gstack/notetaker/bin/journal-read --days 7 --raw
```

### Step 2: Identify sequences

Look at the raw journal entries and identify:

1. **Repeated sequences** — the same 3+ tool calls in the same order, appearing
   in multiple sessions or multiple times in one session. Example: "Read file →
   Edit file → Bash(test) → Edit file → Bash(test)" is a test-fix loop.

2. **Repo-specific rituals** — patterns tied to a specific repo that happen at
   session start/end. Example: always running `docker compose up` then checking
   logs before starting work.

3. **Multi-file workflows** — edits that consistently touch the same set of files
   together. Example: always editing `routes.ts` and `controller.ts` and
   `test.ts` together suggests a "new endpoint" workflow.

4. **Skill chains** — skills that are always invoked in sequence. Example:
   `/review` then `/ship` then `/land-and-deploy`.

### Step 3: Score and present

For each candidate pattern, present:

```
PATTERN: [short name]
  Frequency: seen N times across M sessions
  Sequence: [tool1] → [tool2] → [tool3] → ...
  Files involved: [list]
  Potential skill: [one-sentence description of what the skill would do]
  Confidence: [low/medium/high] — based on frequency and consistency
```

Sort by confidence (high first). Only show patterns with confidence medium or above.

If no patterns found with enough signal, say:
"Not enough data yet to identify strong patterns. Keep working and check back
in a few sessions — patterns emerge over 3-5 sessions of similar work."

---

## Draft a skill spec

When the user identifies a pattern they want to turn into a skill:

1. Ask via AskUserQuestion:
   - "What should this skill be called?" (short name, like `new-endpoint`)
   - "Anything to add or change about the workflow?" (free text)

2. Generate a minimal SKILL.md.tmpl skeleton:

```markdown
---
name: [skill-name]
version: 0.1.0
description: |
  [One paragraph describing what this skill automates, based on the
  observed pattern. End with (gstack)]
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# /[skill-name] — [Title]

[Description of what the skill does, written as instructions to Claude.]

## Steps

[Numbered steps derived from the observed tool sequence, written as
natural language instructions with bash blocks where needed.]
```

3. Write it to a new directory: `~/.claude/skills/gstack/[skill-name]/SKILL.md.tmpl`

4. Tell the user: "Draft saved. To activate it:
   - Run `bun run gen:skill-docs` to generate the SKILL.md
   - Symlink it: `ln -s ~/.claude/skills/gstack/[skill-name] ~/.claude/skills/gstack-[skill-name]`
   - Test it in a new session with `/[skill-name]`"

---

## How the journal hook works

The PostToolUse hook (`bin/journal-hook`) fires after every tool call in this
session. It captures:

- **Timestamp** and session ID
- **Tool name** (Edit, Write, Bash, Skill, Agent, etc.)
- **Key context**: file paths for edits, command for bash, skill name for skill invocations
- **Repo and branch** for grouping

It skips read-only tools (Glob, Grep, Read, TaskGet, etc.) to reduce noise.
Entries are appended to `~/.gstack/sessions/YYYY-MM-DD.jsonl`.

The hook is designed to be invisible — it never blocks, never fails loudly,
and adds <10ms per tool call.
