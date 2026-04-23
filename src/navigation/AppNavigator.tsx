import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { House, Play, User, DotsNine } from 'phosphor-react-native';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { auth, db } from '../services/firebase';
import { createUserDocument } from '../services/userService';
import { startNotificationTokenSync } from '../services/notificationService';
import { formatDnaLabel } from '../utils/dna';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SplashScreen from '../screens/SplashScreen';
import {
  ProfilePhotoScreen,
  LocationPermissionScreen,
  QuestionnaireScreen,
  WelcomeScreen,
} from '../screens/onboarding';

const DashboardScreen = React.lazy(() =>
  import('../screens/dashboard').then((module) => ({ default: module.DashboardScreen }))
);

const ProfileScreen = React.lazy(() =>
  import('../screens/profile').then((module) => ({ default: module.ProfileScreen }))
);

const MoreScreen = React.lazy(() =>
  import('../screens/more').then((module) => ({ default: module.MoreScreen }))
);

const RunTrackingScreen = React.lazy(() =>
  import('../screens/run').then((module) => ({ default: module.RunTrackingScreen }))
);

const PostRunSummaryScreen = React.lazy(() =>
  import('../screens/run').then((module) => ({ default: module.PostRunSummaryScreen }))
);

const RunDetailScreen = React.lazy(() =>
  import('../screens/run').then((module) => ({ default: module.RunDetailScreen }))
);

const BadgeDetailScreen = React.lazy(() =>
  import('../screens/badges').then((module) => ({ default: module.BadgeDetailScreen }))
);

const RunHubScreen = React.lazy(() =>
  import('../screens/run').then((module) => ({ default: module.RunHubScreen }))
);

// ─── Placeholder (swap out as real screens are built) ──────────────────────────

const PlaceholderScreen = ({ route }: { route: any }) => (
  <View style={styles.container}>
    <Text style={styles.placeholderTitle}>
      {route.name}
    </Text>
    <Text style={styles.placeholderSubtitle}>Coming soon</Text>
  </View>
);

const ScreenFallback = ({ label = 'Loading...' }: { label?: string }) => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingSubtitle}>{label}</Text>
  </View>
);

type CelebrationType = 'level_up' | 'badge_unlocked' | 'dna_evolved';

type CelebrationEvent = {
  id: string;
  type: CelebrationType;
  createdAtMs: number;
  payload: Record<string, unknown>;
};

type CelebrationSelection = {
  selected: CelebrationEvent | null;
  autoSeenIds: string[];
};

const getCreatedAtMs = (data: Record<string, unknown>): number => {
  const createdAt = (data as any)?.createdAt;
  if (typeof createdAt?.toDate === 'function') {
    return createdAt.toDate().getTime();
  }
  return 0;
};

