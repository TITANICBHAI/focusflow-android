import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';

export default function PrivacyPolicyScreen() {
  const { state, updateSettings } = useApp();
  const { theme } = useTheme();

  const handleAccept = async () => {
    await updateSettings({ ...state.settings, privacyAccepted: true });
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="lock-closed" size={34} color="#fff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>FocusFlow is designed to keep your focus data on this device.</Text>
        </View>

        <PolicyCard title="Local-first data" icon="phone-portrait-outline">
          Tasks, schedules, app block lists, daily allowances, and settings are stored locally in FocusFlow’s on-device database and Android preferences.
        </PolicyCard>

        <PolicyCard title="Android permissions" icon="shield-checkmark-outline">
          FocusFlow asks for special Android access so it can detect foreground apps, show blocking overlays, keep reminders running, and enforce focus sessions.
        </PolicyCard>

        <PolicyCard title="No message or password collection" icon="eye-off-outline">
          The accessibility service is used for app blocking signals. FocusFlow does not collect passwords, private messages, form entries, or screen recordings.
        </PolicyCard>

        <PolicyCard title="Photos stay private" icon="images-outline">
          If you choose a custom block-screen wallpaper, FocusFlow copies that image into app-private storage so the native block overlay can display it.
        </PolicyCard>

        <PolicyCard title="Your control" icon="settings-outline">
          You can change permissions in Android Settings and manage FocusFlow’s app settings at any time. Removing app data deletes your local FocusFlow data.
        </PolicyCard>

        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
          <Text style={styles.acceptText}>I Understand and Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PolicyCard({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.cardBody, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT.sm,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: FONT.md,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: FONT.sm,
    lineHeight: 21,
  },
  acceptBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  acceptText: {
    color: '#fff',
    fontSize: FONT.md,
    fontWeight: '800',
  },
});