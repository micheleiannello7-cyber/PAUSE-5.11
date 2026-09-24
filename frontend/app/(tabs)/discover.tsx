import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import { api, StoryPreview } from "@/src/api";
import { makeStyles, useTheme, spacing, radius, typography } from "@/src/theme";
import { useUserId } from "@/src/session";
import { getReadingProgress, ReadingProgress } from "@/src/reading-progress";
import { PauseLogo } from "@/src/components/pause-logo";
import { GradientButton } from "@/src/components/gradient-button";
import { StoryHero } from "@/src/components/story-hero";
import { GlassSurface } from "@/src/components/glass";
import { HomeCategoryTile } from "@/src/components/home-controls";
import { HomeStoryDeck } from "@/src/components/home-story-deck";
import { HomeReadingProgress } from "@/src/components/home-reading-progress";
import { useI18n } from "@/src/i18n";

export default function Discover() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useUserId();
  const { t, lang } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const width = Math.min(windowWidth, 600);
  const gridPadding = width * 0.078;
  const gridGap = width * 0.05;
  const tileSize = (width - gridPadding * 2 - gridGap * 3) / 4;
  const { data: userState } = useQuery({
    queryKey: ["user", userId], queryFn: () => api.user(userId!), enabled: !!userId,
  });
  const interests = useMemo(() => userState?.interests?.filter((i) => i !== "all") ?? [], [userState?.interests]);
  const [focusCat, setFocusCat] = useState<string | null>(null);
  const deckInterests = useMemo(() => focusCat ? [focusCat] : interests, [focusCat, interests]);
  const interestsKey = deckInterests.join(",");
  const ready = !!userId && !!userState;
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.categories });

  const [resume, setResume] = useState<ReadingProgress | null>(null);
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    getReadingProgress(userId).then(setResume);
  }, [userId]));
  const showResume = !!resume && resume.progress < 0.95 && !userState?.completed_story_ids?.includes(resume.story.id);

  const [deck, setDeck] = useState<StoryPreview[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const generation = useRef(0);
  const audienceKey = useRef<string | null>(null);
  const resetDeck = useCallback(() => {
    generation.current += 1;
    setDeck([]);
    setCursor(0);
    setLoading(false);
    setExhausted(false);
    setError(false);
  }, []);

  const loadMore = useCallback(async (excludeIds: string[]) => {
    if (!userId) return;
    const requestGeneration = generation.current;
    setLoading(true);
    try {
      const story = await api.discoverNext(userId, deckInterests, excludeIds);
      // A slow response from an old topic must not overwrite a freshly selected filter.
      if (requestGeneration !== generation.current) return;
      setDeck((prev) => prev.some((item) => item.id === story.id) ? prev : [...prev, story]);
      setError(false);
    } catch {
      if (requestGeneration !== generation.current) return;
      if (excludeIds.length === 0) setError(true);
      else setExhausted(true);
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [userId, deckInterests]);

  useEffect(() => {
    if (!ready) return;
    const currentKey = `${userId}|${interestsKey}|${lang}`;
    if (audienceKey.current !== currentKey) {
      audienceKey.current = currentKey;
      resetDeck();
      return;
    }
    if (exhausted || loading || error) return;
    // Commit a stable seven-story carousel. Appending when the cursor wraps
    // changes the neighbour behind the user's finger and breaks reverse swipes.
    if (deck.length < 7) void loadMore(deck.map((s) => s.id));
  }, [ready, userId, interestsKey, lang, exhausted, loading, error, deck, cursor, loadMore, resetDeck]);

  const tileCats = useMemo(() => {
    const all = categories ?? [];
    const mine = interests.length ? all.filter((c) => interests.includes(c.id)) : all;
    const order = ["scienza", "spazio", "tecnologia", "natura", "animali", "storia", "arte", "corpo-umano"];
    return [...(mine.length ? mine : all)].sort((a, b) => {
      const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
      return rank(a.id) - rank(b.id);
    }).slice(0, 8);
  }, [categories, interests]);
  const showEmpty = deck.length === 0 && (exhausted || (error && !loading));
  // Match the reference on its aspect ratio; use extra portrait height for
  // the cover instead of leaving a large void between categories and progress.
  const usableHeight = windowHeight - insets.top - Math.max(insets.bottom, 10) - 64;
  const cardHeight = Math.max(264, width * (700 / 942), Math.min(width * 1.06, usableHeight * 0.48));
  // Dalla card si parte sempre dall'introduzione (nessun salto al capitolo 1).
  const openStory = useCallback((story: StoryPreview) => router.push(`/deep-dive/${story.id}`), [router]);
  const listenStory = useCallback((story: StoryPreview) => {
    if (userState?.is_premium) router.push(`/deep-dive/${story.id}?listen=1`);
  }, [router, userState?.is_premium]);

  return (
    <View testID="home-screen" style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { width }]} testID="home-header">
        <PauseLogo prominent />
      </View>
      <ScrollView testID="home-content" style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.column, { width }]}>
        {showEmpty ? (
          <View testID="discover-empty" style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={44} color={colors.success} />
            <Text testID="discover-empty-title" style={styles.emptyTitle}>{t.explored_all}</Text>
            <Text testID="discover-empty-message" style={styles.emptyText}>{t.explored_all_sub}</Text>
            <GradientButton label={t.restart} icon="refresh" onPress={resetDeck} testID="reset-skipped" style={styles.resetBtn} />
          </View>
        ) : deck[cursor] && (deck.length >= 7 || exhausted) ? (
          <HomeStoryDeck key={`${interestsKey}|${lang}|${generation.current}`} deck={deck} cursor={cursor} width={width} height={cardHeight} onChange={setCursor} onOpen={openStory}
            onListen={userState?.is_premium ? listenStory : undefined} />
        ) : (
          <View testID="discover-loading" style={[styles.loading, { height: cardHeight + 26 }]}><ActivityIndicator color={colors.brand} /></View>
        )}
        {tileCats.length ? (
          <View style={[styles.catsSection, { paddingHorizontal: gridPadding }]} testID="home-categories">
            <View style={styles.catsHead}>
              <Text testID="home-categories-title" style={styles.catsTitle}>{t.your_categories}</Text>
              <Pressable onPress={() => router.push("/(tabs)/explore")} style={styles.seeAll} testID="home-see-all" accessibilityRole="button">
                <Text testID="home-see-all-label" style={styles.seeAllText}>{t.see_all}</Text>
                <Ionicons name="chevron-forward-outline" size={14} color={colors.muted} />
              </Pressable>
            </View>
            <View style={[styles.catsGrid, { columnGap: gridGap }]} testID="home-category-list">
              {tileCats.map((cat) => <HomeCategoryTile key={cat.id} cat={cat} size={tileSize} active={focusCat === cat.id} onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setFocusCat((prev) => prev === cat.id ? null : cat.id);
              }} />)}
            </View>
          </View>
        ) : null}
        <View style={styles.progressSection}>
          <HomeReadingProgress count={userState?.completed_story_ids.length ?? 0} />
        </View>
        {showResume && resume ? <View style={styles.resumeSection}><ResumeCard progress={resume} onPress={() => router.push(`/deep-dive/${resume.story.id}`)} /></View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ResumeCard({ progress, onPress }: { progress: ReadingProgress; onPress: () => void }) {
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  const pct = Math.round(progress.progress * 100);
  return (
    <Pressable onPress={onPress} testID="resume-reading-card" accessibilityRole="button" style={({ pressed }) => [styles.resumeWrap, pressed && styles.pressed]}>
      <GlassSurface intensity="strong" glow glowColor={colors.cyanGlow} radiusOverride={radius.lg}>
        <View style={styles.resumeInner}>
          <View style={styles.resumeThumbWrap}>
            <StoryHero story={progress.story} style={styles.resumeThumb} iconSize={26} size="thumb" />
            <View style={styles.resumeThumbGlow} />
          </View>
          <View style={styles.resumeInfo}>
            <View style={styles.resumeEyebrowRow}>
              <Ionicons name="book" size={11} color={colors.cyan} />
              <Text testID="resume-reading-label" style={styles.resumeEyebrow}>{t.resume_eyebrow}</Text>
              <View style={styles.resumePctPill}><Text testID="resume-reading-progress" style={styles.resumePctText}>{pct}%</Text></View>
            </View>
            <Text testID="resume-reading-title" style={styles.resumeTitle} numberOfLines={1}>{progress.story.title}</Text>
            <View style={styles.resumeTrack}>
              <LinearGradient colors={[colors.cyan, colors.cyanSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.resumeFill, { width: `${Math.max(pct, 4)}%` }]} />
            </View>
          </View>
          <View style={styles.resumePlayWrap}><Ionicons name="play" size={16} color={colors.cyan} /></View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center" },
  header: { paddingHorizontal: 12, height: 58, flexDirection: "row", alignItems: "center" },
  scroll: { flex: 1, alignSelf: "stretch" },
  content: { flexGrow: 1, alignItems: "center", paddingBottom: 18 },
  column: { flexGrow: 1 },
  catsSection: {},
  catsHead: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catsTitle: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 16 },
  seeAll: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3 },
  seeAllText: { color: colors.onSurfaceTertiary, fontFamily: typography.bodyMedium, fontSize: 10 },
  catsGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  progressSection: { marginHorizontal: "5.4%", marginTop: "auto", paddingTop: 20 },
  resumeSection: { marginHorizontal: spacing.xl, marginTop: 18 },
  loading: { alignItems: "center", justifyContent: "center" },
  resumeWrap: { marginBottom: spacing.lg },
  pressed: { opacity: 0.92 },
  resumeInner: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, paddingRight: spacing.md },
  resumeThumbWrap: { position: "relative" },
  resumeThumb: { width: 58, height: 58, borderRadius: radius.md, overflow: "hidden" },
  resumeThumbGlow: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderRadius: radius.md + 1, borderWidth: 1, borderColor: colors.cyan + "55" },
  resumeInfo: { flex: 1, gap: 6 },
  resumeEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  resumeEyebrow: { color: colors.cyan, fontFamily: typography.bodyBold, fontSize: 9, letterSpacing: 1.5 },
  resumePctPill: { marginLeft: "auto", paddingHorizontal: 8, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.cyanGlowSoft, borderWidth: 1, borderColor: colors.cyan + "40" },
  resumePctText: { color: colors.cyan, fontFamily: typography.bodyBold, fontSize: 10 },
  resumeTitle: { color: colors.onSurface, fontFamily: typography.bodyBold, fontSize: 14, lineHeight: 18 },
  resumeTrack: { height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: "hidden" },
  resumeFill: { height: "100%", borderRadius: 2 },
  resumePlayWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.cyanGlowSoft, borderWidth: 1, borderColor: colors.cyan + "55", marginLeft: spacing.xs },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: spacing.md },
  emptyTitle: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 18 },
  emptyText: { color: colors.muted, fontFamily: typography.body, fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: spacing.lg },
  resetBtn: { alignSelf: "stretch", marginTop: spacing.sm },
}));