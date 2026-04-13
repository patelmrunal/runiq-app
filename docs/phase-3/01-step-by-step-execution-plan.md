# Phase 3 Step-by-Step Execution Plan

## Goal
Deliver streak + task system with scheduler-based reminders, shield behavior, and level-up UX using current repository architecture.

## Execution Steps
1. Finalize data contract for fields/events used by Phase 3. (Done)
2. Implement cloud functions skeleton (trigger + schedulers + shared helpers). (Done)
3. Add runLog create trigger for progression processing. (Done)
4. Implement streak evaluation function (same day, consecutive day, missed day with shield, missed day without shield). (Done)
5. Implement level gate evaluation from streak thresholds and emit level-up event document. (Done)
6. Implement daily task generator and assignment persistence for user/day. (Done)
7. Implement 10:00 PM reminder scheduler with dedupe key. (Done)
8. Implement 11:30 PM final warning scheduler (only users still inactive and shield-eligible). (Done)
9. Move dashboard/run task source from global templates to user daily assignments. (Done)
10. Remove client-side progression writes that violate server-authoritative model. (Done)
11. Implement level-up event listener + full-screen animation in app. (Done)
12. Run emulator test matrix and fix failures. (Done)

## Current Wave Status (2026-04-09)
- Milestone A - Backend Core: Done
- Milestone B - Daily Tasks: Done
- Milestone C - Notifications: Done
- Milestone D - UX Completion: Done
- Milestone E - Verification: Done (T01-T10 pass)

## Suggested File Touch Order
- functions/index.js
- firestore.rules
- firestore.indexes.json
- src/services/taskService.ts
- src/screens/dashboard/DashboardScreen.tsx
- src/navigation/AppNavigator.tsx
- src/screens/run/PostRunSummaryScreen.tsx
- src/services/firebase/index.ts and notification wiring files

## Milestones
### Milestone A - Backend Core
- Run trigger, streak logic, level logic implemented.

### Milestone B - Daily Tasks
- Daily assignments generated and consumed by dashboard/run entry points.

### Milestone C - Notifications
- Reminder schedulers and FCM send pipeline active with dedupe.

### Milestone D - UX Completion
- Level-up full-screen animation shown from backend event.

### Milestone E - Verification
- Emulator suite tests pass for all Phase 3 acceptance paths.

## Phase 3.1 Execution Steps (Post-Feedback, 2026-04-11)
1. Fix profile total runs mapping to backend runCount source field.
2. Enforce free_run streak-credit threshold (minimum 1.4 km).
3. Update task service behavior to avoid authenticated midnight fallback to full auto catalog.
4. Add shield inventory visibility in dashboard and profile UI.
5. Add monthly shield grant scheduler with idempotent month marker.
6. Restrict shield auto-apply to missed days where currentStreak <= 5.
7. Refactor recent runs rendering for smoother scrolling and lower render cost.
8. Execute focused validation for midnight rollover, shield policy, and free-run threshold.

## Phase 3.1 Milestones
### Milestone F - Correctness Repairs
- runCount mapping, free-run threshold, midnight task feed behavior fixed.

### Milestone G - Shield Policy Completion
- monthly grant and streak-window auto-apply policy implemented with UI visibility.

### Milestone H - UX and Performance Pass
- recent-runs lag reduced and run-tab behavior clarified.
