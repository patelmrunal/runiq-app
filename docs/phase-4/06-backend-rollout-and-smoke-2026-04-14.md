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
- [x] Valid run still processes as valid status.
- [x] At least one badge can be awarded from baseline conditions.
- [x] Badge replay does not duplicate writes.
- [x] DNA does not run before run 10.
- [x] DNA runs at run 10 and updates user dnaType correctly.
- [x] dna_evolved event appears only when DNA changes.

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

## Update 2026-04-18 (Implementation and Pre-Smoke)
- Backend implementation completed in functions/index.js:
  - evaluateBadgesForRun
  - calculateDnaForUser
  - onRunLogCreated Phase 4 orchestration hook
- Syntax validation completed:
  - node --check index.js passed
- Tooling validation completed:
  - npm run badges:catalog:dry passed
- Catalog apply executed successfully in runiq-dev with explicit ADC credentials.
- Function deployment not executed in this session.
- Remaining rollout tasks:
  - completed on 2026-04-19 (deploy + smoke + matrix).

## Update 2026-04-19 (Rollout Verification Complete)
- Deployment command:
  - firebase deploy --only functions:onRunLogCreated --project runiq-dev
- Deployment result:
  - Successful update operation for onRunLogCreated (asia-south1).
- Verification command:
  - node functions/scripts/phase4_matrix.js
- Verification result:
  - PASS 15/15, FAIL 0.
- Outcome:
  - Phase 4 backend rollout and smoke criteria satisfied for dev project.
