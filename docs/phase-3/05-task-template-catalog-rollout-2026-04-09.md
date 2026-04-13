# Phase 3 Task Template Catalog Rollout (2026-04-09)

## Objective
Move from manually maintained small global templates to a production-ready Phase 3 template pool aligned with per-user daily assignment logic.

## Final Template Decision
- Active template pool: 60 templates.
- Difficulty split: 20 Easy, 20 Medium, 20 Hard.
- Level split: 24 templates for Level 1, 18 for Level 2, 18 for Level 3.
- Global collection: auto.
- User daily assignment destination: users/{uid}/dailyTasks.

## User Daily Visibility
- Basic user: 3 tasks per day.
  - One each from Easy, Medium, Hard where possible.
- Premium user: up to 4 tasks per day.
  - Base 3 tasks plus one bonus Hard task when available.

## How The System Works End-to-End
1. Product templates are stored globally in auto.
2. Scheduler loads templates that are active and allowed by user level.
3. Scheduler avoids recently used task IDs where possible.
4. Scheduler assigns daily tasks into users/{uid}/dailyTasks with dayKey and position.
5. App reads users/{uid}/dailyTasks for today first.
6. If dailyTasks is missing, app fallback can read auto (temporary rollout safety).

## Production Commands Executed
From functions folder:

1. Dry-run validation:
- npm run tasks:catalog:dry

2. Initial apply:
- npm run tasks:catalog:apply

3. Idempotency re-run:
- npm run tasks:catalog:apply

4. Deactivate legacy templates not in catalog:
- npm run tasks:catalog:apply:deactivate

## Production Execution Logs Summary
### Dry-run
- Template count: 60
- By difficulty: easy=20, medium=20, hard=20
- By level: level_1=24, level_2=18, level_3=18

### First apply
- Created: 60
- Updated: 0
- Unchanged: 0
- Existing docs before apply: 4

### Second apply (idempotency)
- Created: 0
- Updated: 0
- Unchanged: 60
- Existing docs before run: 64

### Deactivate-missing pass
- Created: 0
- Updated: 0
- Unchanged: 60
- Deactivated missing: 4
- Deactivated IDs:
  - hard_8km
  - easy_2km
  - medium_5km
  - super_easy_500M

## Backend Deploy Logs (Production)
1. firestore rules and scheduler functions deployed successfully.
2. Initial deploy for onRunLogCreated failed with iam.serviceAccounts.ActAs on compute service account.
3. IAM fix applied:
   - Granted roles/iam.serviceAccountUser to user patelmrunal7373@gmail.com on
     666945895085-compute@developer.gserviceaccount.com.
4. Redeployed onRunLogCreated as v2 in asia-south1 successfully.
5. Final status: all five Phase 3 functions are live in production.

## Alignment With Phase 3
- This rollout is aligned with Phase 3 architecture.
- Global templates remain a source catalog.
- User experience is delivered through per-user daily assignments.
- Catalog now has enough variety to avoid quick repetition during early scale.

## Operational Notes
- The sync script requires ADC credentials.
- In this environment, working credential path used was:
  - C:/Users/Man/AppData/Roaming/firebase/patelmrunal7373_gmail_com_application_default_credentials.json
- If credentials are missing, set GOOGLE_APPLICATION_CREDENTIALS before running apply commands.
