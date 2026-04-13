import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BACKGROUND_LOCATION_DISCLOSURE_MESSAGE, PRIVACY_POLICY_URL } from '../../constants/legal';
import { BorderRadius, COLORS, Spacing, Typography } from '../../constants/theme';
import type { TabScreenProps } from '../../navigation';

type Props = TabScreenProps<'More'>;

const MoreScreen: React.FC<Props> = () => {
  const openPrivacyPolicy = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (!supported) {
        throw new Error('unsupported_url');
      }
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert(
        'Link unavailable',
        'Privacy policy link is not reachable. Update the production policy URL before Play Store submission.'
      );
    }
  }, []);

  const showDisclosure = useCallback(() => {
    Alert.alert('Background location disclosure', BACKGROUND_LOCATION_DISCLOSURE_MESSAGE, [
      { text: 'OK' },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Legal and app information</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={openPrivacyPolicy} activeOpacity={0.8}>
          <View>
            <Text style={styles.rowTitle}>Privacy Policy</Text>
            <Text style={styles.rowCaption}>Open published privacy policy URL</Text>
          </View>
          <Text style={styles.rowAction}>Open</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={showDisclosure} activeOpacity={0.8}>
          <View>
            <Text style={styles.rowTitle}>Location Data Disclosure</Text>
            <Text style={styles.rowCaption}>See what location data is used and why</Text>
          </View>
          <Text style={styles.rowAction}>View</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerHeading}>Play Store readiness note</Text>
        <Text style={styles.footerText}>
          Keep this Privacy Policy URL aligned with Play Console App Content before each release.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Typography.fontFamily,
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily,
    fontSize: 14,
    color: COLORS.mediumGrey,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  row: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontFamily: Typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.almostBlack,
  },
  rowCaption: {
    marginTop: 2,
    fontFamily: Typography.fontFamily,
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  rowAction: {
    fontFamily: Typography.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  footerCard: {
    marginTop: Spacing.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  footerHeading: {
    fontFamily: Typography.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: Spacing.xs,
  },
  footerText: {
    fontFamily: Typography.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.mediumGrey,
  },
});

export default MoreScreen;
