---
name: dev-team
description: >-
  Runs the Queply multi-role subagent pipeline driven by the PM role cast
  (BA, architect, PM, UI/UX, Marketer, backend-dev, frontend-dev, QA, security,
  DevOps, tech-writer, orchestrator). Use when the user says dev-team, команда,
  собери команду, feature team, or asks to orchestrate specialists for a task.
---

# Dev team

## Quick start

User: «собери команду на задачу» or `/dev-team` with the task description.

Orchestrator (parent / `/orchestrator`): follow `.cursor/rules/dev-team-orchestration.mdc` and `.cursor/agents/*`.

**Hard rule:** launch **only** roles in the PM **role cast**. Roster is a catalog — do not staff the full roster by default.

## Feature vs bug

### Feature / behavior change

1. Clarify slug/topic; `memory_smart_search` / recall prior specs.
2. If cast not yet published: run roles already needed to produce cast (usually BA then PM; architect only if already cast or user insists on staffing).
3. **PM** publishes ordered **role cast** in `agent.md` + issue handoff; creates **parent epic** + **AC child issues**; **stop** for «можно начинать?».
4. On user OK: execute **remaining cast only**, in order (`∥` when marked). Typical eng minimum: `qa write` → BE/FE → `qa verify`; optional cast slots: ui-ux ∥ marketer, security, devops, tech-writer.
5. Every Task includes `issue: #N` (parent), ownership, `AC-*`, depth S/M/L, and **handoff-meta** on every parent-issue comment. Optional `stage_issue:` = AC ticket(s) being worked, parent, or omit/`n/a`. **Do not** create `[<slug>] · <role>` stage issues.
6. No silent tech debt — deferred work → follow-up GitHub issues (`tech-debt`).
7. Closeout: AC children closed or deferred as follow-ups; close parent issue per cast; orchestrator **closeout retro** (3 bullets).

### Bug fast-path

Clear repro: short cast without BA/PM/ui-ux/marketer by default:

`qa write (regression) → owner eng → qa verify → close`

Add `security` / `tech-writer` **only** if PM/orchestrator put them in cast. Still require issue `#N` + handoff-meta when using the ticket flow.

## Staffing heuristics (for PM — not auto-launch)

| Role | Consider including when |
| --- | --- |
| architect | Cross-layer API+DB+events+packages; new module boundaries; BE/FE/packages dispute |
| security | Auth/oauth/webhooks/PII/payments/secrets/new public endpoints |
| tech-writer | Public API, env, ops steps, or CODEMAP-touched modules changed |
| ui-ux / marketer | User-facing UI / copy / sellability |
| devops | Infra, bindings, env catalog, deploy |

## Task brief (required fields)

```text
slug: …
issue: #N                    # parent epic (required)
stage_issue: #AC… | n/a | #N # AC child(ren) worked, parent, or n/a — NEVER a role-stage issue
role: …
phase: write|verify          # QA; security may use review|fix
ownership: …
AC: AC-1, …
constraints: …
depth: S|M|L
cast: …
next: …
```

## Handoff-meta

Every role issue comment ends with `### handoff-meta` (slug, issue, role, status, paths, commands, ac_covered, next; `stage_issue` = AC / parent / n/a). See orchestration rule.

## Anti-patterns

WRONG: Launch every roster role on a small bug.  
RIGHT: Short cast; orchestrator executes only that cast.

WRONG: Implement the whole feature in the parent chat while ignoring cast eng roles.  
RIGHT: Parent plans and integrates; specialists own their trees.

WRONG: Marketer edits locale JSON; FE/BE both edit `packages/**` in parallel.  
RIGHT: Shared ownership table in the orchestration rule.

WRONG: Create `[<slug>] · qa write|backend-dev|…` GitHub issues for cast stages.  
RIGHT: Parent epic + AC child issues only; roles hand off via comments on the parent.

## Checklist

- [ ] Role cast published (ordered who in / who out); no launches outside cast
- [ ] Specs path under `docs/specs/<slug>/` when non-trivial
- [ ] Parent GitHub issue `#N` exists and is passed to every role
- [ ] AC child issues exist for numbered acceptance; **no** role/stage issues created
- [ ] Acceptance numbered `AC-N`; QA maps tests; verify has AC matrix
- [ ] Each role posted handoff with **handoff-meta** (`stage_issue` = AC/parent/n/a, `follow_ups`)
- [ ] Blockers and clarifications also commented on the issue (not chat-only)
- [ ] No silent tech debt — deferred work filed as follow-up issues
- [ ] User OK before production code (feature path)
- [ ] QA write (red) before BE/FE; QA verify after (behavior change)
- [ ] packages owner + locale JSON owner clear
- [ ] 2-cycle escalation honored (no endless fix→verify)
- [ ] Parent issue closed per cast; closeout retro posted
- [ ] agentmemory handoffs saved

## See also

- Rule: `dev-team-orchestration.mdc`
- Agents: `.cursor/agents/` (including `orchestrator`, `architect`, `security`, `tech-writer`)
- Intake: `task-intake.mdc`
