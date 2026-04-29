/**
 * block-defense.tsx
 *
 * "Block Enforcement" screen — groups the tools that make blocks impossible to bypass.
 * Accessible from the Side Menu. Opens with an optional `tab` query param:
 *   /block-defense?tab=keywords   → scroll to Keyword Blocker
 *   /block-defense?tab=system     → scroll to System Protection
 *   /block-defense?tab=aversion   → scroll to Aversion Deterrents
 *   /block-defense?tab=greyout    → scroll to Greyout Schedule
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';
import { BlockedWordsModal } from '@/components/BlockedWordsModal';
import { GreyoutScheduleModal } from '@/components/GreyoutScheduleModal';
import type { GreyoutWindow } from '@/data/types';

export default function BlockDefenseScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { state, updateSettings, setBlockedWords } = useApp();
  const { settings } = state;
  const params = useLocalSearchParams<{ tab?: string }>();

  const [wordsModalVisible, setWordsModalVisible] = useState(false);
  const [greyoutModalVisible, setGreyoutModalVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = {
    keywords: useRef<View>(null),
    system: useRef<View>(null),
    aversion: useRef<View>(null),
    greyout: useRef<View>(null),
  };

  const focusActive = state.focusSession?.isActive === true;
  const standaloneActive = (() => {
    if (!settings.standaloneBlockUntil) return false;
    if ((settings.standaloneBlockPackages ?? []).length === 0) return false;
    return new Date(settings.standaloneBlockUntil).getTime() > Date.now();
  })();
  const blockProtectionActive = focusActive || standaloneActive;

  // Always-on enforcement is active whenever standalone packages OR allowance
  // entries exist — those rules are enforced even with no timed session running.
  // Mirrors the logic in AppContext._syncAlwaysBlock so the banner reflects
  // exactly what the AccessibilityService is doing right now.
  const standalonePkgCount = (settings.standaloneBlockPackages ?? []).length;
  const allowanceEntryCount = (settings.dailyAllowanceEntries ?? []).length;
  const alwaysOnActive = standalonePkgCount > 0 || allowanceEntryCount > 0;

  const focusTaskTitle =
    state.focusSession
      ? state.tasks.find((t) => t.id === state.focusSession?.taskId)?.title ?? null
      : null;
  const standaloneEndsLabel = (() => {
    if (!standaloneActive || !settings.standaloneBlockUntil) return null;
    const d = new Date(settings.standaloneBlockUntil);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  })();

  useEffect(() => {
    const tab = params.tab;
    if (!tab) return;
    const timeout = setTimeout(() => {
      const ref = sectionRefs[tab as keyof typeof sectionRefs];
      if (ref?.current) {
        ref.current.measureLayout(
          scrollRef.current as unknown as never,
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: y - 16, animated: true });
          },
          () => {},
        );
      }
      // Auto-open the appropriate modal
      if (tab === 'keywords') setWordsModalVisible(true);
      if (tab === 'greyout') setGreyoutModalVisible(true);
    }, 400);
    return () => clearTimeout(timeout);
  }, [params.tab]);

  const update = async (partial: Partial<typeof settings>) => {
    await updateSettings({ ...settings, ...partial });
  };

  const handleSystemGuardToggle = async (enabled: boolean) => {
    if (!enabled && blockProtectionActive) {
      Alert.alert('Protection is active', 'Cannot disable while Focus Mode or a block is active.');
      return;
    }
    await update({ systemGuardEnabled: enabled });
  };

  const handleInstallToggle = async (enabled: boolean) => {
    if (!enabled && blockProtectionActive) {
      Alert.alert('Protection is active', 'Cannot disable while a block is active.');
      return;
    }
    await update({ blockInstallActionsEnabled: enabled });
  };

  const handleYoutubeToggle = async (enabled: boolean) => {
    if (!enabled && blockProtectionActive) {
      Alert.alert('Protection is active', 'Cannot disable while a block is active.');
      return;
    }
    await update({ blockYoutubeShortsEnabled: enabled });
  };

  const handleReelsToggle = async (enabled: boolean) => {
    if (!enabled && blockProtectionActive) {
      Alert.alert('Protection is active', 'Cannot disable while a block is active.');
      return;
    }
    await update({ blockInstagramReelsEnabled: enabled });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={[styles.title, { color: theme.text }]}>Block Enforcement</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            The layers that make your blocks impossible to bypass
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* What's currently enforcing — read-only status panel */}
        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statusTitle, { color: theme.text }]}>What&apos;s blocking right now</Text>
          <StatusRow
            label="Focus session"
            on={focusActive}
            detail={
              focusActive
                ? focusTaskTitle
                  ? `Active for "${focusTaskTitle}"`
                  : 'Active'
                : 'No focus session running'
            }
            theme={theme}
          />
          <StatusRow
            label="Timed standalone block"
            on={standaloneActive}
            detail={
              standaloneActive
                ? `${standalonePkgCount} app${standalonePkgCount !== 1 ? 's' : ''} blocked until ${standaloneEndsLabel}`
                : 'No timer running'
            }
            theme={theme}
          />
          <StatusRow
            label="Always-on enforcement"
            on={alwaysOnActive}
            detail={
              alwaysOnActive
                ? `${standalonePkgCount} blocked app${standalonePkgCount !== 1 ? 's' : ''}` +
                  (allowanceEntryCount > 0
                    ? ` + ${allowanceEntryCount} daily-allowance rule${allowanceEntryCount !== 1 ? 's' : ''}`
                    : '') +
                  ' enforced 24/7 (no timer needed)'
                : 'Empty block list — nothing enforced outside of timed sessions'
            }
            theme={theme}
            isLast
          />
          {alwaysOnActive && (
            <Text style={[styles.statusFootnote, { color: theme.muted }]}>
              Empty your standalone block list (Side menu → Standalone Block) to stop always-on enforcement.
            </Text>
          )}
        </View>

        {/* Intro banner */}
        <View style={[styles.introBanner, { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '33' }]}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          <Text style={[styles.introText, { color: theme.text }]}>
            These tools run continuously in the background whenever they are switched on — they do not need a Focus session or standalone block to be active. While a block IS running, the toggles below stay locked on so they can&apos;t be disabled mid-session.
          </Text>
        </View>

        {/* ── Focus Session Behaviour ──────────────────────────────── */}
        <View collapsable={false}>
          <SectionHeader
            icon="hourglass-outline"
            title="Focus Session Behaviour"
            description="Controls what happens to a running focus session when you finish or skip a task early."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SwitchRow
              label="Keep focus active for the full duration"
              description={
                (settings.keepFocusActiveUntilTaskEnd ?? false)
                  ? 'On — completing a task early keeps app-blocking running until the original end time'
                  : 'Off — completing a task immediately ends the focus session (default)'
              }
              value={settings.keepFocusActiveUntilTaskEnd ?? false}
              onValueChange={(v) => update({ keepFocusActiveUntilTaskEnd: v })}
              theme={theme}
              isLast
            />
          </View>
        </View>

        {/* ── Keyword Blocker ──────────────────────────────────────── */}
        <View ref={sectionRefs.keywords} collapsable={false}>
          <SectionHeader
            icon="text-outline"
            title="Keyword Blocker"
            description="Redirects to home the moment any of your blocked words appear on screen — in URLs, search bars, or visible text."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.cardButton} onPress={() => setWordsModalVisible(true)}>
              <View style={styles.cardButtonContent}>
                <Text style={[styles.cardButtonLabel, { color: theme.text }]}>Manage Blocked Keywords</Text>
                <Text style={[styles.cardButtonDesc, { color: theme.muted }]}>
                  {(settings.blockedWords ?? []).length === 0
                    ? 'No keywords set — tap to add'
                    : `${(settings.blockedWords ?? []).length} keyword${(settings.blockedWords ?? []).length !== 1 ? 's' : ''} active`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.border} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── System Protection ────────────────────────────────────── */}
        <View ref={sectionRefs.system} collapsable={false}>
          <SectionHeader
            icon="lock-closed-outline"
            title="System Protection"
            description="Locks down Android system controls so there's no way to wriggle out through system menus. Each toggle runs continuously while it is on."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SwitchRow
              label="Protect system controls"
              description={
                blockProtectionActive && (settings.systemGuardEnabled ?? true)
                  ? 'Locked on — active block in progress'
                  : 'Power menu, Emergency mode & sensitive Settings pages — guarded all the time when on'
              }
              value={settings.systemGuardEnabled ?? true}
              onValueChange={handleSystemGuardToggle}
              disabled={blockProtectionActive && (settings.systemGuardEnabled ?? true)}
              theme={theme}
            />
            <SwitchRow
              label="Block install / uninstall"
              description={
                blockProtectionActive && (settings.blockInstallActionsEnabled ?? false)
                  ? 'Locked on — active block in progress'
                  : 'Stops Play Store installs & package-installer dialogs from slipping through — runs all the time when on'
              }
              value={settings.blockInstallActionsEnabled ?? false}
              onValueChange={handleInstallToggle}
              disabled={blockProtectionActive && (settings.blockInstallActionsEnabled ?? false)}
              theme={theme}
            />
            <SwitchRow
              label="Block YouTube Shorts"
              description={
                blockProtectionActive && (settings.blockYoutubeShortsEnabled ?? false)
                  ? 'Locked on — active block in progress'
                  : 'Sends you home the moment the Shorts player opens (regular YouTube stays usable) — runs all the time when on'
              }
              value={settings.blockYoutubeShortsEnabled ?? false}
              onValueChange={handleYoutubeToggle}
              disabled={blockProtectionActive && (settings.blockYoutubeShortsEnabled ?? false)}
              theme={theme}
            />
            <SwitchRow
              label="Block Instagram Reels"
              description={
                blockProtectionActive && (settings.blockInstagramReelsEnabled ?? false)
                  ? 'Locked on — active block in progress'
                  : 'Closes the Reels viewer (rest of Instagram stays usable) — runs all the time when on'
              }
              value={settings.blockInstagramReelsEnabled ?? false}
              onValueChange={handleReelsToggle}
              disabled={blockProtectionActive && (settings.blockInstagramReelsEnabled ?? false)}
              theme={theme}
              isLast
            />
          </View>
        </View>

        {/* ── Aversion Deterrents ──────────────────────────────────── */}
        <View ref={sectionRefs.aversion} collapsable={false}>
          <SectionHeader
            icon="flash-outline"
            title="Aversion Deterrents"
            description="Pair discomfort with distraction. Applied the instant a blocked app launches to build a negative reflex."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SwitchRow
              label="Screen Dimmer"
              description="Near-black overlay appears while a blocked app is open"
              value={settings.aversionDimmerEnabled}
              onValueChange={(v) => update({ aversionDimmerEnabled: v })}
              theme={theme}
            />
            <SwitchRow
              label="Vibration Harassment"
              description="Repeated pulse vibration while a blocked app is in foreground"
              value={settings.aversionVibrateEnabled}
              onValueChange={(v) => update({ aversionVibrateEnabled: v })}
              theme={theme}
            />
            <SwitchRow
              label="Sound Alert"
              description="Startling sound plays the moment a blocked app launches"
              value={settings.aversionSoundEnabled}
              onValueChange={(v) => update({ aversionSoundEnabled: v })}
              theme={theme}
              isLast
            />
          </View>
        </View>

        {/* ── Greyout Schedule ─────────────────────────────────────── */}
        <View ref={sectionRefs.greyout} collapsable={false}>
          <SectionHeader
            icon="time-outline"
            title="Greyout Schedule"
            description="Block specific apps during recurring time windows — independent of any focus session."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.cardButton} onPress={() => setGreyoutModalVisible(true)}>
              <View style={styles.cardButtonContent}>
                <Text style={[styles.cardButtonLabel, { color: theme.text }]}>Manage Time-Window Blocks</Text>
                <Text style={[styles.cardButtonDesc, { color: theme.muted }]}>
                  {(settings.greyoutSchedule ?? []).length === 0
                    ? 'No windows set — tap to configure'
                    : `${(settings.greyoutSchedule ?? []).length} window${(settings.greyoutSchedule ?? []).length !== 1 ? 's' : ''} active`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.border} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <BlockedWordsModal
        visible={wordsModalVisible}
        words={settings.blockedWords ?? []}
        locked={standaloneActive}
        onSave={async (words) => { await setBlockedWords(words); }}
        onClose={() => setWordsModalVisible(false)}
      />

      <GreyoutScheduleModal
        visible={greyoutModalVisible}
        windows={settings.greyoutSchedule ?? []}
        onSave={async (windows: GreyoutWindow[]) => { await update({ greyoutSchedule: windows }); }}
        onClose={() => setGreyoutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '18' }]}>
          <Ionicons name={icon} size={16} color={COLORS.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      <Text style={[styles.sectionDesc, { color: theme.muted }]}>{description}</Text>
    </View>
  );
}

