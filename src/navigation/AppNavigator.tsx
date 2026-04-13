import React, { useCallback, useEffect, useState } from 'react';
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
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { auth, db } from '../services/firebase';
import { createUserDocument } from '../services/userService';
import { startNotificationTokenSync } from '../services/notificationService';
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

type LevelUpCelebrationOverlayProps = {
  visible: boolean;
  level: number;
  onFinished: () => void;
};

function LevelUpCelebrationOverlay({ visible, level, onFinished }: LevelUpCelebrationOverlayProps) {
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);

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
      <Animated.View style={[styles.levelUpCard, cardStyle]}>
        <Text style={styles.levelUpEyebrow}>Level Up</Text>
        <Text style={styles.levelUpTitle}>Level {level}</Text>
        <Text style={styles.levelUpSubtitle}>New features are now unlocked. Keep your streak alive.</Text>
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
          component={PlaceholderScreen}
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
  const [levelUpEvent, setLevelUpEvent] = useState<{ id: string; level: number } | null>(null);

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

  // Listen for new level-up events and show celebration overlay once.
  useEffect(() => {
    if (!user?.uid || appState !== 'main') return;

    const levelEventsQuery = query(
      collection(db, 'users', user.uid, 'events'),
      where('type', '==', 'level_up'),
      where('seen', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      levelEventsQuery,
      (snapshot) => {
        if (snapshot.empty) return;

        const eventDoc = snapshot.docs[0];
        if (levelUpEvent?.id === eventDoc.id) return;

        const data = eventDoc.data() || {};
        const parsedLevel = Number((data as any)?.payload?.level || 0);

        if (Number.isFinite(parsedLevel) && parsedLevel > 0) {
          setLevelUpEvent({
            id: eventDoc.id,
            level: parsedLevel,
          });
        }
      },
      (error) => {
        console.error('[AppNavigator] Level event listener error:', error);
      }
    );

    return unsubscribe;
  }, [appState, levelUpEvent?.id, user?.uid]);

  const handleLevelUpOverlayFinished = useCallback(async () => {
    const uid = user?.uid;
    const eventId = levelUpEvent?.id;

    if (!uid || !eventId) {
      setLevelUpEvent(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid, 'events', eventId), {
        seen: true,
        seenAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[AppNavigator] Failed to mark level-up event as seen:', error);
    }

    setLevelUpEvent(null);
  }, [levelUpEvent?.id, user?.uid]);

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

      <LevelUpCelebrationOverlay
        visible={Boolean(levelUpEvent)}
        level={levelUpEvent?.level || 0}
        onFinished={handleLevelUpOverlayFinished}
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
