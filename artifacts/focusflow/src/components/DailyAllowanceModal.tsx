import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InstalledAppsModule, InstalledApp } from '@/native-modules/InstalledAppsModule';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  visible: boolean;
  selectedPackages: string[];
  onSave: (packages: string[]) => void | Promise<void>;
  onClose: () => void;
}

/**
 * DailyAllowanceModal
 *
 * A searchable list of all installed apps where the user can toggle which apps
 * get a once-per-day bypass during blocking. Each app has its own independent
 * toggle — selecting one app never affects another.
 */
export function DailyAllowanceModal({ visible, selectedPackages, onSave, onClose }: Props) {
  const { theme } = useTheme();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedPackages));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(selectedPackages));
    setSearch('');
    if (apps.length === 0) {
      setLoading(true);
      InstalledAppsModule.getInstalledApps()
        .then(setApps)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (a) => a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q),
    );
  }, [apps, search]);

  const toggle = useCallback((pkg: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) {
        next.delete(pkg);
      } else {
        next.add(pkg);
      }
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (e) {
      console.error('[DailyAllowanceModal] save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: InstalledApp }) => {
    const active = selected.has(item.packageName);
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.card }, active && styles.rowActive]}
        onPress={() => toggle(item.packageName)}
        activeOpacity={0.7}
      >
        {item.iconBase64 ? (
          <Image source={{ uri: `data:image/png;base64,${item.iconBase64}` }} style={styles.icon} />
        ) : (
          <View style={styles.iconPlaceholder}>
            <Ionicons name="apps-outline" size={22} color={COLORS.muted} />
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={[styles.packageName, { color: theme.muted }]} numberOfLines={1}>
            {item.packageName}
          </Text>
          {active && (
            <Text style={styles.activeLabel}>Allowed once per day</Text>
          )}
        </View>
        <View style={[styles.toggleBox, active && styles.toggleBoxActive]}>
          <Ionicons
            name={active ? 'sunny' : 'sunny-outline'}
            size={16}
            color={active ? COLORS.orange : COLORS.muted}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="sunny" size={16} color={COLORS.orange} />
            <Text style={[styles.title, { color: theme.text }]}>Daily Allowance</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: COLORS.orange + '15', borderBottomColor: COLORS.orange + '33' }]}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.orange} />
          <Text style={styles.infoText}>
            Each toggled app is allowed to open <Text style={{ fontWeight: '800' }}>once per day</Text> before blocking resumes. Resets at midnight. Each app has its own independent counter.
          </Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.packageName}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: theme.border }]} />}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Search */}
              <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={COLORS.muted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search apps…"
                  placeholderTextColor={COLORS.muted}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Count badge */}
              <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
                {selected.size > 0
                  ? `${selected.size} app${selected.size !== 1 ? 's' : ''} with once-per-day allowance`
                  : 'No apps have a daily allowance — tap to add one'}
              </Text>

              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Loading installed apps…
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="apps-outline" size={40} color={COLORS.border} />
                <Text style={[styles.emptyText, { color: theme.muted }]}>
                  {search ? 'No apps match your search.' : 'No user-installed apps found.'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            selected.size > 0 ? (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setSelected(new Set())}
              >
                <Ionicons name="close-circle-outline" size={16} color={COLORS.muted} />
                <Text style={styles.clearText}>Clear All Daily Allowances</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerBtn: { minWidth: 60, alignItems: 'center', paddingVertical: SPACING.xs },
  cancelText: { fontSize: FONT.sm, color: COLORS.muted },
  saveText: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.primary },
  title: { fontSize: FONT.md, fontWeight: '700' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: FONT.xs,
    color: COLORS.orange,
    lineHeight: 16,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: FONT.sm },

  countLabel: {
    fontSize: FONT.xs,
    fontWeight: '600',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  loadingText: { fontSize: FONT.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  rowActive: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },
  icon: { width: 40, height: 40, borderRadius: RADIUS.sm },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: { flex: 1, gap: 1 },
  appName: { fontSize: FONT.sm, fontWeight: '600' },
  packageName: { fontSize: FONT.xs },
  activeLabel: {
    fontSize: FONT.xs,
    color: COLORS.orange,
    fontWeight: '600',
    marginTop: 1,
  },

  toggleBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  toggleBoxActive: {
    backgroundColor: COLORS.orange + '20',
  },

  sep: { height: StyleSheet.hairlineWidth, marginLeft: 56 + SPACING.md },

  emptyWrap: {
    paddingTop: SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: { fontSize: FONT.sm },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginVertical: SPACING.lg,
    padding: SPACING.md,
  },
  clearText: {
    fontSize: FONT.sm,
    color: COLORS.muted,
  },
});
