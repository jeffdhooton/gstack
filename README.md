# gstack

A complete AI engineering workflow for Claude Code. Slash commands, structured roles, real tools — then get out of the way.

gstack turns Claude Code into a team: a product thinker who challenges your assumptions, an architect who locks down the plan, a builder that routes to parallel agents or executes in-session, a reviewer that runs your actual linters before layering LLM judgment, a QA lead that opens a real browser, a security officer that runs deterministic SAST before OWASP analysis, and a release engineer that ships the PR.

Created and maintained by [Jeff Hooton](https://github.com/jeffdhooton).

**Who this is for:**
- **Solo builders and small teams (1-3 people)** — ship like a team of twenty
- **First-time Claude Code users** — structured roles instead of a blank prompt
- **Anyone tired of AI reviewing its own homework** — deterministic tools first, LLM judgment second

## Quick start

1. Install gstack (30 seconds — see below)
2. Run `/office-hours` — describe what you're building
3. Run `/plan-ceo-review` on any feature idea
4. Run `/review` on any branch with changes
5. Run `/qa` on your staging URL
6. Stop there. You'll know if this is for you.

## Install — 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+, [Node.js](https://nodejs.org/) (Windows only)

### Step 1: Install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install gstack: run **`git clone --single-branch --depth 1 https://github.com/jeffdhooton/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`** then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-ref, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /qa-backend, /test-gen, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /env-sync, /deps, /autoplan, /build, /orch, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn, /notetaker, /index, /inbox, /pair, /checkpoint, /health, /perf. Then ask the user if they also want to add gstack to the current project so teammates get it.

### Step 2: Add to your repo so teammates get it (optional)

> Add gstack to this project: run **`cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup`** then add a "gstack" section to this project's CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-ref, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /qa-backend, /test-gen, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /env-sync, /deps, /autoplan, /build, /orch, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn, /pair, /checkpoint, /health, /perf, and tells Claude that if gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

Real files get committed to your repo (not a submodule), so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

> **Contributing or need full history?** The commands above use `--depth 1` for a fast install. If you plan to contribute or need full git history, do a full clone instead:
> ```bash
> git clone https://github.com/jeffdhooton/gstack.git ~/.claude/skills/gstack
> ```

### Codex, Gemini CLI, or Cursor

gstack works on any agent that supports the [SKILL.md standard](https://github.com/anthropics/claude-code). Skills live in `.agents/skills/` and are discovered automatically.

Install to one repo:

```bash
git clone --single-branch --depth 1 https://github.com/jeffdhooton/gstack.git .agents/skills/gstack
cd .agents/skills/gstack && ./setup --host codex
```

When setup runs from `.agents/skills/gstack`, it installs the generated Codex skills next to it in the same repo and does not write to `~/.codex/skills`.

Install once for your user account:

```bash
git clone --single-branch --depth 1 https://github.com/jeffdhooton/gstack.git ~/gstack
cd ~/gstack && ./setup --host codex
```

`setup --host codex` creates the runtime root at `~/.codex/skills/gstack` and
links the generated Codex skills at the top level. This avoids duplicate skill
discovery from the source repo checkout.

Or let setup auto-detect which agents you have installed:

```bash
git clone --single-branch --depth 1 https://github.com/jeffdhooton/gstack.git ~/gstack
cd ~/gstack && ./setup --host auto
```

For Codex-compatible hosts, setup now supports both repo-local installs from `.agents/skills/gstack` and user-global installs from `~/.codex/skills/gstack`. All 31 skills work across all supported agents. Hook-based safety skills (careful, freeze, guard) use inline safety advisory prose on non-Claude hosts.

### Factory Droid

gstack works with [Factory Droid](https://factory.ai). Skills install to `.factory/skills/` and are discovered automatically. Sensitive skills (ship, land-and-deploy, guard) use `disable-model-invocation: true` so Droids don't auto-invoke them.

```bash
git clone --single-branch --depth 1 https://github.com/jeffdhooton/gstack.git ~/gstack
cd ~/gstack && ./setup --host factory
```

Skills install to `~/.factory/skills/gstack-*/`. Restart `droid` to rescan skills, then type `/qa` to get started.

## See it work

```
You:    I want to build a daily briefing app for my calendar.
You:    /office-hours
Claude: [asks about the pain — specific examples, not hypotheticals]

You:    Multiple Google calendars, events with stale info, wrong locations.
        Prep takes forever and the results aren't good enough...

Claude: I'm going to push back on the framing. You said "daily briefing
        app." But what you actually described is a personal chief of
        staff AI.
        [extracts 5 capabilities you didn't realize you were describing]
        [challenges 4 premises — you agree, disagree, or adjust]
        [generates 3 implementation approaches with effort estimates]
        RECOMMENDATION: Ship the narrowest wedge tomorrow, learn from
        real usage. The full vision is a 3-month project — start with
        the daily briefing that actually works.
        [writes design doc → feeds into downstream skills automatically]

You:    /plan-ceo-review
        [reads the design doc, challenges scope, runs 10-section review]

You:    /plan-eng-review
        [ASCII diagrams for data flow, state machines, error paths]
        [test matrix, failure modes, security concerns]

You:    Approve plan. Exit plan mode.

You:    /build
        [analyzes plan: 3 independent modules, routes to in-session]
        [implements 2,400 lines across 11 files, runs tests at each step]
        BUILD COMPLETE: 11/11 steps, tests PASS, lint CLEAN

You:    /review
        [AUTO-FIXED] 2 issues. [ASK] Race condition → you approve fix.

You:    /qa https://staging.myapp.com
        [opens real browser, clicks through flows, finds and fixes a bug]

You:    /ship
        Tests: 42 → 51 (+9 new). PR: github.com/you/app/pull/42
```

You said "daily briefing app." The agent said "you're building a chief of staff AI" — because it listened to your pain, not your feature request. Nine commands, end to end. That is not a copilot. That is a team.

## The sprint

gstack is a process, not a collection of tools. The skills run in the order a sprint runs:

**Think → Plan → Build → Review → Test → Ship → Reflect**

Each skill feeds into the next. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/build` picks up. `/build` analyzes the plan and either builds in-session or routes to `/orch` for parallel multi-agent execution. `/review` runs your linters first, then layers LLM judgment. `/ship` verifies everything is clean. Nothing falls through the cracks because every step knows what came before it.

| Skill | Your specialist | What they do |
|-------|----------------|--------------|
| `/office-hours` | **Office Hours** | Start here. Six forcing questions that reframe your product before you write code. Pushes back on your framing, challenges premises, generates implementation alternatives. Design doc feeds into every downstream skill. |
| `/plan-ceo-review` | **CEO / Founder** | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. |
| `/plan-eng-review` | **Eng Manager** | Lock in architecture, data flow, diagrams, edge cases, and tests. Forces hidden assumptions into the open. |
| `/plan-design-review` | **Senior Designer** | Rates each design dimension 0-10, explains what a 10 looks like, then edits the plan to get there. AI Slop detection. Interactive — one AskUserQuestion per design choice. |
| `/design-consultation` | **Design Partner** | Build a complete design system from scratch. Researches the landscape, proposes creative risks, generates realistic product mockups. |
| `/design-ref` | **Brand Librarian** | Load design systems from 55+ companies (Stripe, Airbnb, Apple, Linear, Figma, Notion, etc.) as DESIGN.md references. Fetch, cache, preview, and apply professional design tokens to your project. |
| `/build` | **Lead Engineer** | The missing middle. Analyzes your plan, decides whether to route to /orch (parallel multi-agent) or build in-session (sequential), then executes. Auto-detects build/test/lint commands. Implements, tests, iterates until green. |
| `/orch` | **Engineering Manager** | Multi-agent orchestration. Spins up parallel Claude Code instances via tmux for independent workstreams. Backend + frontend + tests all building at once. |
| `/review` | **Staff Engineer** | Find the bugs that pass CI but blow up in production. Runs your project's linters and SAST tools first (ESLint, Semgrep, ruff, Brakeman, etc.), then layers LLM judgment on top for what tools can't catch. Auto-fixes the obvious ones. |
| `/investigate` | **Debugger** | Systematic root-cause debugging. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, stops after 3 failed fixes. |
| `/design-review` | **Designer Who Codes** | Same audit as /plan-design-review, then fixes what it finds. Atomic commits, before/after screenshots. |
| `/design-shotgun` | **Design Explorer** | "Show me options." Generates 4-6 AI mockup variants, opens a comparison board in your browser, collects your feedback, and iterates. Taste memory learns what you like. Repeat until you love something, then hand it to `/design-html`. |
| `/design-html` | **Design Engineer** | Turn a mockup into production HTML that actually works. Pretext computed layout: text reflows, heights adjust, layouts are dynamic. 30KB, zero deps. Detects React/Svelte/Vue. Smart API routing per design type (landing page vs dashboard vs form). The output is shippable, not a demo. |
| `/qa` | **QA Lead** | Test your app, find bugs, fix them with atomic commits, re-verify. Auto-generates regression tests for every fix. |
| `/qa-only` | **QA Reporter** | Same methodology as /qa but report only. Pure bug report without code changes. |
| `/qa-backend` | **Backend QA** | API contract testing, database health, slow query profiling, auth boundary verification. For when /qa (browser) is overkill. |
| `/test-gen` | **Test Writer** | Reads your existing tests to learn the project's style, finds uncovered code, generates matching tests. Prioritizes by risk. |
| `/pair-agent` | **Multi-Agent Coordinator** | Share your browser with any AI agent. One command, one paste, connected. Works with OpenClaw, Hermes, Codex, Cursor, or anything that can curl. Each agent gets its own tab. Auto-launches headed mode so you watch everything. Auto-starts ngrok tunnel for remote agents. Scoped tokens, tab isolation, rate limiting, activity attribution. |
| `/cso` | **Chief Security Officer** | OWASP Top 10 + STRIDE threat model. Runs deterministic SAST tools first (bandit, gosec, Semgrep, etc.), then layers LLM analysis. Zero-noise: 17 false positive exclusions, 8/10+ confidence gate. Each finding includes a concrete exploit scenario. |
| `/env-sync` | **Env Auditor** | Finds env vars used in code but missing from .env.example, and stale vars nobody references. Works with any framework. |
| `/deps` | **Dependency Auditor** | Vulnerability scan, outdated packages, unused deps, license audit. Wraps npm/composer/bundle/pip/go/cargo audit tools. |
| `/ship` | **Release Engineer** | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if you don't have one. |
| `/land-and-deploy` | **Release Engineer** | Merge the PR, wait for CI and deploy, verify production health. One command from "approved" to "verified in production." |
| `/canary` | **SRE** | Post-deploy monitoring loop. Watches for console errors, performance regressions, and page failures. |
| `/benchmark` | **Performance Engineer** | Baseline page load times, Core Web Vitals, and resource sizes. Compare before/after on every PR. |
| `/perf` | **Performance Profiler** | Profile response times, database queries, memory, CPU hotspots, and bundle sizes. Framework-agnostic — works with Node.js, PHP, Python, Go, Rust, Ruby. |
| `/health` | **Code Quality Dashboard** | Wraps your type checker, linter, test runner, dead code detector. Weighted 0-10 score with trends over time. |
| `/document-release` | **Technical Writer** | Update all project docs to match what you just shipped. Catches stale READMEs automatically. |
| `/retro` | **Eng Manager** | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. `/retro global` runs across all your projects and AI tools (Claude Code, Codex, Gemini). |
| `/browse` | **QA Engineer** | Give the agent eyes. Real Chromium browser, real clicks, real screenshots. ~100ms per command. `/open-gstack-browser` launches GStack Browser with sidebar, anti-bot stealth, and auto model routing. |
| `/setup-browser-cookies` | **Session Manager** | Import cookies from your real browser (Chrome, Arc, Brave, Edge) into the headless session. Test authenticated pages. |
| `/autoplan` | **Review Pipeline** | One command, fully reviewed plan. Runs CEO → design → eng review automatically with encoded decision principles. Surfaces only taste decisions for your approval. |
| `/learn` | **Memory** | Manage what gstack learned across sessions. Review, search, prune, and export project-specific patterns, pitfalls, and preferences. Learnings compound across sessions so gstack gets smarter on your codebase over time. |
| `/notetaker` | **Workflow Observer** | Silently journals every tool call via a global PostToolUse hook. Run `/notetaker patterns` to spot repeatable workflows across sessions, then `/notetaker draft` to generate a complete, ready-to-use skill from an observed pattern — full body, steps, analytics, symlink, done. `/learn` captures facts; `/notetaker` captures workflows. |
| `/index` | **Codebase Cartographer** | Generate a compact codebase index that replaces 50K+ tokens of exploration per conversation. Auto-detects any framework (Laravel, Rails, Next.js, Django, Go, Rust, etc.) and maps routes, models, lib exports, pages, components, and config into small `.ai-codex/` reference files. Updates CLAUDE.md so every future session loads the index automatically. Auto-installs a git pre-commit hook to keep the index fresh. |
| `/inbox` | **Session Coordinator** | Cross-session messaging. Send messages between concurrent Claude Code sessions — completion notifications, work handoffs, questions, status checks. Structured message types (`unblock`, `handoff`, `question`, `info`) tell the receiver what to do. Target specific projects or broadcast to all. Work claims prevent double-booking. |

### Power tools

| Skill | What it does |
|-------|-------------|
| `/codex` | **Second Opinion** — independent code review from OpenAI Codex CLI. Three modes: review (pass/fail gate), adversarial challenge, and open consultation. Cross-model analysis when both `/review` and `/codex` have run. |
| `/pair` | **Pair Programmer** — two CC sessions, one task. Driver writes code, navigator reviews in real-time via /inbox. Structured handoffs prevent conflicts. |
| `/checkpoint` | **Progress Saver** — save and resume working state. Captures git state, decisions, and remaining work so you can pick up where you left off. |
| `/careful` | **Safety Guardrails** — warns before destructive commands (rm -rf, DROP TABLE, force-push). Say "be careful" to activate. Override any warning. |
| `/freeze` | **Edit Lock** — restrict file edits to one directory. Prevents accidental changes outside scope while debugging. |
| `/guard` | **Full Safety** — `/careful` + `/freeze` in one command. Maximum safety for prod work. |
| `/unfreeze` | **Unlock** — remove the `/freeze` boundary. |
| `/open-gstack-browser` | **GStack Browser** — launch GStack Browser with sidebar, anti-bot stealth, auto model routing (Sonnet for actions, Opus for analysis), one-click cookie import, and Claude Code integration. Clean up pages, take smart screenshots, edit CSS, and pass info back to your terminal. |
| `/setup-deploy` | **Deploy Configurator** — one-time setup for `/land-and-deploy`. Detects your platform, production URL, and deploy commands. |
| `/gstack-upgrade` | **Self-Updater** — upgrade gstack to latest. Detects global vs vendored install, syncs both, shows what changed. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## Key features

**Deterministic + probabilistic review.** `/review` runs your project's actual linters and SAST tools first (ESLint, Semgrep, ruff, Brakeman, gosec, etc.), then layers LLM judgment on top for what static analysis can't catch — architectural issues, race conditions, business logic errors. `/cso` does the same for security audits. No more AI reviewing its own homework without ground truth.

**Plan-to-code pipeline.** `/build` reads your plan, analyzes whether the work is parallelizable, and either routes to `/orch` (multi-agent via tmux) or builds in-session. Auto-detects build/test/lint commands. Implements step by step, tests at checkpoints, iterates until green.

**Design is at the heart.** `/design-consultation` builds your design system from scratch, researches what's out there, proposes creative risks, and writes `DESIGN.md`. But the real magic is the shotgun-to-HTML pipeline.

**`/design-shotgun` is how you explore.** You describe what you want. It generates 4-6 AI mockup variants using GPT Image. Then it opens a comparison board in your browser with all variants side by side. You pick favorites, leave feedback ("more whitespace", "bolder headline", "lose the gradient"), and it generates a new round. Repeat until you love something. Taste memory kicks in after a few rounds so it starts biasing toward what you actually like. No more describing your vision in words and hoping the AI gets it. You see options, pick the good ones, and iterate visually.

**`/design-html` makes it real.** Take that approved mockup (from `/design-shotgun`, a CEO plan, a design review, or just a description) and turn it into production-quality HTML/CSS. Not the kind of AI HTML that looks fine at one viewport width and breaks everywhere else. This uses Pretext for computed text layout: text actually reflows on resize, heights adjust to content, layouts are dynamic. 30KB overhead, zero dependencies. It detects your framework (React, Svelte, Vue) and outputs the right format. Smart API routing picks different Pretext patterns depending on whether it's a landing page, dashboard, form, or card layout. The output is something you'd actually ship, not a demo.

**Real browser testing.** `/qa` opens a real Chromium browser, clicks through flows, finds bugs, fixes them with atomic commits, and generates regression tests. `$B connect` launches your actual Chrome as a headed window — watch every action live.

**Smart review routing.** gstack tracks what reviews have been run, figures out what's appropriate for the diff, and routes accordingly. The Review Readiness Dashboard shows where you stand before you ship.

**Multi-AI second opinion.** `/codex` gets an independent review from OpenAI's Codex CLI. When both `/review` (Claude) and `/codex` (OpenAI) have reviewed the same branch, you get a cross-model analysis showing which findings overlap and which are unique to each.

**Safety guardrails on demand.** `/careful` warns before destructive commands. `/freeze` locks edits to one directory. `/guard` activates both. `/investigate` auto-freezes to the module being investigated.

**Real browser mode.** `/open-gstack-browser` launches GStack Browser, an AI-controlled Chromium with anti-bot stealth, custom branding, and the sidebar extension baked in. Sites like Google and NYTimes work without captchas. The menu bar says "GStack Browser" instead of "Chrome for Testing." Your regular Chrome stays untouched. All existing browse commands work unchanged. `$B disconnect` returns to headless. The browser stays alive as long as the window is open... no idle timeout killing it while you're working.

**Codebase index.** `/index` generates compact reference files (routes, models, pages, components, lib exports, config) that replace 50K+ tokens of AI exploration per conversation. Works with any framework. A standalone `gstack-reindex` script keeps the index fresh via git pre-commit hook — zero cost, ~1s.

**Sidebar agent — your AI browser assistant.** Type natural language in the Chrome side panel and a child Claude instance executes it. "Navigate to the settings page and screenshot it." "Fill out this form with test data." "Go through every item in this list and extract the prices." The sidebar auto-routes to the right model: Sonnet for fast actions (click, navigate, screenshot) and Opus for reading and analysis. Each task gets up to 5 minutes. The sidebar agent runs in an isolated session, so it won't interfere with your main Claude Code window. One-click cookie import right from the sidebar footer.

**Cross-session messaging.** `/inbox` lets concurrent Claude Code sessions talk to each other. Structured message types (`unblock`, `handoff`, `question`, `info`) with project-level targeting. A PreToolUse hook surfaces new messages inline so sessions never miss a notification. Work claims prevent double-booking.

**Personal automation.** The sidebar agent isn't just for dev workflows. Example: "Browse my kid's school parent portal and add all the other parents' names, phone numbers, and photos to my Google Contacts." Two ways to get authenticated: (1) log in once in the headed browser, your session persists, or (2) click the "cookies" button in the sidebar footer to import cookies from your real Chrome. Once authenticated, Claude navigates the directory, extracts the data, and creates the contacts.

**Performance profiling.** `/perf` profiles response times, database queries, memory, CPU, and bundle sizes across any framework.

**Pair programming.** `/pair` coordinates two Claude Code sessions on the same task — one drives, one reviews in real-time via `/inbox`.

**`/pair-agent` is cross-agent coordination.** You're in Claude Code. You also have OpenClaw running. Or Hermes. Or Codex. You want them both looking at the same website. Type `/pair-agent`, pick your agent, and a GStack Browser window opens so you can watch. The skill prints a block of instructions. Paste that block into the other agent's chat. It exchanges a one-time setup key for a session token, creates its own tab, and starts browsing. You see both agents working in the same browser, each in their own tab, neither able to interfere with the other. If ngrok is installed, the tunnel starts automatically so the other agent can be on a completely different machine. Same-machine agents get a zero-friction shortcut that writes credentials directly. This is the first time AI agents from different vendors can coordinate through a shared browser with real security: scoped tokens, tab isolation, rate limiting, domain restrictions, and activity attribution.

**Brand design library.** `/design-ref` loads design systems from 55+ companies (Stripe, Airbnb, Apple, Linear, Figma, etc.) as DESIGN.md references. Pick a brand, apply its tokens to your project, and every design skill uses them automatically.

## Parallel execution

The sprint structure is what makes parallelism work. Without a process, ten agents is ten sources of chaos. With a process — think, plan, build, review, test, ship — each agent knows exactly what to do and when to stop.

`/orch` spins up parallel Claude Code instances via tmux for independent workstreams. `/build` automatically routes to `/orch` when it detects parallelizable work. [Conductor](https://conductor.build) can run multiple full sprints in parallel across isolated workspaces.

## Uninstall

### Option 1: Run the uninstall script

If gstack is installed on your machine:

```bash
~/.claude/skills/gstack/bin/gstack-uninstall
```

This handles skills, symlinks, global state (`~/.gstack/`), project-local state, browse daemons, and temp files. Use `--keep-state` to preserve config and analytics. Use `--force` to skip confirmation.

### Option 2: Manual removal (no local repo)

If you don't have the repo cloned (e.g. you installed via a Claude Code paste and later deleted the clone):

```bash
# 1. Stop browse daemons
pkill -f "gstack.*browse" 2>/dev/null || true

# 2. Remove per-skill symlinks pointing into gstack/
find ~/.claude/skills -maxdepth 1 -type l 2>/dev/null | while read -r link; do
  case "$(readlink "$link" 2>/dev/null)" in gstack/*|*/gstack/*) rm -f "$link" ;; esac
done

# 3. Remove gstack
rm -rf ~/.claude/skills/gstack

# 4. Remove global state
rm -rf ~/.gstack

# 5. Remove integrations (skip any you never installed)
rm -rf ~/.codex/skills/gstack* 2>/dev/null
rm -rf ~/.factory/skills/gstack* 2>/dev/null
rm -rf ~/.kiro/skills/gstack* 2>/dev/null
rm -rf ~/.openclaw/skills/gstack* 2>/dev/null

# 6. Remove temp files
rm -f /tmp/gstack-* 2>/dev/null

# 7. Per-project cleanup (run from each project root)
rm -rf .gstack .gstack-worktrees .claude/skills/gstack 2>/dev/null
rm -rf .agents/skills/gstack* .factory/skills/gstack* 2>/dev/null
```

### Clean up CLAUDE.md

The uninstall script does not edit CLAUDE.md. In each project where gstack was added, remove the `## gstack` and `## Skill routing` sections.

### Playwright

`~/Library/Caches/ms-playwright/` (macOS) is left in place because other tools may share it. Remove it if nothing else needs it.

---

Free, MIT licensed, open source. No premium tier, no waitlist.

## Docs

| Doc | What it covers |
|-----|---------------|
| [Skill Deep Dives](docs/skills.md) | Philosophy, examples, and workflow for every skill (includes Greptile integration) |
| [Builder Ethos](ETHOS.md) | Builder philosophy: Boil the Lake, Search Before Building, three layers of knowledge |
| [Architecture](ARCHITECTURE.md) | Design decisions and system internals |
| [Browser Reference](BROWSER.md) | Full command reference for `/browse` |
| [Contributing](CONTRIBUTING.md) | Dev setup, testing, contributor mode, and dev mode |
| [Changelog](CHANGELOG.md) | What's new in every version |

## Privacy & Telemetry

gstack includes **opt-in** usage telemetry to help improve the project. Here's exactly what happens:

- **Default is off.** Nothing is sent anywhere unless you explicitly say yes.
- **On first run,** gstack asks if you want to share anonymous usage data. You can say no.
- **What's sent (if you opt in):** skill name, duration, success/fail, gstack version, OS. That's it.
- **What's never sent:** code, file paths, repo names, branch names, prompts, or any user-generated content.
- **Change anytime:** `gstack-config set telemetry off` disables everything instantly.

Data is stored in [Supabase](https://supabase.com) (open source Firebase alternative). The schema is in [`supabase/migrations/`](supabase/migrations/) — you can verify exactly what's collected. The Supabase publishable key in the repo is a public key (like a Firebase API key) — row-level security policies deny all direct access. Telemetry flows through validated edge functions that enforce schema checks, event type allowlists, and field length limits.

**Local analytics are always available.** Run `gstack-analytics` to see your personal usage dashboard from the local JSONL file — no remote data needed.

## Troubleshooting

**Skill not showing up?** `cd ~/.claude/skills/gstack && ./setup`

**`/browse` fails?** `cd ~/.claude/skills/gstack && bun install && bun run build`

**Stale install?** Run `/gstack-upgrade` — or set `auto_upgrade: true` in `~/.gstack/config.yaml`

**Want shorter commands?** `cd ~/.claude/skills/gstack && ./setup --no-prefix` — switches from `/gstack-qa` to `/qa`. Your choice is remembered for future upgrades.

**Want namespaced commands?** `cd ~/.claude/skills/gstack && ./setup --prefix` — switches from `/qa` to `/gstack-qa`. Useful if you run other skill packs alongside gstack.

**Codex says "Skipped loading skill(s) due to invalid SKILL.md"?** Your Codex skill descriptions are stale. Fix: `cd ~/.codex/skills/gstack && git pull && ./setup --host codex` — or for repo-local installs: `cd "$(readlink -f .agents/skills/gstack)" && git pull && ./setup --host codex`

**Windows users:** gstack works on Windows 11 via Git Bash or WSL. Node.js is required in addition to Bun — Bun has a known bug with Playwright's pipe transport on Windows ([bun#4253](https://github.com/oven-sh/bun/issues/4253)). The browse server automatically falls back to Node.js. Make sure both `bun` and `node` are on your PATH.

**Claude says it can't see the skills?** Make sure your project's `CLAUDE.md` has a gstack section. Add this:

```
## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /design-ref, /design-shotgun, /design-html, /review, /ship, /land-and-deploy,
/canary, /benchmark, /browse, /open-gstack-browser, /qa, /qa-only, /qa-backend, /test-gen,
/design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate,
/document-release, /codex, /cso, /env-sync, /deps, /autoplan, /build, /orch, /pair-agent,
/careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn, /notetaker, /index, /inbox, /pair,
/checkpoint, /health, /perf.
```

## License

MIT. Free forever. Go build something.
