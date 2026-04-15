import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '@/styles/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Predefined keyword categories ────────────────────────────────────────────
// Must match the KEYWORD_CATEGORIES map in AppBlockerAccessibilityService.kt

export type KeywordCategoryKey =
  | 'social_media'
  | 'gambling'
  | 'adult'
  | 'shopping'
  | 'news'
  | 'gaming'
  | 'entertainment';

const CATEGORIES: Array<{ key: KeywordCategoryKey; label: string; icon: string; color: string; examples: string }> = [
  {
    key: 'social_media',
    label: 'Social Media',
    icon: 'people-outline',
    color: '#3B82F6',
    examples: 'facebook, reels, trending, fyp, stories…',
  },
  {
    key: 'gaming',
    label: 'Gaming',
    icon: 'game-controller-outline',
    color: '#8B5CF6',
    examples: 'fortnite, pubg, twitch, esports, battle royale…',
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    icon: 'play-circle-outline',
    color: '#EC4899',
    examples: 'netflix, new episode, trailer, autoplay…',
  },
  {
    key: 'shopping',
    label: 'Shopping',
    icon: 'cart-outline',
    color: '#F59E0B',
    examples: 'add to cart, flash sale, promo code, buy now…',
  },
  {
    key: 'news',
    label: 'News',
    icon: 'newspaper-outline',
    color: '#14B8A6',
    examples: 'breaking news, headlines, live updates…',
  },
  {
    key: 'gambling',
    label: 'Gambling',
    icon: 'cash-outline',
    color: '#EF4444',
    examples: 'bet, casino, jackpot, slots, odds…',
  },
  {
    key: 'adult',
    label: 'Adult',
    icon: 'eye-off-outline',
    color: '#6B7280',
    examples: 'nsfw, 18+, explicit, adult content…',
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  words: string[];
  locked?: boolean;
  activeCategories?: KeywordCategoryKey[];
  blockedDomains?: string[];
  onSave: (words: string[]) => void | Promise<void>;
  onSaveCategories?: (categories: KeywordCategoryKey[]) => void | Promise<void>;
  onSaveDomains?: (domains: string[]) => void | Promise<void>;
  onClose: () => void;
}

type ActiveTab = 'keywords' | 'categories' | 'domains';

/**
 * BlockedWordsModal
 *
 * Tabbed modal for managing all content-blocking inputs:
 *  • Keywords  — user-defined words that trigger a block when seen on screen
 *  • Categories — pre-built keyword bundles (social media, gambling, gaming, …)
 *  • Domains   — URL/domain patterns blocked via DNS proxy and URL-bar scanning
 */
export function BlockedWordsModal({
  visible,
  words,
  locked = false,
  activeCategories = [],
  blockedDomains = [],
  onSave,
  onSaveCategories,
  onSaveDomains,
  onClose,
}: Props) {
  const { theme } = useTheme();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('keywords');

  // ── Keywords tab state ─────────────────────────────────────────────────────
  const [localWords, setLocalWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const wordInputRef = useRef<TextInput>(null);

  // ── Categories tab state ───────────────────────────────────────────────────
  const [localCategories, setLocalCategories] = useState<KeywordCategoryKey[]>([]);

  // ── Domains tab state ──────────────────────────────────────────────────────
  const [localDomains, setLocalDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const domainInputRef = useRef<TextInput>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLocalWords([...words]);
    setLocalCategories([...activeCategories]);
    setLocalDomains([...blockedDomains]);
    setWordInput('');
    setDomainInput('');
    setActiveTab('keywords');
  }, [visible]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localWords);
      if (onSaveCategories) await onSaveCategories(localCategories);
      if (onSaveDomains) await onSaveDomains(localDomains);
      onClose();
    } catch (e) {
      console.error('[BlockedWordsModal] save failed', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Keyword helpers ────────────────────────────────────────────────────────
  const handleAddWord = () => {
    const trimmed = wordInput.trim().toLowerCase();
    if (!trimmed) return;
    if (localWords.includes(trimmed)) {
      Alert.alert('Already added', `"${trimmed}" is already in the list.`);
      return;
    }
    setLocalWords((prev) => [...prev, trimmed]);
    setWordInput('');
    wordInputRef.current?.focus();
  };

  const handleRemoveWord = (word: string) => {
    setLocalWords((prev) => prev.filter((w) => w !== word));
  };

  const handleClearAllWords = () => {
    Alert.alert('Clear All Keywords', 'Remove all blocked keywords?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => setLocalWords([]) },
    ]);
  };

  // ── Category helpers ───────────────────────────────────────────────────────
  const toggleCategory = (key: KeywordCategoryKey) => {
    setLocalCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  // ── Domain helpers ─────────────────────────────────────────────────────────
  const handleAddDomain = () => {
    const raw = domainInput.trim().toLowerCase();
    const cleaned = raw
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim();
    if (!cleaned) return;
    if (localDomains.includes(cleaned)) {
      Alert.alert('Already added', `"${cleaned}" is already in the list.`);
      return;
    }
    setLocalDomains((prev) => [...prev, cleaned]);
    setDomainInput('');
    domainInputRef.current?.focus();
  };

  const handleRemoveDomain = (domain: string) => {
    setLocalDomains((prev) => prev.filter((d) => d !== domain));
  };

  const handleClearAllDomains = () => {
    Alert.alert('Clear All Domains', 'Remove all blocked domains?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => setLocalDomains([]) },
    ]);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderWordChip = ({ item }: { item: string }) => (
    <View style={[styles.chip, { backgroundColor: COLORS.red + '12', borderColor: COLORS.red + '40' }]}>
      <Text style={[styles.chipText, { color: COLORS.red }]}>{item}</Text>
      {locked ? (
        <Ionicons name="lock-closed" size={14} color={COLORS.red + '60'} />
      ) : (
        <TouchableOpacity
          onPress={() => handleRemoveWord(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={17} color={COLORS.red} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDomainChip = ({ item }: { item: string }) => (
    <View style={[styles.chip, { backgroundColor: '#6366F120', borderColor: '#6366F140' }]}>
      <Ionicons name="globe-outline" size={13} color="#6366F1" style={{ marginRight: 3 }} />
      <Text style={[styles.chipText, { color: '#6366F1' }]}>{item}</Text>
      <TouchableOpacity
        onPress={() => handleRemoveDomain(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={17} color="#6366F1" />
      </TouchableOpacity>
    </View>
  );

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const tabs: Array<{ key: ActiveTab; label: string; icon: string; badge?: number }> = [
    { key: 'keywords', label: 'Keywords', icon: 'text-outline', badge: localWords.length || undefined },
    { key: 'categories', label: 'Categories', icon: 'grid-outline', badge: localCategories.length || undefined },
    { key: 'domains', label: 'Domains', icon: 'globe-outline', badge: localDomains.length || undefined },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Ionicons name="shield-outline" size={15} color={COLORS.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Content Blocking</Text>
            </View>
            <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* ── Lock banner ────────────────────────────────────────────────── */}
          {locked && (
            <View style={[styles.banner, { backgroundColor: COLORS.orange + '18', borderBottomColor: COLORS.orange + '40' }]}>
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.orange} />
              <Text style={[styles.bannerText, { color: COLORS.orange }]}>
                Block is active — existing keywords are locked. You can add new ones but cannot remove them until the block expires.
              </Text>
            </View>
          )}

          {/* ── Tab bar ────────────────────────────────────────────────────── */}
          <View style={[styles.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, isActive && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons name={tab.icon as any} size={15} color={isActive ? COLORS.primary : theme.muted} />
                  <Text style={[styles.tabLabel, { color: isActive ? COLORS.primary : theme.muted }]}>
                    {tab.label}
                  </Text>
                  {tab.badge != null && tab.badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.badgeText}>{tab.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ══ KEYWORDS TAB ═══════════════════════════════════════════════════ */}
          {activeTab === 'keywords' && (
            <>
              <View style={[styles.banner, { backgroundColor: COLORS.red + '10', borderBottomColor: COLORS.red + '28' }]}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.red} />
                <Text style={[styles.bannerText, { color: COLORS.red }]}>
                  If any of these words appear on screen during an active block, you are immediately redirected home.
                  Scanning fires on screen load AND when content updates (debounced to avoid false triggers).
                </Text>
              </View>

              {/* Input row */}
              <View style={[styles.inputRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TextInput
                  ref={wordInputRef}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                  placeholder="e.g. youtube, tiktok, shorts"
                  placeholderTextColor={theme.muted}
                  value={wordInput}
                  onChangeText={setWordInput}
                  onSubmitEditing={handleAddWord}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.addBtn, !wordInput.trim() && styles.addBtnDisabled]}
                  onPress={handleAddWord}
                  disabled={!wordInput.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={localWords}
                keyExtractor={(item) => item}
                renderItem={renderWordChip}
                contentContainerStyle={styles.chipList}
                ListHeaderComponent={
                  localWords.length > 0 ? (
                    <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
                      {localWords.length} keyword{localWords.length !== 1 ? 's' : ''} — matched against on-screen text
                    </Text>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="text-outline" size={40} color={COLORS.border} />
                    <Text style={[styles.emptyText, { color: theme.muted }]}>No keywords yet</Text>
                    <Text style={[styles.emptyHint, { color: theme.muted }]}>
                      Add a word above and it will be checked against app content during blocking.
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  localWords.length > 1 && !locked ? (
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearAllWords}>
                      <Ionicons name="trash-outline" size={15} color={COLORS.muted} />
                      <Text style={styles.clearText}>Clear All Keywords</Text>
                    </TouchableOpacity>
                  ) : null
                }
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}

          {/* ══ CATEGORIES TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <ScrollView contentContainerStyle={styles.categoriesContainer} keyboardShouldPersistTaps="handled">
              <View style={[styles.banner, { backgroundColor: '#3B82F610', borderBottomColor: '#3B82F628', marginBottom: SPACING.md }]}>
                <Ionicons name="information-circle-outline" size={14} color="#3B82F6" />
                <Text style={[styles.bannerText, { color: '#3B82F6' }]}>
                  Categories are pre-built keyword bundles. Activated categories are merged with your custom
                  keywords at runtime — no need to type individual words.
                </Text>
              </View>

              {CATEGORIES.map((cat) => {
                const isOn = localCategories.includes(cat.key);
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryRow,
                      { backgroundColor: theme.card, borderColor: isOn ? cat.color + '60' : theme.border },
                      isOn && { backgroundColor: cat.color + '0D' },
                    ]}
                    onPress={() => toggleCategory(cat.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryLabel, { color: isOn ? cat.color : theme.text }]}>{cat.label}</Text>
                      <Text style={[styles.categoryExamples, { color: theme.muted }]}>{cat.examples}</Text>
                    </View>
                    <View style={[
                      styles.categoryToggle,
                      { backgroundColor: isOn ? cat.color : theme.border + '60' },
                    ]}>
                      {isOn && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {localCategories.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearBtn, { marginTop: SPACING.md }]}
                  onPress={() => setLocalCategories([])}
                >
                  <Ionicons name="close-circle-outline" size={15} color={COLORS.muted} />
                  <Text style={styles.clearText}>Deactivate All Categories</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* ══ DOMAINS TAB ════════════════════════════════════════════════════ */}
          {activeTab === 'domains' && (
            <>
              <View style={[styles.banner, { backgroundColor: '#6366F110', borderBottomColor: '#6366F128' }]}>
                <Ionicons name="information-circle-outline" size={14} color="#6366F1" />
                <Text style={[styles.bannerText, { color: '#6366F1' }]}>
                  Domains are blocked at two levels: the VPN DNS proxy returns NXDOMAIN (apps can't even resolve
                  the address), AND the URL bar scanner redirects immediately if a blocked domain appears in the
                  browser address bar. Enter just the domain — e.g. reddit.com, not https://www.reddit.com.
                </Text>
              </View>

              {/* Suggested quick-add domains */}
              <View style={[styles.suggestionsWrap, { borderBottomColor: theme.border }]}>
                <Text style={[styles.suggestionsLabel, { color: theme.textSecondary }]}>Quick add:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
                  {['reddit.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com', 'facebook.com', 'snapchat.com', 'linkedin.com', 'twitch.tv', 'pinterest.com'].map((d) => {
                    const already = localDomains.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.suggestion, { backgroundColor: already ? '#6366F120' : theme.surface, borderColor: already ? '#6366F160' : theme.border }]}
                        onPress={() => {
                          if (!already) setLocalDomains((prev) => [...prev, d]);
                        }}
                        disabled={already}
                      >
                        <Text style={[styles.suggestionText, { color: already ? '#6366F1' : theme.textSecondary }]}>{d}</Text>
                        {already && <Ionicons name="checkmark" size={11} color="#6366F1" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Input row */}
              <View style={[styles.inputRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TextInput
                  ref={domainInputRef}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                  placeholder="e.g. reddit.com"
                  placeholderTextColor={theme.muted}
                  value={domainInput}
                  onChangeText={setDomainInput}
                  onSubmitEditing={handleAddDomain}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: '#6366F1' }, !domainInput.trim() && styles.addBtnDisabled]}
                  onPress={handleAddDomain}
                  disabled={!domainInput.trim()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={localDomains}
                keyExtractor={(item) => item}
                renderItem={renderDomainChip}
                contentContainerStyle={styles.chipList}
                ListHeaderComponent={
                  localDomains.length > 0 ? (
                    <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
                      {localDomains.length} domain{localDomains.length !== 1 ? 's' : ''} — blocked via DNS + URL bar
                    </Text>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="globe-outline" size={40} color={COLORS.border} />
                    <Text style={[styles.emptyText, { color: theme.muted }]}>No domains blocked yet</Text>
                    <Text style={[styles.emptyHint, { color: theme.muted }]}>
                      Add a domain above or tap a quick-add suggestion. Works across all browsers and apps.
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  localDomains.length > 1 ? (
                    <TouchableOpacity style={styles.clearBtn} onPress={handleClearAllDomains}>
                      <Ionicons name="trash-outline" size={15} color={COLORS.muted} />
                      <Text style={styles.clearText}>Clear All Domains</Text>
                    </TouchableOpacity>
                  ) : null
                }
                keyboardShouldPersistTaps="handled"
              />
            </>
          )}
        </KeyboardAvoidingView>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  headerBtn: { minWidth: 60, alignItems: 'center', paddingVertical: SPACING.xs },
  cancelText: { fontSize: FONT.sm, color: COLORS.muted },
  saveText: { fontSize: FONT.sm, fontWeight: '700', color: COLORS.primary, textAlign: 'right' },
  title: { fontSize: FONT.md, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: FONT.xs, fontWeight: '600' },
  badge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  bannerText: { flex: 1, fontSize: FONT.xs, lineHeight: 16 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.sm,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },

  chipList: { padding: SPACING.md, gap: SPACING.sm },
  countLabel: { fontSize: FONT.xs, fontWeight: '600', marginBottom: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginBottom: SPACING.xs,
  },
  chipText: { fontSize: FONT.sm, fontWeight: '600' },

  emptyWrap: { paddingTop: SPACING.xl * 2, alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONT.md, fontWeight: '600' },
  emptyHint: { fontSize: FONT.xs, textAlign: 'center', lineHeight: 18 },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  clearText: { fontSize: FONT.sm, color: COLORS.muted },

  // ── Categories tab ────────────────────────────────────────────────────────
  categoriesContainer: { padding: SPACING.md },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: FONT.sm, fontWeight: '700', marginBottom: 2 },
  categoryExamples: { fontSize: FONT.xs, lineHeight: 15 },
  categoryToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Domains tab ───────────────────────────────────────────────────────────
  suggestionsWrap: {
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
  },
  suggestionsLabel: { fontSize: FONT.xs, fontWeight: '600', marginBottom: 4 },
  suggestions: { gap: SPACING.xs, paddingRight: SPACING.md },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  suggestionText: { fontSize: FONT.xs, fontWeight: '600' },
});
