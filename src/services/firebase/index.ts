// Firebase services — modular API (v22)
import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getStorage } from '@react-native-firebase/storage';

// Initialize Firebase app instance
const app = getApp();

// Export initialized services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Re-export auth functions
export * from './auth';