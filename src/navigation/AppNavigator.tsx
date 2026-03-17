import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import auth from '@react-native-firebase/auth';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import SplashScreen from '../screens/SplashScreen';

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
  LocationPermission: undefined;
  Questionnaire: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
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

// ─── Tab icons ─────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  Dashboard: '🏠',
  Run: '▶️',
  Profile: '👤',
  More: '⋯',
};

// ─── Onboarding stack ──────────────────────────────────────────────────────────

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="LocationPermission" component={PlaceholderScreen} />
      <OnboardingStack.Screen name="Questionnaire" component={PlaceholderScreen} />
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
      <AuthStack.Screen name="Onboarding" component={OnboardingNavigator} />
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
          <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={PlaceholderScreen} />
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
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
