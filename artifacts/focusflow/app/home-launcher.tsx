/**
 * home-launcher.tsx
 *
 * Home Launcher configuration screen.
 *
 * Accessible from:
 *   - Block Enforcement → Home Launcher section → "Configure Home Launcher"
 *   - Permissions screen → Home Launcher card (when granted) → "Configure Launcher Settings"
 *
 * Locked during active standalone block (same pattern as permissions.tsx).
 * NOT blocked even if user adds com.android.settings to block list — this
 * screen lives inside the FocusFlow package which is never intercepted.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';
import { SharedPrefsModule } from '@/native-modules/SharedPrefsModule';
import { InstalledAppsModule, InstalledApp } from '@/native-modules/InstalledAppsModule';

const CLOCK_STYLES = ['digital', 'analog'] as const;

export default function HomeLauncherScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { state, updateSettings } = useApp();
  const { settings } = state;

  const standaloneActive = (() => {
    if (!settings.standaloneBlockUntil) return false;
    if ((settings.standaloneBlockPackages ?? []).length === 0) return false;
    return new Date(settings.standaloneBlockUntil).getTime() > Date.now();
  })();
  const isLocked = standaloneActive;

  const [isDefault, setIsDefault] = useState<boolean | null>(null);
  const [checkingDefault, setCheckingDefault] = useState(true);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  const blockedPackages = useMemo(
    () => new Set([...(settings.standaloneBlockPackages ?? []), ...(settings.alwaysOnPackages ?? [])]),
    [settings.standaloneBlockPackages, settings.alwaysOnPackages],
  );

  const checkDefault = useCallback(async () => {
    setCheckingDefault(true);
    try {
      const result = await SharedPrefsModule.isDefaultLauncher();
      setIsDefault(result);
    } catch {
      setIsDefault(false);
    } finally {
      setCheckingDefault(false);
    }
  }, []);

  useEffect(() => {
    void checkDefault();
    InstalledAppsModule.getInstalledApps()
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, [checkDefault]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void checkDefault();
    });
    return () => sub.remove();
  }, [checkDefault]);

  const update = useCallback(
    async (partial: Partial<typeof settings>) => {
      await updateSettings({ ...settings, ...partial });
    },
    [settings, updateSettings],
  );

  const handleSetDefault = () => {
    Linking.sendIntent('android.settings.HOME_SETTINGS').catch(() =>
      Linking.sendIntent('android.settings.MANAGE_DEFAULT_APPS_SETTINGS').catch(() =>
        Linking.openSettings(),
      ),
    );
  };

  const togglePinned = useCallback(
    (pkg: string) => {
      const pinned = new Set(settings.launcherPinnedPackages ?? []);
      if (pinned.has(pkg)) pinned.delete(pkg);
      else pinned.add(pkg);
      void update({ launcherPinnedPackages: Array.from(pinned) });
    },
    [settings.launcherPinnedPackages, update],
  );

  const toggleHidden = useCallback(
    (pkg: string) => {
      const hidden = new Set(settings.launcherHiddenPackages ?? []);
      if (hidden.has(pkg)) hidden.delete(pkg);
      else {
        if (!blockedPackages.has(pkg)) {
          Alert.alert(
            'Only blocked apps can be hidden',
            'Add this app to your standalone block list or always-on list first, then hide it from the drawer.',
          );
          return;
        }
        hidden.add(pkg);
      }
      void update({ launcherHiddenPackages: Array.from(hidden) });
    },
    [settings.launcherHiddenPackages, blockedPackages, update],
  );

  const pinnedSet = useMemo(
    () => new Set(settings.launcherPinnedPackages ?? []),
    [settings.launcherPinnedPackages],
  );
  const hiddenSet = useMemo(
    () => new Set(settings.launcherHiddenPackages ?? []),
    [settings.launcherHiddenPackages],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Text style={[styles.title, { color: theme.text }]}>Home Launcher</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            FocusFlow as your default home screen
          </Text>
        </View>
      </View>

      {/* Full-screen lock during standalone block */}
      {isLocked ? (
        <View style={[styles.lockedScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.lockedCard, { backgroundColor: theme.card, borderColor: COLORS.orange + '55' }]}>
            <View style={styles.lockedIconRing}>
              <Ionicons name="lock-closed" size={32} color={COLORS.orange} />
            </View>
            <Text style={[styles.lockedHeading, { color: theme.text }]}>Launcher Locked</Text>
            <Text style={[styles.lockedBody, { color: theme.muted }]}>
              Launcher settings are disabled while a standalone block is active.{'\n\n'}
              Stop the current block to change launcher configuration.
            </Text>
            <TouchableOpacity style={styles.lockedBackBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={16} color="#fff" />
              <Text style={styles.lockedBackText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        >

          {/* ── Status card ──────────────────────────────────────────── */}
          <View style={[styles.statusCard, {
            backgroundColor: isDefault ? COLORS.green + '12' : theme.card,
            borderColor: isDefault ? COLORS.green + '44' : theme.border,
          }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, {
                backgroundColor: (isDefault ? COLORS.green : COLORS.orange) + '20',
              }]}>
                {checkingDefault
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <Ionicons
                      name={isDefault ? 'checkmark-circle' : 'alert-circle-outline'}
                      size={24}
                      color={isDefault ? COLORS.green : COLORS.orange}
                    />
                }
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.statusTitle, { color: theme.text }]}>
                  {checkingDefault
                    ? 'Checking...'
                    : isDefault
                    ? 'FocusFlow is your default home app'
                    : 'FocusFlow is not the default home app'}
                </Text>
                <Text style={[styles.statusDesc, { color: theme.muted }]}>
                  {isDefault
                    ? 'Every app tap routes through FocusFlow — zero reaction delay, no brief flashes of blocked apps.'
                    : 'Set FocusFlow as your home app to get instant interception. Your existing home screen is preserved and can be re-selected at any time.'}
                </Text>
              </View>
            </View>
            {!isDefault && (
              <TouchableOpacity style={styles.setDefaultBtn} onPress={handleSetDefault} activeOpacity={0.85}>
                <Ionicons name="home-outline" size={16} color="#fff" />
                <Text style={styles.setDefaultBtnText}>Set as Default Home App</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Appearance ───────────────────────────────────────────── */}
          <SectionHeader icon="color-palette-outline" title="Appearance" description="Customise how the FocusFlow home screen looks." theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Clock style */}
            <View style={[styles.settingRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Clock style</Text>
                <Text style={[styles.settingDesc, { color: theme.muted }]}>
                  {settings.launcherClockStyle === 'analog' ? 'Analog clock face' : 'Large digital time display'}
                </Text>
              </View>
              <View style={styles.segmentControl}>
                {CLOCK_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.segmentBtn,
                      (settings.launcherClockStyle ?? 'digital') === style && styles.segmentBtnActive,
                    ]}
                    onPress={() => void update({ launcherClockStyle: style })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.segmentText,
                      (settings.launcherClockStyle ?? 'digital') === style && styles.segmentTextActive,
                    ]}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Wallpaper placeholder */}
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Alert.alert(
                  'Custom Wallpaper',
                  'Set a custom background for the FocusFlow launcher.\n\nRequires Media & Files permission — grant it from the Permissions screen first.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Permissions', onPress: () => router.push('/permissions') },
                  ],
                )
              }
              activeOpacity={0.75}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Wallpaper</Text>
                <Text style={[styles.settingDesc, { color: theme.muted }]}>
                  {settings.launcherWallpaperUri ? 'Custom image set' : 'Default dark gradient'}
                </Text>
              </View>
              <Ionicons name="image-outline" size={18} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {/* ── Pinned Apps ──────────────────────────────────────────── */}
          <SectionHeader
            icon="pin-outline"
            title="Pinned Apps"
            description="Apps shown as large icons on the home screen. Tap an app below to pin or unpin it."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {loadingApps ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={[styles.loadingText, { color: theme.muted }]}>Loading installed apps…</Text>
              </View>
            ) : apps.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: theme.muted }]}>No apps found — EAS build required</Text>
              </View>
            ) : (
              apps.slice(0, 24).map((app, idx) => (
                <AppToggleRow
                  key={app.packageName}
                  app={app}
                  checked={pinnedSet.has(app.packageName)}
                  onToggle={() => togglePinned(app.packageName)}
                  theme={theme}
                  isLast={idx === Math.min(apps.length, 24) - 1}
                  badge={blockedPackages.has(app.packageName) ? 'blocked' : undefined}
                />
              ))
            )}
          </View>
          {apps.length > 24 && (
            <Text style={[styles.moreAppsHint, { color: theme.muted }]}>
              Showing first 24 apps. Use search in the launcher drawer for full list.
            </Text>
          )}

          {/* ── Drawer Visibility ────────────────────────────────────── */}
          <SectionHeader
            icon="eye-off-outline"
            title="App Drawer Visibility"
            description="Hide blocked apps completely from the launcher drawer. Only apps already in your block list can be hidden."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {blockedPackages.size === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="information-circle-outline" size={18} color={theme.muted} />
                <Text style={[styles.emptyText, { color: theme.muted }]}>
                  No blocked apps yet. Add apps to your standalone or always-on list to hide them from the drawer.
                </Text>
              </View>
            ) : (
              Array.from(blockedPackages).map((pkg, idx) => {
                const app = apps.find((a) => a.packageName === pkg);
                const name = app?.appName ?? pkg;
                return (
                  <AppToggleRow
                    key={pkg}
                    app={{ packageName: pkg, appName: name, isIme: false }}
                    checked={hiddenSet.has(pkg)}
                    onToggle={() => toggleHidden(pkg)}
                    theme={theme}
                    isLast={idx === blockedPackages.size - 1}
                    badge="blocked"
                  />
                );
              })
            )}
          </View>

          {/* ── Launcher Protections ─────────────────────────────────── */}
          <SectionHeader
            icon="shield-checkmark-outline"
            title="Launcher Protections"
            description="Extra guards that apply specifically because FocusFlow is your home screen."
            theme={theme}
          />
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SwitchRow
              label="Lock launcher during standalone block"
              description="Intercepts the 'Default home app' Settings page and presses HOME while a standalone block is running — prevents switching away mid-session"
              value={settings.launcherLockDuringStandalone ?? true}
              onValueChange={(v) => void update({ launcherLockDuringStandalone: v })}
              theme={theme}
            />
            <SwitchRow
              label="Block uninstall from long-press"
              description="Suppresses the 'Uninstall' option in the launcher long-press context menu during active blocks, independent of System Protection"
              value={settings.launcherBlockUninstall ?? false}
              onValueChange={(v) => void update({ launcherBlockUninstall: v })}
              theme={theme}
              isLast
            />
          </View>

          <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: COLORS.primary + '33' }]}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.tipText, { color: theme.muted }]}>
              <Text style={{ fontWeight: '700', color: theme.text }}>How it works: </Text>
              FocusFlow's launcher reads your block list directly from storage — no accessibility service round-trip needed. When you tap a blocked app, the block overlay appears instantly, before the app process even starts.
            </Text>
          </View>
        </ScrollView>
      )}
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

