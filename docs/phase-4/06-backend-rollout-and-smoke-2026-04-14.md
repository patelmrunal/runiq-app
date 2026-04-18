# Phase 4 Backend Rollout and Smoke (2026-04-14)

## Scope
Deploy and verify backend logic for:
- badge evaluation,
- DNA calculation,
- badge and DNA events,
- idempotent writes.

## Expected Backend Touchpoints
- functions/index.js
  - onRunLogCreated orchestration extension
  - evaluateBadges helper
  - calculateDNA helper
  - event writes: badge_unlocked, dna_evolved

## Deployment Order
1. Deploy rules/index updates required for Phase 4.
2. Deploy Cloud Function changes to dev project.
3. Execute matrix T401-T412 in emulator/dev.
4. Promote to production only after pass.

## Suggested Deploy Command Pattern
- firebase deploy --only functions:onRunLogCreated
- Optional full deploy if additional functions are added.

## Smoke Checklist (Dev)
- [ ] Valid run still processes as valid status.
- [ ] At least one badge can be awarded from baseline conditions.
- [ ] Badge replay does not duplicate writes.
- [ ] DNA does not run before run 10.
- [ ] DNA runs at run 10 and updates user dnaType correctly.
- [ ] dna_evolved event appears only when DNA changes.

## Rollback Plan
If regression is detected:
1. Disable new evaluator call path by guarded flag or fast revert.
2. Redeploy previous stable function version.
3. Keep badge catalog unchanged during rollback unless root cause is definition data.

## Evidence To Capture
- Function deploy output summary.
- User doc before/after snapshots for run 10 scenario.
- Badge and event subcollection snapshots for idempotency check.
- Matrix pass summary line.
