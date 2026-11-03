# Agent spec: employee-delete-enter-confirm

**Parent epic:** #116  
**Slug:** `employee-delete-enter-confirm`

## Goal
In the employee delete confirmation AlertDialog, pressing Enter confirms/submits the destructive delete (same as clicking Delete). Escape continues to cancel/dismiss.

## Acceptance
| ID | Criteria | GitHub |
| --- | --- | --- |
| AC-1 | Enter on open employee-delete confirm triggers delete (same as confirm button) | #117 |
| AC-2 | Escape dismisses without deleting | #118 |
| AC-3 | Keyboard handling preserves AlertDialog a11y (focus trap, roles, cancel usable) | #119 |

## Role cast (ordered)
1. `qa` phase: write
2. `frontend-dev`
3. `qa` phase: verify

**Out of cast:** BA, PM, architect, ui-ux, marketer, backend-dev, security, devops, tech-writer

## Ownership
- `apps/web/**` → frontend-dev
- Tests → qa
- `packages/**` → n/a unless shared AlertDialog needs a minimal change owned by frontend-dev

## Likely paths
- `apps/web/src/components/EmployeesSection.tsx` (delete AlertDialog ~626–653)
- `apps/web/src/components/ui/alert-dialog.tsx` (AlertDialogAction is plain Button; may need Close/default behavior)

## Constraints
- Do not break Escape cancel
- Prefer a11y-safe approach (native default button / dialog Enter semantics over fragile global keydown hacks)
- Scope is employee delete confirm; department delete dialog may share the same primitive fix if incidental — do not expand product scope without filing follow-up
- Backend OUT
- No role-stage GitHub issues; handoff comments on #116 with handoff-meta
- No silent tech debt — file follow-up issues

## Depth
S
