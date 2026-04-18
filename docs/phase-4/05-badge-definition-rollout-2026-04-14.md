# Phase 4 Badge Definition Rollout (2026-04-14)

## Objective
Publish a stable badge definition catalog used by backend evaluators for deterministic, server-side badge awards.

## Catalog Source of Truth
- Firestore path: config/badgeDefinitions
- Owner: backend evaluator only
- Client behavior: read-only

## Definition Schema (Baseline)
Each badge entry should include:
- id: stable unique string
- name: display name
- description: short user-facing description
- category: distance | streak | behavior | weather | seasonal | mission
- isPremiumOnly: boolean
- milestone: boolean (controls full-screen animation eligibility)
- condition: structured condition payload consumed by evaluator
- isActive: boolean
- version: integer or semantic string

## Initial MVP Badge Set (Recommended)
1. first_run
2. total_km_10
3. total_km_50
4. total_km_100
5. streak_3
6. streak_7
7. streak_30
8. hard_task_10
9. rainy_run
10. early_runner
11. night_runner
12. founding_runner_2026

## Milestone Badge Policy
Only milestone=true badges should trigger full-screen unlock animation.
Recommended milestone examples:
- first_run
- total_km_100
- streak_30
- founding_runner_2026

## Rollout Steps
1. Prepare catalog JSON in source control.
2. Validate schema fields and duplicate id safety.
3. Dry-run compare against existing config/badgeDefinitions.
4. Apply upsert in dev project.
5. Run T401-T404 against dev.
6. Promote same catalog to production once tests pass.

## Idempotency and Safety Rules
- Never change badge id after release.
- Condition changes must be backward-safe and versioned.
- Deactivation is preferred over deletion for existing badges.
- Evaluator must tolerate unknown/inactive badge definitions.

## Operator Checklist
- [ ] Catalog approved by product.
- [ ] milestone flags approved.
- [ ] Dev apply completed.
- [ ] Matrix tests passed in dev.
- [ ] Production apply completed.
- [ ] Version and changelog updated.
