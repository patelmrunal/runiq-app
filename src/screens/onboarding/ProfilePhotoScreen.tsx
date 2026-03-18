import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import { updateUserDocument } from '../../services/userService';
import type { OnboardingScreenProps } from '../../navigation';
import { COLORS, SPACING } from '../../constants/theme';

type Props = OnboardingScreenProps<'ProfilePhoto'>;

export default function ProfilePhotoScreen({ navigation }: Props) {
  const [uploading, setUploading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function handlePickImage() {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (result.didCancel || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      setPhotoUri(uri);

      // Upload immediately after selection
      await uploadPhoto(uri);
    } catch (error) {
      console.error('[ProfilePhoto] Pick failed:', error);
    }
  }

  async function uploadPhoto(uri: string) {
    setUploading(true);
    try {
      const uid = auth().currentUser?.uid;
      if (!uid) throw new Error('No user logged in');

      const filename = `profile_photos/${uid}.jpg`;
      const reference = storage().ref(filename);

      await reference.putFile(uri);
      const downloadURL = await reference.getDownloadURL();

      await updateUserDocument(uid, { photoURL: downloadURL });

      // Navigate to next screen after successful upload
      navigation.navigate('LocationPermission');
    } catch (error) {
      console.error('[ProfilePhoto] Upload failed:', error);
      setPhotoUri(null);
    } finally {
      setUploading(false);
    }
  }

  function handleSkip() {
    navigation.navigate('LocationPermission');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>Add a profile photo</Text>
        <Text style={styles.subtitle}>
          Help other runners recognize you
        </Text>

        {/* Photo placeholder or preview */}
        <View style={styles.photoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color={COLORS.white} size="small" />
            </View>
          )}
        </View>

        {/* Upload button */}
        {!photoUri && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickImage}
            activeOpacity={0.85}
            disabled={uploading}
          >
            <Text style={styles.uploadButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        )}

        {/* Change button if photo selected */}
        {photoUri && !uploading && (
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.changeButtonText}>Change Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <Text style={styles.skipButtonText}>
            {photoUri && !uploading ? 'Continue' : 'Add later'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.almostBlack,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  photoContainer: {
    width: 160,
    height: 160,
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    backgroundColor: COLORS.offWhite,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    fontSize: 48,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  changeButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  changeButtonText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.mediumGrey,
  },
  footer: {
    paddingBottom: SPACING.xl,
  },
  skipButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
