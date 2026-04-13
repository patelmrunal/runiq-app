# Android Release Smoke + Reanimated Fix (2026-04-09)

## Trigger
Release build failed during installRelease with compile errors in react-native-reanimated 3.19.5 on React Native 0.84.1.

## Root Cause
Version incompatibility:
- react-native: 0.84.1
- react-native-reanimated: 3.19.5

Reanimated 3 referenced removed/changed UIManager/layout animation classes in RN 0.84, causing Java compile failures.

## Fix Applied
1. Upgraded to compatible versions:
- react-native-reanimated: 4.3.0
- react-native-worklets: 0.8.1

2. Clean rebuild sequence executed:
- gradlew clean
- gradlew installRelease

## Verification Output
- Reanimated and worklets native modules compiled successfully.
- App release APK installed successfully on one Android device:
  - Device: CPH2015 - 9
- Final result:
  - BUILD SUCCESSFUL

## Notes
- Remaining logs are mostly deprecation warnings from third-party libraries and do not block release build.
- Gradle reported metaspace pressure warning; current build still completed successfully.

## Status Impact
- Android device smoke check for release build path: Completed.
- iOS smoke verification remains pending if strict cross-platform signoff is required.
