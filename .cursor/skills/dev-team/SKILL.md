---
name: dev-team
description: >-
  Runs the multi-role subagent pipeline driven by the PM role cast
  (BA, architect, PM, UI/UX, Marketer, backend-dev, frontend-dev, QA, security,
  DevOps, tech-writer). Use ONLY when the user explicitly types /dev-team
  (with optional task text). Do not trigger on soft phrases like
  «собери команду», «команда», or «feature team» without /dev-team.
---

# Dev team

## Gate

Only on explicit `/dev-team` in the *current* user message (or resume of that stage). Soft synonyms do not count. See `dev-team-gate.mdc`.

**On `/dev-team`: you (parent) are the orchestrator.** Read `.cursor/rules/dev-team-pipeline.mdc`, then launch **role** Tasks from the cast. Do **not** spawn `Task(orchestrator)` as a required hop. Rare fallback only: if you do spawn it, include `dev_team_authorized: true` and quote the user `/dev-team` line.

## Quick start

1. Clarify slug; recall prior specs if useful.
2. Read pipeline rule (canon for cast, tickets, handoff-meta, ownership).
3. If cast missing: run roles needed to publish it (usually BA → PM; architect only if cast/user says so).
4. **PM** publishes cast in `agent.md` + parent epic + AC children → stop for «можно начинать?».
5. On user OK: remaining cast in order (`∥` when marked). Typical eng: `qa write` → BE/FE → `qa verify`.
6. Every Task: `issue: #N`, ownership, `AC-*`, depth S/M/L; QA also `phase: write|verify`. No `[slug] · role` stage issues.
7. Deferred work → follow-up GitHub issues (`tech-debt`), not silent TODO.
8. Closeout: AC children closed/deferred; close parent per cast; **closeout retro** (3 bullets).

### Bug fast-path

Still needs `/dev-team` (or single-agent outside team). Short cast: `qa write → owner eng → qa verify`.

## Staffing heuristics (PM — not auto-launch)

| Role | Consider when |
| --- | --- |
| architect | Cross-layer API+DB+events+packages; new boundaries |
| security | Auth/oauth/webhooks/PII/payments/secrets/new public endpoints |
| tech-writer | Public API, env, ops, CODEMAP-touched modules |
| ui-ux / marketer | User-facing UI / copy / sellability |
| devops | Infra, bindings, env catalog, deploy |

## Task brief

```text
slug: …
issue: #N
stage_issue: #AC… | n/a | #N
role: …
phase: write|verify          # QA; security may use review|fix
ownership: …
AC: AC-1, …
constraints: …
depth: S|M|L
cast: …
next: …
```

## Checklist

- [ ] Explicit `/dev-team` (or valid resume); parent runs cast (no nested orchestrator hop)
- [ ] Pipeline rule loaded; cast published; no launches outside cast
- [ ] Specs under `docs/specs/<slug>/` when non-trivial
- [ ] Parent `#N` + AC children; **no** role-stage issues
- [ ] Handoff-meta on every parent comment; blockers on issue not chat-only
- [ ] User OK before production code (feature); qa write before eng; qa verify after
- [ ] packages + locale JSON owners clear; 2-cycle escalation honored
- [ ] Parent closed per cast; closeout retro; no silent tech debt

## See also

- Gate: `.cursor/rules/dev-team-gate.mdc`
- Pipeline: `.cursor/rules/dev-team-pipeline.mdc`
- Agents: `.cursor/agents/`
- Tech debt: `.cursor/rules/no-tech-debt.mdc`
