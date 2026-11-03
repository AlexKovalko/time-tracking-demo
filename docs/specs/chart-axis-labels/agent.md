# Agent spec: chart-axis-labels

**Issue:** [#103](https://github.com/AlexKovalko/time-tracking-demo/issues/103)  
**Slug:** `chart-axis-labels`

## Goal

Visible axis labels on Report/Profile over-time `CompactBarChart` («Часы по времени»).

## Acceptance

| ID | Criterion | GitHub |
| --- | --- | --- |
| AC-1 | Day mode: X-axis ticks `DD.MM` | #104 |
| AC-2 | Week mode: X-axis ticks = ISO week number | #105 |
| AC-3 | Y-axis shows hour/duration scale ticks | #106 |

## Role cast (ordered)

1. `qa` (`phase: write`)
2. `frontend-dev`
3. `qa` (`phase: verify`) → close parent

**Out:** BA, architect, PM, ui-ux, marketer, backend-dev, security, devops, tech-writer.

## Ownership

| Zone | Owner |
| --- | --- |
| `apps/web/**` (CompactBarChart, format helpers, locales if needed) | `frontend-dev` |
| tests | `qa` |
| `apps/api/**`, `packages/**` | not in scope |

## Notes

- Labels already computed for tooltip / `sr-only`; currently **not** drawn on axes.
- Day axis: shorten from `DD.MM.YYYY` → `DD.MM`.
- Week axis: short week number (not full AC-44 tooltip span). Tooltip may keep richer `formatWeekBucketLabel`.
- Same component used in Report + Employee Profile — both should get visible axes.
