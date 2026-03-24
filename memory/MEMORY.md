# Runiq App — Project Memory

## Project
- React Native 0.84.1 + TypeScript, path: `d:\Runiq-files\Documents\runiq-app\Runiq`
- Firebase Auth + Firestore, React Navigation 7, Zustand 5
- Premium design system: white bg, #F8F8F8 cards, #E94560 accent, gradient ['#E94560', '#FF6B6B']
- phosphor-react-native icons with fill/regular weight based on focus
- Font: Inter (via `Typography.fontFamily`)

## Key Architecture
- `App.tsx` owns the single `NavigationContainer` — do NOT add one in `AppNavigator.tsx`
- `AppNavigator.tsx` renders `RootStack.Navigator` directly (no NavigationContainer wrapper)
- Auth flow: Firebase `onAuthStateChanged` → show Auth or Main stack
- Onboarding now uses Firestore flag-based navigation (not manual navigate calls)

## Design System (Premium Fitness App)
- **Background**: #FFFFFF (white)
- **Cards**: #F8F8F8 with borderRadius 20
- **Accent**: #E94560 (red-pink)
- **Gradient**: ['#E94560', '#FF6B6B'] for hero elements
- **Text**: #09090B (dark), #71717A (grey)
- **Shadows**: subtle — shadowColor #000, shadowOpacity 0.06, elevation 4
- **Buttons**: borderRadius 16, height 56, full width
- **Icons**: phosphor-react-native with fill (focused) / regular (unfocused)
- **Feel**: Nike meets Notion — energetic, premium, clean

## Onboarding Flow (FIXED)
- **Navigation Pattern**: AppNavigator watches `onboarding.completed` flag in Firestore
- **LocationPermissionScreen**: Uses `PermissionsAndroid.request()` directly, no react-native-permissions
- **QuestionnaireScreen**: 3-step flow saves answers to Firestore with `onboarding.completed: true`
- **Critical Fix**: `saveAnswers(finalAnswers)` gets updated answers as parameter (not from stale state)
- **Flow**: Q1→Q2→Q3→saveAnswers→AppNavigator auto-switches to MainStack

## Files Built
- `src/constants/theme.ts` — design tokens: #F8F8F8 cards, borderRadius 20, shadows, gradient colors
- `src/navigation/AppNavigator.tsx` — white tab bar with phosphor icons, checks `onboarding.completed` flag
- `src/navigation/index.ts` — barrel exports all param lists + screen prop types
- `src/services/firebase/auth.ts` — registerWithEmail, loginWithEmail, logout, resetPassword, getCurrentUser, onAuthStateChanged
- `src/services/firebase/index.ts` — re-exports auth + firestore/storage/messaging instances
- `src/screens/auth/LoginScreen.tsx` — gradient circle behind logo, focus states, clean inputs (REDESIGNED)
- `src/screens/auth/RegisterScreen.tsx` — step wizard with large questions, fade animations (REDESIGNED)
- `src/screens/auth/index.ts` — exports LoginScreen, RegisterScreen
- `src/screens/SplashScreen.tsx` — auth check, 1.5s min display, Promise.all pattern
- `src/screens/onboarding/LocationPermissionScreen.tsx` — GPS permission with PermissionsAndroid
- `src/screens/onboarding/QuestionnaireScreen.tsx` — emoji headers, card selections, scale animations (REDESIGNED)
- `src/screens/onboarding/index.ts` — exports onboarding screens
- `src/screens/dashboard/DashboardScreen.tsx` — gradient hero card, task cards with colored bars (REDESIGNED)
- `src/screens/profile/ProfileScreen.tsx` — avatar with accent ring, stats cards, tier badge (NEW)
- `src/stores/` — useUserStore (with totalRuns), useRunStore, useStreakStore (Zustand)

## Screens Still Placeholder
- Main tabs: More, Run
- Modals: RunTracking, PostRunSummary, BadgeDetail, StoryCard, MissionCreate

## Known Gotchas
- Tab Run button intercepts press and navigates to `RunTracking` modal via `as never` cast
- `serverTimestamp()` imported from `@react-native-firebase/firestore` (not firebase/app)
- Firestore user doc seeded at registration with full initial shape
- `homeTimezone` defaults to `'Asia/Kolkata'`
- **NEVER manually navigate from onboarding screens** — let AppNavigator handle stack switches via Firestore flags
- Tab bar uses phosphor-react-native icons with conditional weight (fill when focused, regular when not)

## Recent Fixes (March 2026)
- Fixed LocationPermissionScreen permission handling with native PermissionsAndroid
- Fixed QuestionnaireScreen timing bug — saveAnswers() now gets finalAnswers parameter
- Implemented proper onboarding completion via `onboarding.completed` Firestore flag
- AppNavigator now watches completion flag instead of primaryGoal for navigation decisions
- Replaced MaterialCommunityIcons with phosphor-react-native for bottom tabs with focused states
- **COMPLETE REDESIGN**: All screens redesigned with premium design system:
  - LoginScreen: gradient circle, focus states, clean inputs
  - RegisterScreen: large questions, fade animations
  - QuestionnaireScreen: emoji headers, card selections, scale animations
  - DashboardScreen: gradient hero card, task cards with colored bars
  - ProfileScreen: avatar with accent ring, stats cards, tier badge (NEW)
  - Tab bar: white background with shadow, phosphor icons