const pickCelebrationEvent = (
  docs: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>[]
): CelebrationSelection => {
  const autoSeenIds: string[] = [];

  const sorted = docs
    .map((docSnap) => {
      const data = (docSnap.data() || {}) as Record<string, unknown>;
      return {
        id: docSnap.id,
        data,
        createdAtMs: getCreatedAtMs(data),
      };
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  for (const entry of sorted) {
    const type = typeof entry.data.type === 'string' ? entry.data.type : '';
    const seen = entry.data.seen === true;
    const payload = typeof entry.data.payload === 'object' && entry.data.payload ? entry.data.payload as Record<string, unknown> : {};

    if (seen) continue;
    if (type !== 'level_up' && type !== 'badge_unlocked' && type !== 'dna_evolved') continue;

    if (type === 'level_up') {
      const level = Number(payload.level || 0);
      if (!Number.isFinite(level) || level <= 0) {
        autoSeenIds.push(entry.id);
        continue;
      }

      return {
        selected: {
          id: entry.id,
          type: 'level_up',
          createdAtMs: entry.createdAtMs,
          payload,
        },
        autoSeenIds,
      };
    }

    if (type === 'badge_unlocked') {
      const milestone = payload.milestone === true;
      if (!milestone) {
        autoSeenIds.push(entry.id);
        continue;
      }

      return {
        selected: {
          id: entry.id,
          type: 'badge_unlocked',
          createdAtMs: entry.createdAtMs,
          payload,
        },
        autoSeenIds,
      };
    }

    return {
      selected: {
        id: entry.id,
        type: 'dna_evolved',
        createdAtMs: entry.createdAtMs,
        payload,
      },
      autoSeenIds,
    };
  }

  return {selected: null, autoSeenIds};
};

const getCelebrationCopy = (event: CelebrationEvent | null) => {
  if (!event) {
    return {
      accentColor: '#E94560',
      eyebrow: '',
      title: '',
      subtitle: '',
    };
  }

  if (event.type === 'level_up') {
    const level = Number(event.payload.level || 0);
    return {
      accentColor: '#E94560',
      eyebrow: 'Level Up',
      title: `Level ${level}`,
      subtitle: 'New features are now unlocked. Keep your streak alive.',
    };
  }

  if (event.type === 'badge_unlocked') {
    const badgeName = typeof event.payload.badgeName === 'string' && event.payload.badgeName
      ? event.payload.badgeName
      : 'Milestone Badge';

    return {
      accentColor: '#0F3460',
      eyebrow: 'Badge Unlocked',
      title: badgeName,
      subtitle: 'Milestone achieved. Your running story just got stronger.',
    };
  }

  const dnaLabel = formatDnaLabel(event.payload.dnaType);
  const dnaMessage = typeof event.payload.message === 'string' && event.payload.message
    ? event.payload.message
    : 'Your Runner DNA has evolved!';

  return {
    accentColor: '#E94560',
    eyebrow: 'Runner DNA',
    title: dnaLabel,
    subtitle: dnaMessage,
  };
};

type CelebrationOverlayProps = {
  event: CelebrationEvent | null;
  onFinished: () => void;
};

function CelebrationOverlay({ event, onFinished }: CelebrationOverlayProps) {
  const visible = Boolean(event);
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const copy = getCelebrationCopy(event);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = 0;
      cardScale.value = 0.9;
      return;
    }

    overlayOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });

    cardScale.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    const timer = setTimeout(() => {
      overlayOpacity.value = withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.cubic),
      });
      setTimeout(() => {
        onFinished();
      }, 260);
    }, 2100);

    return () => clearTimeout(timer);
  }, [cardScale, onFinished, overlayOpacity, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.levelUpOverlay, overlayStyle]}>
      <Animated.View style={[styles.levelUpCard, { borderColor: copy.accentColor }, cardStyle]}>
        <Text style={[styles.levelUpEyebrow, { color: copy.accentColor }]}>{copy.eyebrow}</Text>
        <Text style={styles.levelUpTitle}>{copy.title}</Text>
        <Text style={styles.levelUpSubtitle}>{copy.subtitle}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Param lists ───────────────────────────────────────────────────────────────

export type OnboardingStackParamList = {
  ProfilePhoto: undefined;
  LocationPermission: undefined;
  Questionnaire: undefined;
  Welcome: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Run: undefined;
  Profile: undefined;
  More: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  RunTracking: {
    taskId?: string;
    taskTitle?: string;
    targetKm?: number;
    targetMinutes?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
  } | undefined;
  PostRunSummary: { runId: string };
  RunDetail: { runId: string };
  BadgeDetail: { badgeId: string };
  StoryCard: { cardId: string };
  MissionCreate: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

// ─── Screen prop type helpers ──────────────────────────────────────────────────

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type OnboardingScreenProps<T extends keyof OnboardingStackParamList> =
  NativeStackScreenProps<OnboardingStackParamList, T>;

export type MainScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;

// ─── Navigators ────────────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ─── Onboarding stack ──────────────────────────────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfilePhoto"
    >
      <OnboardingStack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
      <OnboardingStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <OnboardingStack.Screen name="Questionnaire" component={QuestionnaireScreen} />
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
    </OnboardingStack.Navigator>
  );
}

