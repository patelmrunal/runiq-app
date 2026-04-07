import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

// ─── Global Error Handler ───────────────────────────────────────────────────────
// Logs the exact crash reason before app closes

const ErrorUtils = (globalThis as any).ErrorUtils;
if (ErrorUtils) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
    console.error('GLOBAL ERROR:', error.message);
    console.error('IS FATAL:', isFatal);
    console.error('STACK:', error.stack);
    originalHandler(error, isFatal);
  });
}

// ─── App Component ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}