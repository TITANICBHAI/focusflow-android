import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';
import { SharedPrefsModule } from '@/native-modules/SharedPrefsModule';

export default function PrivacyPolicyScreen() {
  const { state, updateSettings } = useApp();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const isRevisit = navigation.canGoBack();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      const updated = { ...state.settings, privacyAccepted: true };
      await updateSettings(updated);
      // Back up the acceptance to SharedPreferences so the app doesn't show
      // this screen again even if the SQLite database is wiped by Android's
      // OEM memory manager or file cleaner.
      try {
        await SharedPrefsModule.putString('privacy_accepted', 'true');
      } catch {
        // Non-fatal — the DB save above is the primary path.
      }
      router.replace('/onboarding');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {isRevisit && (
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.text }]}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="lock-closed" size={34} color="#fff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>FocusFlow is designed to keep your focus data on this device.</Text>
        </View>

        <PolicyCard title="Local-first data" icon="phone-portrait-outline">
          Tasks, schedules, app block lists, daily allowances, and settings are stored locally in FocusFlow's on-device database and Android preferences.
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
          You can change permissions in Android Settings and manage FocusFlow's app settings at any time. Removing app data deletes your local FocusFlow data.
        </PolicyCard>

        {/* Terms of Service link */}
        <TouchableOpacity
          style={styles.tosRow}
          onPress={() => router.push('/terms-of-service')}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
          <Text style={styles.tosText}>View Terms of Service</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>

        {isRevisit ? (
          <TouchableOpacity style={styles.backBtnBottom} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Back to Settings</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
            onPress={handleAccept}
            activeOpacity={0.85}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.acceptText}>I Understand and Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
  },
  backBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '700',
  },
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
  tosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.primary + '55',
    backgroundColor: COLORS.primaryLight,
  },
  tosText: {
    color: COLORS.primary,
    fontSize: FONT.sm,
    fontWeight: '700',
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
    minHeight: 52,
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
  acceptText: {
    color: '#fff',
    fontSize: FONT.md,
    fontWeight: '800',
  },
});
