# Phase 3 Context Pack

Use this folder as the single source of truth for Phase 3 execution status.

## Files
- 00-session-summary-2026-04-08.md: What was done today, completion snapshot, and immediate next step.
- 01-step-by-step-execution-plan.md: Ordered implementation plan from backend to UI to verification.
- 02-open-items-and-left-work.md: Pending work and open product/logic clarifications.
- 03-bug-and-risk-log.md: Known risks/issues with planned fixes and logging protocol.
- 04-emulator-test-matrix.md: Required test scenarios and pass criteria.
- 05-task-template-catalog-rollout-2026-04-09.md: Production template seeding plan, rollout logs, and daily visibility rules.
- 06-android-release-smoke-and-reanimated-fix-2026-04-09.md: Android installRelease failure root cause, dependency fix, and smoke verification.
- 07-post-feedback-change-plan-2026-04-11.md: Post-feedback fixes and enhancement plan (shield UX, midnight task visibility, run count mapping, free-run threshold, performance).
- 08-play-store-checklist-2026-04-13.md: Android Play Store readiness audit (location disclosure, Data Safety, privacy policy links, permission rationale copy).
- 09-play-console-data-safety-final-2026-04-13.md: Finalized Play Console Data Safety answer pack for submission entry.

## How To Use This Pack Daily
1. Start from 00-session-summary-2026-04-08.md.
2. Execute next unchecked milestone in 01-step-by-step-execution-plan.md.
3. Update 02-open-items-and-left-work.md when scope changes.
4. Log every new issue in 03-bug-and-risk-log.md.
5. Mark test statuses in 04-emulator-test-matrix.md with proof notes.

## Completion Process
Phase 3 is complete only when:
- implementation milestones are done,
- all test matrix scenarios pass,
- no unresolved High/Critical risks remain.

## Latest Update
- 2026-04-09: Implementation Waves 1, 2, and 3 completed.
- Implemented: backend core, daily tasks generation, reminders, rules updates, app task source migration, token lifecycle, level-up overlay, and deterministic emulator matrix harness updates.
- Verification: T01-T10 passed (10/10) in local Firebase Emulator Suite.
- Production rollout: task catalog expanded to 60 templates, with legacy templates deactivated.
- Android release path: installRelease now passing after reanimated/worklets compatibility upgrade (see file 06).
- 2026-04-11: Phase 3.1 post-feedback change plan documented based on real user observations.
- 2026-04-11: Phase 3.1 core implementation completed for shield policy/visibility, free-run threshold, run-count mapping, and midnight task-feed behavior.
- 2026-04-11: Remaining app follow-ups closed (Run action-hub + FlatList recent-runs migration).
- 2026-04-11: QA hotfix wave applied for run processing reliability and task-rule consistency.
- Implemented in hotfix: distance+pace task completion policy, sparse_gps validation downgraded to warning review path, profile status alignment with backend flagged/valid states, and background tracking service re-enabled.
- 2026-04-11: One-time sparse_gps backfill executed for historical flagged run recovery in runiq-dev.
- Backfill result: 1 eligible run applied, +3.66 km restored, +1 runCount restored (streak not retro-recomputed by design).
- 2026-04-11: onRunLogCreated backend hotfix deployed successfully to runiq-dev (asia-south1).
- 2026-04-12: Follow-up hotfix applied for user-reported correctness/reliability gaps.
- Implemented: task runs now credit streak only when taskCompleted=true; failed tasks no longer protect/increment streak.
- Implemented: RunTrackingScreen unmount cleanup no longer force-calls stopTracking/background stop for active runs.
- 2026-04-12: Background tracking reliability hotfix applied in app tracking service.
- Implemented: runTrackingService now auto-recovers GPS watch on runtime errors and uses a stall watchdog to restart dropped background watches.
- Implemented: restart attempts are rate-limited per time window to avoid restart loops while preserving long-run continuity.
- Implemented: background service now performs periodic one-shot GPS probes and feeds accepted fixes into the run session as a fallback when watcher callbacks stall.
- Implemented: active run GPS watcher now acquires an exclusive global watch lock so warmup/other watchers cannot replace it mid-run.
- Implemented: Android background tracking service startup now retries and is treated as required for run start (fail-fast instead of silent degraded background behavior).
- Implemented: run watch provider preference switched to fused mode for more stable background callbacks on common OEM devices.
- Verification: Android release install revalidated after hardening via gradlew installRelease (BUILD SUCCESSFUL, installed on device CPH2015).
- 2026-04-13: Minor UX correctness follow-up completed.
- Implemented: task feed now prioritizes strict today dayKey assignments and caps task count by tier (basic=3, premium=4), preventing legacy no-dayKey overflow lists.
- Implemented: profile flagged-run badge/message now reflects actual backend flag reason (sparse_gps vs impossible_pace vs invalid_run_payload) instead of always showing generic GPS review wording.
- Implemented: profile flagged runs now include a "What happened?" popup that shows the exact backend flagReason code plus plain-English explanation.
- Implemented: Run Detail screen now mirrors the same reviewed-run transparency card and "What happened?" popup with backend flagReason code and explanation.
- 2026-04-12: Backend rollout completed for onRunLogCreated in runiq-dev (asia-south1) via firebase deploy --only functions:onRunLogCreated.
- 2026-04-13: Android-first signoff recorded for Phase 3 launch readiness.
- Verification: Real-device Android usage confirmed stable foreground/background tracking behavior.
- iOS smoke verification is deferred to Phase 4 and is non-blocking for Play Store launch path.
- 2026-04-13: Play Store checklist audit executed.
- Result: near-ready with required pre-upload actions on background-location prominent disclosure, Play Console Data Safety completion, and privacy policy URL setup.
- 2026-04-13: Play Store compliance implementation pass completed.
- Implemented: policy-grade background location disclosure copy in onboarding and explicit confirmation gate before runtime permission prompts in Run Tracking flow.
- Implemented: More tab now contains in-app Privacy Policy entry point and Location Data Disclosure helper card.
- Implemented: canonical legal constants added for disclosure message and policy URL (`https://runiq-dev.web.app/privacy-policy`).
- Implemented: Data Safety final answer pack created in file 09 for direct Play Console entry.
