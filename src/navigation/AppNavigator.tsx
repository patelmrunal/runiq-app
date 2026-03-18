import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
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

// ─── Placeholder (swap out as real screens are built) ──────────────────────────

const PlaceholderScreen = ({ route }: { route: any }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#09090B' }}>
      {route.name}
    </Text>
    <Text style={{ color: '#71717A', marginTop: 8 }}>Coming soon</Text>
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
  RunTracking: undefined;
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

// ─── Tab icon names ────────────────────────────────────────────────────────────

const TAB_ICON_NAMES: Record<keyof TabParamList, string> = {
  Dashboard: 'view-dashboard',
  Run: 'run-fast',
  Profile: 'account-circle',
  More: 'dots-grid',
};

// ─── Onboarding stack ──────────────────────────────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="LocationPermission"
    >
      <OnboardingStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <OnboardingStack.Screen name="Questionnaire" component={QuestionnaireScreen} />
      <OnboardingStack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
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
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181B',
          borderTopColor: '#27272A',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#E94560',
        tabBarInactiveTintColor: '#71717A',
        tabBarIcon: ({ color }) => (
          <MaterialCommunityIcons
            name={TAB_ICON_NAMES[route.name]}
            size={24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Run"
        component={PlaceholderScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('RunTracking' as never);
          },
        })}
      />
      <Tab.Screen name="Profile" component={PlaceholderScreen} />
      <Tab.Screen name="More" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}

// ─── Main stack ────────────────────────────────────────────────────────────────

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={BottomTabNavigator} />
      <MainStack.Screen
        name="RunTracking"
        component={PlaceholderScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <MainStack.Screen
        name="PostRunSummary"
        component={PlaceholderScreen}
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

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
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

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        async (doc) => {
          const data = doc.data();

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

          const hasCompletedOnboarding = !!data?.onboarding?.primaryGoal;
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