function StatusRow({
  label,
  on,
  detail,
  theme,
  isLast = false,
}: {
  label: string;
  on: boolean;
  detail: string;
  theme: ReturnType<typeof useTheme>['theme'];
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.statusRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: on ? COLORS.green : theme.muted + '55' }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.statusRowLabel, { color: theme.text }]}>
          {label} <Text style={{ color: on ? COLORS.green : theme.muted, fontWeight: '700' }}>{on ? 'ON' : 'OFF'}</Text>
        </Text>
        <Text style={[styles.statusRowDetail, { color: theme.muted }]}>{detail}</Text>
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  theme,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  theme: ReturnType<typeof useTheme>['theme'];
  isLast?: boolean;
}) {
  return (
    <View style={[styles.switchRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.switchDesc, { color: theme.muted }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
        thumbColor={value ? COLORS.primary : COLORS.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: FONT.lg, fontWeight: '800' },
  subtitle: { fontSize: FONT.xs, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  introText: { flex: 1, fontSize: FONT.sm, lineHeight: 20 },
  statusCard: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  statusTitle: {
    fontSize: FONT.sm,
    fontWeight: '700',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  statusRowLabel: { fontSize: FONT.sm, fontWeight: '600' },
  statusRowDetail: { fontSize: FONT.xs, lineHeight: 16 },
  statusFootnote: {
    fontSize: FONT.xs,
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
    fontStyle: 'italic',
  },
  sectionHeader: {
    gap: 4,
    marginBottom: SPACING.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: FONT.md, fontWeight: '700' },
  sectionDesc: { fontSize: FONT.xs, lineHeight: 18, paddingLeft: 28 + SPACING.sm },
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardButtonContent: { flex: 1, gap: 2 },
  cardButtonLabel: { fontSize: FONT.sm, fontWeight: '600' },
  cardButtonDesc: { fontSize: FONT.xs },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  switchLabel: { fontSize: FONT.sm, fontWeight: '600' },
  switchDesc: { fontSize: FONT.xs, lineHeight: 17 },
});
