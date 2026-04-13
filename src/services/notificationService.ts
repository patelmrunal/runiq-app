import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from '@react-native-firebase/firestore';
import { db } from './firebase';

const DEVICE_ID_STORAGE_KEY = 'runiq_device_id';

const getRandomSuffix = (): string => Math.random().toString(36).slice(2, 10);

const getOrCreateDeviceId = async (): Promise<string> => {
  const cached = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (cached) return cached;

  const nextId = `device_${Date.now()}_${getRandomSuffix()}`;
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
};

const upsertTokenForUser = async (uid: string, token: string): Promise<void> => {
  const deviceId = await getOrCreateDeviceId();

  const devicesRef = collection(db, 'users', uid, 'devices');
  const currentDeviceRef = doc(db, 'users', uid, 'devices', deviceId);

  const duplicateTokenQuery = query(devicesRef, where('token', '==', token));
  const duplicateTokenSnap = await getDocs(duplicateTokenQuery);

  await Promise.all(
    duplicateTokenSnap.docs
      .filter((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => docSnap.id !== deviceId)
      .map((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) =>
        updateDoc(docSnap.ref, {
          isActive: false,
          replacedAt: serverTimestamp(),
        })
      )
  );

  await setDoc(
    currentDeviceRef,
    {
      token,
      platform: Platform.OS,
      isActive: true,
      updatedAt: serverTimestamp(),
      app: 'runiq',
    },
    { merge: true }
  );
};

const isMessagingPermissionGranted = (status: number): boolean => {
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED
    || status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

const syncCurrentToken = async (uid: string): Promise<void> => {
  try {
    await messaging().registerDeviceForRemoteMessages();
    const status = await messaging().requestPermission();

    if (!isMessagingPermissionGranted(status)) {
      return;
    }

    const token = await messaging().getToken();
    if (!token) return;

    await upsertTokenForUser(uid, token);
  } catch (error) {
    console.warn('[notificationService] Failed to sync FCM token:', error);
  }
};

export const startNotificationTokenSync = (uid: string): (() => void) => {
  let active = true;

  syncCurrentToken(uid);

  const unsubscribe = messaging().onTokenRefresh(async (token) => {
    if (!active) return;
    if (!token) return;

    try {
      await upsertTokenForUser(uid, token);
    } catch (error) {
      console.warn('[notificationService] Failed to update refreshed token:', error);
    }
  });

  return () => {
    active = false;
    unsubscribe();
  };
};
