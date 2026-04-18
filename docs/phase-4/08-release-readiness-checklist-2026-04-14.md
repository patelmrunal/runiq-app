# Phase 4 Release Readiness Checklist (2026-04-14)

## Scope
Readiness checklist for the Badges + Runner DNA feature set.

## Backend Readiness
- [ ] evaluateBadges implemented and covered by tests.
- [ ] calculateDNA implemented and covered by tests.
- [ ] onRunLogCreated orchestration updated and stable.
- [ ] Badge writes are idempotent.
- [ ] DNA updates occur only on allowed cadence.

## Data and Rules Readiness
- [ ] Badge definition catalog published and versioned.
- [ ] users/{uid}/badges remains client read-only.
- [ ] users/{uid}/events seen update path still constrained.
- [ ] Any required indexes added and deployed.

## App UX Readiness
- [ ] Milestone badge full-screen overlay implemented.
- [ ] DNA evolution full-screen overlay implemented.
- [ ] Event seen-state update confirmed after display.
- [ ] Profile DNA card is prominent and readable.
- [ ] Fallback state shows Still Discovering when no DNA is assigned.

## Quality and Verification
- [ ] T401-T415 all pass.
- [ ] Replay/idempotency checks pass.
- [ ] 10-run done-when proof captured.
- [ ] No unresolved High/Critical risk entries.

## Operator Signoff
- [ ] Engineering signoff
- [ ] Product signoff
- [ ] Documentation signoff
