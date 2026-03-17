import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';

// ─── Local param list (mirrors AuthStackParamList in AppNavigator) ──────────────

type AuthParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

type Props = NativeStackScreenProps<AuthParamList, 'Splash'>;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let mounted = true;
    let firebaseUnsubscribe: (() => void) | null = null;

    // Resolves with the first auth state emission
    const authPromise = new Promise<ReturnType<typeof auth>['currentUser']>(
      (resolve) => {
        firebaseUnsubscribe = auth().onAuthStateChanged((user) => {
          resolve(user);
        });
      },
    );

    // Minimum display time — both must complete before we redirect
    const minDelay = new Promise<void>((resolve) => {
      setTimeout(resolve, 1500);
    });

    Promise.all([authPromise, minDelay]).then(([user]) => {
      if (!mounted) return;
      if (user) {
        // navigate() traverses up the navigator tree to reach RootStack's 'Main'
        navigation.navigate('Main' as never);
      } else {
        navigation.replace('Login');
      }
    });

    return () => {
      mounted = false;
      firebaseUnsubscribe?.();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Centred logo block */}
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>Runiq</Text>
        <Text style={styles.tagline}>Run. Grow. Become.</Text>
      </View>

      {/* Spinner anchored to footer */}
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#E94560" />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  logoBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#E94560',
    marginTop: 10,
    letterSpacing: 0.4,
  },
  footer: {
    paddingBottom: 48,
  },
});
