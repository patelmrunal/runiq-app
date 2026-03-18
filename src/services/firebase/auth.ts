import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { createUserDocument } from '../userService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

// ─── Register ──────────────────────────────────────────────────────────────────

export async function registerWithEmail({
  email,
  password,
  username,
  displayName,
}: RegisterPayload): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    const credential = await auth().createUserWithEmailAndPassword(email, password);
    const { uid } = credential.user;

    // Create full user document with all required fields
    await createUserDocument(uid, email, username, displayName);

    return credential;
  } catch (error: unknown) {
    throw new Error(`Registration failed: ${(error as FirebaseAuthTypes.NativeFirebaseAuthError).message}`);
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    return await auth().signInWithEmailAndPassword(email, password);
  } catch (error: unknown) {
    throw new Error(`Login failed: ${(error as FirebaseAuthTypes.NativeFirebaseAuthError).message}`);
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await auth().signOut();
  } catch (error: unknown) {
    throw new Error(`Logout failed: ${(error as FirebaseAuthTypes.NativeFirebaseAuthError).message}`);
  }
}

// ─── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  try {
    await auth().sendPasswordResetEmail(email);
  } catch (error: unknown) {
    throw new Error(`Password reset failed: ${(error as FirebaseAuthTypes.NativeFirebaseAuthError).message}`);
  }
}

// ─── Get current user ──────────────────────────────────────────────────────────

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth().currentUser;
}

// ─── Auth state listener ───────────────────────────────────────────────────────

export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void,
): () => void {
  return auth().onAuthStateChanged(callback);
}
