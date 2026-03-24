import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { House, Play, User, DotsNine } from 'phosphor-react-native';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { auth, db } from '../services/firebase';
import { createUserDocument } from '../services/userService';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SplashScreen from '../screens/SplashScreen';
import {
  ProfilePhotoScreen,
  LocationPermissionScreen,
  QuestionnaireScreen,
  WelcomeScreen,
} from '../screens/onboarding';
import { DashboardScreen } from '../screens/dashboard';
import { ProfileScreen } from '../screens/profile';
import { RunTrackingScreen, PostRunSummaryScreen } from '../screens/run';
import TaskSelectionModal from '../screens/run/TaskSelectionModal';

// ─── Placeholder (swap out as real screens are built) ──────────────────────────

const PlaceholderScreen = ({ route }: { route: any }) => (
  <View style={styles.container}>
    <Text style={styles.placeholderTitle}>
      {route.name}
    </Text>
    <Text style={styles.placeholderSubtitle}>Coming soon</Text>
  </View>
);

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
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const navigation = useNavigation<any>();

  const handleSelectTask = (task: any) => {
    setShowTaskModal(false);
    setTimeout(() => {
      navigation.navigate('RunTracking', {
        taskId: task.id,
        taskTitle: task.title,
        targetKm: task.targetKm,
        targetMinutes: task.targetMin,
        difficulty: task.difficulty,
      });
    }, 300);
  };

  const handleSelectFreeRun = () => {
    setShowTaskModal(false);
    setTimeout(() => {
      navigation.navigate('RunTracking', {
        taskId: 'free_run',
        taskTitle: 'Free Run',
        targetKm: 5,
        targetMinutes: 30,
        difficulty: 'Easy' as const,
      });
    }, 300);
  };

  return (
    <>
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
      <Tab.Screen
        name="Run"
        component={PlaceholderScreen}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            setShowTaskModal(true);
          },
        })}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={PlaceholderScreen} />
    </Tab.Navigator>

      <TaskSelectionModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSelectTask={handleSelectTask}
        onSelectFreeRun={handleSelectFreeRun}
      />
    </>
  );
}

// ─── Main stack ────────────────────────────────────────────────────────────────

function MainNavigator() {
  return (
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
  );
}

// ─── Root navigator ────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const [user, setUser] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setOnboardingComplete(null);
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  // Listen to user document for onboarding changes
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      async (docSnap) => {
        const data = docSnap.data();

        // If document doesn't exist, create it automatically
        if (!data) {
          console.log('[AppNavigator] User document missing, creating...');
          try {
            // Derive username from email if not available
            const email = user.email || '';
            const username = email.split('@')[0] || 'user';
            const displayName = user.displayName || username;

            await createUserDocument(user.uid, email, username, displayName);
            // The listener will fire again after document creation
            return;
          } catch (error) {
            console.error('[AppNavigator] Failed to create user document:', error);
            setOnboardingComplete(false);
            setInitializing(false);
            return;
          }
        }

        const hasCompletedOnboarding = !!data?.onboarding?.completed;
        setOnboardingComplete(hasCompletedOnboarding);
        setInitializing(false);
      },
      (error) => {
        console.error('[AppNavigator] Firestore listener error:', error);
        setOnboardingComplete(false);
        setInitializing(false);
      }
    );

    return unsubscribe;
  }, [user]);

  if (initializing) {
    return null;
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
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : onboardingComplete ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </RootStack.Navigator>
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
});