function AppToggleRow({
  app,
  checked,
  onToggle,
  theme,
  isLast,
  badge,
}: {
  app: { packageName: string; appName: string; isIme: boolean };
  checked: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  isLast?: boolean;
  badge?: 'blocked';
}) {
  return (
    <TouchableOpacity
      style={[
        styles.appRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.appIconPlaceholder, { backgroundColor: COLORS.primary + '18' }]}>
        <Ionicons name="apps-outline" size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
            {app.appName}
          </Text>
          {badge === 'blocked' && (
            <View style={styles.blockedBadge}>
              <Text style={styles.blockedBadgeText}>blocked</Text>
            </View>
          )}
        </View>
        <Text style={[styles.appPkg, { color: theme.muted }]} numberOfLines={1}>
          {app.packageName}
        </Text>
      </View>
      <Switch
        value={checked}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
        thumbColor={checked ? COLORS.primary : COLORS.muted}
      />
    </TouchableOpacity>
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

  statusCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  statusTitle: { fontSize: FONT.sm, fontWeight: '700' },
  statusDesc: { fontSize: FONT.xs, lineHeight: 17 },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  setDefaultBtnText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700' },

  sectionHeader: { gap: 4, marginBottom: SPACING.xs },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  settingLabel: { fontSize: FONT.sm, fontWeight: '600' },
  settingDesc: { fontSize: FONT.xs, lineHeight: 17 },

  segmentControl: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: FONT.xs, fontWeight: '600', color: COLORS.muted },
  segmentTextActive: { color: '#fff' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  switchLabel: { fontSize: FONT.sm, fontWeight: '600' },
  switchDesc: { fontSize: FONT.xs, lineHeight: 17 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  loadingText: { fontSize: FONT.sm },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  emptyText: { flex: 1, fontSize: FONT.sm, lineHeight: 18 },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  appIconPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  appName: { fontSize: FONT.sm, fontWeight: '600' },
  appPkg: { fontSize: FONT.xs },
  blockedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.red + '22',
    borderWidth: 1,
    borderColor: COLORS.red + '44',
  },
  blockedBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.red },

  moreAppsHint: { fontSize: FONT.xs, textAlign: 'center', marginTop: -SPACING.xs },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  tipText: { flex: 1, fontSize: FONT.xs, lineHeight: 18 },

  lockedScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  lockedCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  lockedIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.orange + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.orange + '55',
    marginBottom: SPACING.xs,
  },
  lockedHeading: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  lockedBody: { fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
  lockedBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  lockedBackText: { fontSize: FONT.sm, fontWeight: '700', color: '#fff' },
});
