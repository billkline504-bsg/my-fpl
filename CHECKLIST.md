# Claude Code Project Setup Playbook

Two checklists: one for starting a brand-new project, one for dropping Claude Code into an existing codebase. The core difference is ordering — new projects plan-then-document, existing projects document-then-plan.

---

## Checklist A: Brand New Project

**Phase 1 — Frame the project (before any code)**
- [ ] Create the repo/folder, `git init`, first commit (even if just a README)
- [ ] Launch Claude Code in the directory
- [ ] Describe the goal in plain language: what it does, who it's for, constraints (language, framework, deployment target, must-haves)
- [ ] Ask Claude to propose an architecture/stack and use **plan mode** — review the plan before any code gets written, not after
- [ ] Iterate on the plan in conversation until you're both aligned (this is the cheapest place to catch bad assumptions)

**Phase 2 — Scaffold**
- [ ] Have Claude generate the initial project skeleton: folder structure, package manifest, entry point, config files
- [ ] Set up the toolchain: linter, formatter, test runner, CI config — ask Claude to wire these in now, not later
- [ ] Get one trivial thing working end-to-end (e.g., "hello world" build/run/test all pass) before adding real features
- [ ] Commit the scaffold

**Phase 3 — Formalize conventions**
- [ ] Now that there's a real codebase, run `/init` to generate a starter `CLAUDE.md`
- [ ] Edit it by hand: add naming conventions, folder responsibilities, "how to run tests," "how to run the app," any non-obvious decisions from Phase 1
- [ ] Set up `.claude/settings.json` permissions matching your comfort level (what Claude can run/edit without asking)

**Phase 4 — Add tools and workflows**
- [ ] Connect relevant MCP servers (GitHub, issue tracker, database, etc.) if the workflow needs live access to them
- [ ] Define custom slash commands for anything you'll repeat often (e.g., "run full test suite and summarize failures," "open a PR with a standard description")
- [ ] Consider a subagent for any narrow, repeated, well-scoped task (e.g., a dedicated code-review pass)

**Phase 5 — Build features**
- [ ] Per feature: plan mode first → implement → run tests → review diff → commit
- [ ] Periodically revisit `CLAUDE.md` and update it as conventions solidify or change

---

## Checklist B: Existing Project

**Phase 1 — Capture what already exists**
- [ ] `cd` into the repo, launch Claude Code
- [ ] Run `/init` immediately — Claude scans the codebase and drafts `CLAUDE.md`
- [ ] Read and correct the draft: fix anything wrong, add conventions Claude couldn't infer (business rules, deployment quirks, "why this looks weird")
- [ ] Explicitly note the test command, build command, and any dangerous areas of the codebase

**Phase 2 — Build shared understanding (read-only)**
- [ ] Ask Claude questions about the codebase without making changes — architecture, data flow, where X lives — to sanity-check its understanding before it touches anything
- [ ] Check that Claude is finding and respecting existing patterns (error handling style, testing style) rather than inventing new ones

**Phase 3 — Configure tools and permissions**
- [ ] Set `.claude/settings.json` permissions to match team risk tolerance (often stricter than a solo greenfield project)
- [ ] Connect MCP servers your workflow actually needs (issue tracker, CI status, GitHub/GitLab)
- [ ] Add slash commands for repeated team workflows (e.g., "prep a PR following our template," "run the flaky-test-prone suite twice")

**Phase 4 — Validate with a small task**
- [ ] Give Claude one small, low-risk task first (fix a minor bug, add a small test) to confirm the setup works before trusting it with anything bigger
- [ ] Review that diff closely — it tells you whether `CLAUDE.md` and permissions are tuned correctly

**Phase 5 — Normal development loop**
- [ ] Per task: plan mode first for anything non-trivial → implement → run existing tests → review diff → commit
- [ ] Update `CLAUDE.md` whenever Claude gets something wrong due to a missing convention — treat it as living documentation, not a one-time setup step

---

## Quick side-by-side

| | New project | Existing project |
|---|---|---|
| First real action | Describe goal, plan architecture | Run `/init` |
| When `CLAUDE.md` appears | After scaffold exists (Phase 3) | Immediately (Phase 1) |
| Biggest risk | Under-planning before code exists | Claude missing unwritten conventions |
| First task to try | Trivial end-to-end scaffold | Small, low-risk existing bug/feature |

Command names and available integrations can change — if anything here looks off from what you're seeing, check https://docs.claude.com/en/docs/claude-code/overview for the current docs.
