import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Initialize Firebase app instance
const app = getApp();

// Export initialized services
export const db = getFirestore(app);
export const auth = getAuth(app);
