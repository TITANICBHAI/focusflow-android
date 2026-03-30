import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { InstalledAppsModule, InstalledApp } from '@/native-modules/InstalledAppsModule';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';

interface Props {
  visible: boolean;
  blockedPackages: string[];
  blockUntil: string | null;
  onSave: (packages: string[], untilMs: number | null) => void | Promise<void>;
  onClose: () => void;
}

/**
 * StandaloneBlockModal
 *
 * Lets the user pick apps to block and set an expiry date/time.
 * Independent of any task — the block persists until the expiry, regardless
 * of whether a task focus session is running or not.
 *
 * When a standalone block and a task-based block are both active, both are
 * enforced simultaneously (union of blocked app lists).
 */
export function StandaloneBlockModal({
  visible,
  blockedPackages,
  blockUntil,
  onSave,
  onClose,
}: Props) {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(blockedPackages));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Date/time state — default to tomorrow at the current time if nothing is set
  const defaultUntil = blockUntil ? new Date(blockUntil) : dayjs().add(1, 'day').toDate();
  const [untilDate, setUntilDate] = useState<Date>(defaultUntil);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(new Set(blockedPackages));
    setSearch('');
    setUntilDate(blockUntil ? new Date(blockUntil) : dayjs().add(1, 'day').toDate());
    void loadApps();
  }, [visible]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await InstalledAppsModule.getInstalledApps();
      const sorted = result.slice().sort((a, b) =>
        a.appName.toLowerCase().localeCompare(b.appName.toLowerCase())
      );
      setApps(sorted);
    } catch (e) {
      console.warn('[StandaloneBlockModal] Failed to load apps', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (a) =>
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const toggle = (packageName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) {
        next.delete(packageName);
      } else {
        next.add(packageName);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      Alert.alert(
        'No Apps Selected',
        'Select at least one app to block, or use Clear Block to disable.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (untilDate.getTime() <= Date.now()) {
      Alert.alert(
        'Expiry in the Past',
        'Please set a future date and time for the block to expire.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSaving(true);
    try {
      await onSave(Array.from(selected), untilDate.getTime());
      onClose();
    } catch (e) {
      console.error('[StandaloneBlockModal] Failed to save', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    Alert.alert(
      'Clear Block',
      'This will disable the app block schedule and allow all apps again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await onSave([], null);
              onClose();
            } catch (e) {
              console.error('[StandaloneBlockModal] Failed to clear', e);
            }
          },
        },
      ]
    );
  };

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      // Keep the current time, just update the date part
      const merged = dayjs(date)
        .hour(untilDate.getHours())
        .minute(untilDate.getMinutes())
        .second(0)
        .toDate();
      setUntilDate(merged);
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      // Keep the current date, just update the time part
      const merged = dayjs(untilDate)
        .hour(date.getHours())
        .minute(date.getMinutes())
        .second(0)
        .toDate();
      setUntilDate(merged);
    }
  };

  const renderItem = ({ item }: { item: InstalledApp }) => {
    const blocked = selected.has(item.packageName);
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggle(item.packageName)} activeOpacity={0.7}>
        {item.iconBase64 ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.iconBase64}` }}
            style={styles.icon}
          />
        ) : (
          <View style={styles.iconPlaceholder}>
            <Ionicons name="apps-outline" size={22} color={COLORS.muted} />
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>{item.appName}</Text>
          <Text style={styles.packageName} numberOfLines={1}>{item.packageName}</Text>
        </View>
        <View style={[styles.checkbox, blocked && styles.checkboxBlocked]}>
          {blocked && <Ionicons name="ban" size={13} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Block Schedule</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Expiry date/time pickers */}
        <View style={styles.expirySection}>
          <Text style={styles.expirySectionLabel}>Block until</Text>
          <View style={styles.expiryRow}>
            <TouchableOpacity style={styles.expiryBtn} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.expiryBtnText}>{dayjs(untilDate).format('MMM D, YYYY')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expiryBtn} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.expiryBtnText}>{dayjs(untilDate).format('h:mm A')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={untilDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={untilDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps…"
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <Text style={styles.hint}>
          {selected.size > 0
            ? `${selected.size} app${selected.size !== 1 ? 's' : ''} will be blocked — tap to toggle`
            : 'Tap apps to block them — they cannot be opened until the expiry time'}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading installed apps…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.packageName}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {search ? 'No apps match your search.' : 'No user-installed apps found.'}
                </Text>
              </View>
            }
            ListFooterComponent={
              selected.size > 0 ? (
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                  <Text style={styles.clearBtnText}>Clear Block</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    minWidth: 60,
  },
  title: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  cancelText: {
    fontSize: FONT.md,
    color: COLORS.muted,
  },
  saveText: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
  },
  expirySection: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  expirySectionLabel: {
    fontSize: FONT.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: COLORS.muted,
  },
  expiryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  expiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  expiryBtnText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: FONT.md,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONT.xs,
    color: COLORS.muted,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  packageName: {
    fontSize: FONT.xs,
    color: COLORS.muted,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxBlocked: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  separator: {
    height: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT.sm,
    color: COLORS.muted,
  },
  emptyContainer: {
    paddingTop: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT.sm,
    color: COLORS.muted,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.red + '44',
    backgroundColor: COLORS.redLight,
  },
  clearBtnText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.red,
  },
});