// ─── Auth stack ────────────────────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Bottom tab navigator ──────────────────────────────────────────────────────

function BottomTabNavigator() {
  return (
    <React.Suspense fallback={<ScreenFallback label="Loading screens..." />}>
      <Tab.Navigator
          screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E4E4E7',
            borderTopWidth: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 8,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: '#E94560',
          tabBarInactiveTintColor: '#71717A',
          tabBarLabelStyle: {
            fontFamily: 'Inter',
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ color, focused }) => {
            const weight = focused ? 'fill' : 'regular';
            switch (route.name) {
              case 'Dashboard':
                return <House size={24} color={color} weight={weight} />;
              case 'Run':
                return <Play size={24} color={color} weight={weight} />;
              case 'Profile':
                return <User size={24} color={color} weight={weight} />;
              case 'More':
                return <DotsNine size={24} color={color} weight={weight} />;
              default:
                return null;
            }
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Run" component={RunHubScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="More" component={MoreScreen} />
      </Tab.Navigator>
    </React.Suspense>
  );
}

// ─── Main stack ────────────────────────────────────────────────────────────────

function MainNavigator() {
  return (
    <React.Suspense fallback={<ScreenFallback label="Loading run tools..." />}>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Tabs" component={BottomTabNavigator} />
        <MainStack.Screen
          name="RunTracking"
          component={RunTrackingScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <MainStack.Screen
          name="PostRunSummary"
          component={PostRunSummaryScreen}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen
          name="RunDetail"
          component={RunDetailScreen}
          options={{ presentation: 'card' }}
        />
        <MainStack.Screen
          name="BadgeDetail"
          component={BadgeDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <MainStack.Screen
          name="StoryCard"
          component={PlaceholderScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <MainStack.Screen
          name="MissionCreate"
          component={PlaceholderScreen}
          options={{ presentation: 'modal' }}
        />
      </MainStack.Navigator>
    </React.Suspense>
  );
}

// ─── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const [user, setUser] = useState<any>(null);
  const [appState, setAppState] = useState<'auth' | 'onboarding' | 'main'>('auth');
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);
  const autoSeenInFlightRef = useRef<Set<string>>(new Set());

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAppState('auth');
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      // Check AsyncStorage cache first — instant
      const cacheKey = `onboarding_complete_${firebaseUser.uid}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached === 'true') {
        // Returning user — go straight to main
        setAppState('main');
        setLoading(false);
        return;
      }

      // New user — check Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const data = userDoc.data();

        if (data?.onboarding?.primaryGoal) {
          // Onboarding complete — cache it and go to main
          await AsyncStorage.setItem(cacheKey, 'true');
          setAppState('main');
        } else {
          // Create user document if doesn't exist
          if (!data) {
            const email = firebaseUser.email || '';
            const username = email.split('@')[0] || 'user';
            const displayName = firebaseUser.displayName || username;
            await createUserDocument(firebaseUser.uid, email, username, displayName);
          }
          setAppState('onboarding');
        }
      } catch (e) {
        console.error('[AppNavigator] Error checking onboarding:', e);
        // On error always go to main — never block user
        setAppState('main');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Listen to user document for onboarding completion (real-time updates)
  useEffect(() => {
    if (!user?.uid || appState !== 'onboarding') return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      async (docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        const hasCompletedOnboarding = !!data?.onboarding?.completed;
        if (hasCompletedOnboarding) {
          await AsyncStorage.setItem(`onboarding_complete_${user.uid}`, 'true');
          setAppState('main');
        }
      },
      (error) => {
        console.error('[AppNavigator] Firestore listener error:', error);
      }
    );

    return unsubscribe;
  }, [user, appState]);

  // Keep FCM token in sync for the authenticated user.
  useEffect(() => {
    if (!user?.uid) return;
    return startNotificationTokenSync(user.uid);
  }, [user?.uid]);

  const markEventsSeen = useCallback(async (uid: string, eventIds: string[]) => {
    const unique = Array.from(new Set(eventIds)).filter((eventId) => {
      if (!eventId) return false;
      if (autoSeenInFlightRef.current.has(eventId)) return false;
      autoSeenInFlightRef.current.add(eventId);
      return true;
    });

    if (unique.length === 0) return;

    await Promise.all(unique.map(async (eventId) => {
      try {
        await updateDoc(doc(db, 'users', uid, 'events', eventId), {
          seen: true,
          seenAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('[AppNavigator] Failed to mark event as seen:', error);
      } finally {
        autoSeenInFlightRef.current.delete(eventId);
      }
    }));
  }, []);

  // Listen for unseen celebration events and show the latest display-worthy one.
  useEffect(() => {
    if (!user?.uid || appState !== 'main') return;

    const celebrationEventsQuery = query(
      collection(db, 'users', user.uid, 'events'),
      where('seen', '==', false),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      celebrationEventsQuery,
      (snapshot) => {
        if (snapshot.empty) return;

        const selection = pickCelebrationEvent(snapshot.docs);
        if (selection.autoSeenIds.length > 0) {
          void markEventsSeen(user.uid, selection.autoSeenIds);
        }

        if (!selection.selected) return;
        if (activeCelebration?.id === selection.selected.id) return;

        setActiveCelebration(selection.selected);
      },
      (error) => {
        console.error('[AppNavigator] Celebration event listener error:', error);
      }
    );

    return unsubscribe;
  }, [activeCelebration?.id, appState, markEventsSeen, user?.uid]);

  // Fallback poll: protects celebration UI when realtime event stream is delayed.
  useEffect(() => {
    if (!user?.uid || appState !== 'main') return;

    let cancelled = false;

    const pollLatestLevelUpEvent = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, 'users', user.uid, 'events'),
            where('seen', '==', false),
            limit(25)
          )
        );

        if (cancelled || snapshot.empty) return;

        const selection = pickCelebrationEvent(snapshot.docs);
        if (selection.autoSeenIds.length > 0) {
          await markEventsSeen(user.uid, selection.autoSeenIds);
        }

        if (!selection.selected) return;
        if (activeCelebration?.id === selection.selected.id) return;

        setActiveCelebration(selection.selected);
      } catch (error) {
        console.error('[AppNavigator] Celebration event poll error:', error);
      }
    };

    void pollLatestLevelUpEvent();
    const timer = setInterval(() => {
      void pollLatestLevelUpEvent();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeCelebration?.id, appState, markEventsSeen, user?.uid]);

  const handleCelebrationOverlayFinished = useCallback(async () => {
    const uid = user?.uid;
    const eventId = activeCelebration?.id;

    if (!uid || !eventId) {
      setActiveCelebration(null);
      return;
    }

    await markEventsSeen(uid, [eventId]);

    setActiveCelebration(null);
  }, [activeCelebration?.id, markEventsSeen, user?.uid]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>Runiq</Text>
        <Text style={styles.loadingSubtitle}>Run. Grow. Become.</Text>
      </View>
    );
  }

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.noConnectionIcon}>📡</Text>
        <Text style={styles.noConnectionTitle}>
          No Internet Connection
        </Text>
        <Text style={styles.noConnectionText}>
          Please check your connection and try again
        </Text>
      </View>
    );
  }

  return (
    <>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {appState === 'auth' ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : appState === 'main' ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </RootStack.Navigator>

      <CelebrationOverlay
        event={activeCelebration}
        onFinished={handleCelebrationOverlayFinished}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#09090B',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 8,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#09090B',
  },
  placeholderSubtitle: {
    color: '#71717A',
    marginTop: 8,
  },
  noConnectionIcon: {
    fontSize: 40,
  },
  noConnectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#09090B',
    marginTop: 16,
  },
  noConnectionText: {
    fontSize: 14,
    color: '#71717A',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  levelUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  levelUpCard: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E94560',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  levelUpEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E94560',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  levelUpTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#09090B',
    marginBottom: 8,
  },
  levelUpSubtitle: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 20,
  },
});
