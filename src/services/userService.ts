import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ─── User document schema ──────────────────────────────────────────────────────

export interface UserDocument {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  lastActiveAt: FirebaseFirestoreTypes.Timestamp;
  tier: 'basic' | 'premium';
  premiumExpiresAt: FirebaseFirestoreTypes.Timestamp | null;
  isActive: boolean;
  homeCity: string;
  homeState: string;
  homeTimezone: string;
  homeCoords: {
    lat: number;
    lng: number;
  };
  dnaType: string;
  dnaHistory: string[];
  runCount: number;
  totalKm: number;
  currentStreak: number;
  longestStreak: number;
  lastRunDate: FirebaseFirestoreTypes.Timestamp | null;
  ranTodayFlag: boolean;
  shieldsAvailable: number;
  shieldUsedThisMonth: boolean;
  restDay: number;
  streakBreaksLast30: number;
  level: number;
  daysAsLegend: number;
  onboarding: {
    runFrequency: string | null;
    preferredTime: string | null;
    primaryGoal: string | null;
  };
  buddyUid: string | null;
  buddyRequestSentTo: string | null;
  buddyRequestReceivedFrom: string | null;
}

// ─── Create user document ──────────────────────────────────────────────────────

/**
 * Creates a new user document in Firestore with all default fields.
 * This should be called immediately after successful Firebase Auth registration.
 */
export async function createUserDocument(
  uid: string,
  email: string,
  username: string,
  displayName: string,
): Promise<void> {
  try {
    await firestore()
      .collection('users')
      .doc(uid)
      .set({
        uid,
        email,
        username,
        displayName,
        photoURL: null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
        tier: 'basic',
        premiumExpiresAt: null,
        isActive: true,
        homeCity: '',
        homeState: '',
        homeTimezone: 'Asia/Kolkata',
        homeCoords: { lat: 0, lng: 0 },
        dnaType: 'discovering',
        dnaHistory: [],
        runCount: 0,
        totalKm: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastRunDate: null,
        ranTodayFlag: false,
        shieldsAvailable: 1,
        shieldUsedThisMonth: false,
        restDay: 0,
        streakBreaksLast30: 0,
        level: 1,
        daysAsLegend: 0,
        onboarding: {
          runFrequency: null,
          preferredTime: null,
          primaryGoal: null,
        },
        buddyUid: null,
        buddyRequestSentTo: null,
        buddyRequestReceivedFrom: null,
      });
  } catch (error) {
    console.error('[userService] Failed to create user document:', error);
    throw new Error('Failed to create user profile');
  }
}

// ─── Get user document ─────────────────────────────────────────────────────────

/**
 * Fetches the user document from Firestore.
 */
export async function getUserDocument(uid: string): Promise<UserDocument | null> {
  try {
    const doc = await firestore().collection('users').doc(uid).get();
    const data = doc.data();
    if (data) {
      return data as UserDocument;
    }
    return null;
  } catch (error) {
    console.error('[userService] Failed to get user document:', error);
    return null;
  }
}

// ─── Update user document ──────────────────────────────────────────────────────

/**
 * Updates specific fields in the user document.
 */
export async function updateUserDocument(
  uid: string,
  updates: Partial<UserDocument>,
): Promise<void> {
  try {
    await firestore().collection('users').doc(uid).update(updates);
  } catch (error) {
    console.error('[userService] Failed to update user document:', error);
    throw new Error('Failed to update user profile');
  }
}
