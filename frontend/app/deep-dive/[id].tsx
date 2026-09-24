import { useRef, useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, Share, useWindowDimensions, LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, useAnimatedRef, useAnimatedReaction, scrollTo, withSpring, cancelAnimation,
  runOnJS, interpolate, Extrapolation, SharedValue,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { api } from "@/src/api";
import { makeStyles, useTheme, withAlpha, spacing, typography, ThemeColors } from "@/src/theme";
import { useUserId } from "@/src/session";
import { useStoryActions } from "@/src/hooks/use-story-actions";
import { saveReadingProgress, clearReadingProgress, getReadingProgress, toStoryPreview } from "@/src/reading-progress";
import { IntroCtaButton } from "@/src/components/intro-cta-button";
import { SwipeBack } from "@/src/components/swipe-back";
import { StoryInfoGrid } from "@/src/components/story-info-grid";
import { ReaderMorphCover, CoverFrame } from "@/src/components/reader-morph-cover";
import { HighlightedTitle } from "@/src/components/highlighted-title";
import { StoryAudioProvider, AudioSheet, AudioMiniBadge, IntroListenButton } from "@/src/components/story-audio-player";
import { ReaderHeader, READER_HEADER_H } from "@/src/components/reader-header";
import { ChapterSection, READER_MAX_W } from "@/src/components/reader-section";
import { ReaderEnding } from "@/src/components/reader-ending";
import { Screen } from "@/src/components/screen";
import { StoryShareCard, SHARE_CARD_WIDTH } from "@/src/components/story-share-card";
import { useI18n } from "@/src/i18n";
import { CoachTip } from "@/src/coach-tips";

// Lettura verticale a cascata: copertina in alto, poi introduzione, capitoli
// e conclusione uno dopo l'altro in un'unica pagina scrollabile. Le "sezioni"
// (0 = intro, 1..n = capitoli, n+1 = fine) usano la stessa scala del vecchio
// pager, così il progresso di lettura salvato resta compatibile.
export default function DeepDive() {
  // `start=1` (dalla Home "Leggi la curiosità"): si apre direttamente sul
  // primo capitolo, senza l'introduzione.
  const { id, start, listen } = useLocalSearchParams<{ id: string; start?: string; listen?: string }>();
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const router = useRouter();
  const qc = useQueryClient();
  const userId = useUserId();
  const completedRef = useRef<string | null>(null);
  const shareRef = useRef<View>(null);
  const startedAtRef = useRef<number>(Date.now());
  const [section, setSection] = useState(0);
  const [audioOpen, setAudioOpen] = useState(listen === "1");
  // Il badge che riapre il player compare solo dopo il primo tocco su "Ascolta".
  const [listenStarted, setListenStarted] = useState(listen === "1");
  const openAudio = () => { setListenStarted(true); setAudioOpen(true); };
  // Il progresso di lettura si salva solo dopo un vero gesto del lettore
  // (non per la posizione su cui si è aperta la storia automaticamente).
  const touchedRef = useRef(false);
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => api.story(id!),
    enabled: !!id,
  });
  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.user(userId!),
    enabled: !!userId,
  });
  const { toggle } = useStoryActions(userId, id);
  const isPremium = !!user?.is_premium;

  // Sezioni: intro · una per capitolo · conclusione ("Da ricordare" + prossima storia).
  const chapterCount = story?.chapters.length ?? 0;
  const sectionCount = chapterCount + 2;
  const lastSection = sectionCount - 1;

  // --- Scroll: posizione continua, offset delle sezioni, sezione corrente ---
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const progress = useSharedValue(0);
  const headerSolid = useSharedValue(0);
  // Titolo nella barra: compare quando il titolo grande della copertina scorre via.
  const headerReveal = useSharedValue(0);
  const bigTitleY = useSharedValue(0);
  const offsets = useSharedValue<number[]>([]);
  const heights = useSharedValue<number[]>([]);
  const currentSV = useSharedValue(-1);
  const headerBottom = insets.top + READER_HEADER_H;
  // Geometria della card copertina nella presentazione: grande, arrotondata,
  // staccata dai bordi. La stessa geometria è il punto di partenza dello
  // sfondo che si trasforma (ReaderMorphCover).
  const columnW = Math.min(winW, READER_MAX_W);
  const cardW = columnW - spacing.xl * 2;
  // Rettangolare come la card della Home (angoli 19), mai oltre il 42% dello schermo.
  const cardH = Math.min(Math.round(cardW * 0.8), Math.round(winH * 0.42));
  const cover: CoverFrame = { top: insets.top + spacing.lg, left: (winW - columnW) / 2 + spacing.xl, width: cardW, height: cardH, radius: 19 };
  // La card si aggancia in alto e finisce di allargarsi qui.
  const morphEnd = cover.top + Math.round(cardH * 0.7);
  // Una sezione diventa "corrente" quando il suo inizio supera il primo terzo
  // dello schermo: si aggiorna mentre si scorre, senza bloccare nulla.
  const anchor = Math.round(winH * 0.38);
  const pendingScroll = useRef<number | null>(start === "1" ? 1 : null);
  // Ultimo scroll programmatico (apertura su un capitolo, ripresa): solo un
  // movimento del lettore oltre quel punto conta come "gesto" per salvare.
  const autoY = useSharedValue(0);
  const touchedSV = useSharedValue(false);
  const markTouched = () => { touchedRef.current = true; touchedSV.value = true; };

  // Aggancio ai capitoli: a fine gesto (o fine inerzia) il capitolo più vicino
  // si allinea da solo sotto la barra con una molla leggera. Ogni capitolo ha
  // almeno l'altezza dello schermo, così quando è allineato non si vede nulla
  // del capitolo prima o dopo. Se il lettore è nel mezzo di un capitolo lungo
  // (lontano da ogni inizio), lo scroll resta libero.
  const snapping = useSharedValue(false);
  const snapY = useSharedValue(0);
  const maxScroll = useSharedValue(0);
  const snapIndex = useSharedValue(0);   // ultima sezione agganciata (centrata)
  const dragStartY = useSharedValue(0);  // offset all'inizio del gesto → direzione
  const flingSpeed = useSharedValue(0);  // |velocità| a fine trascinamento → soglia
  useAnimatedReaction(
    () => snapY.value,
    (v, prev) => { if (snapping.value && v !== prev) scrollTo(scrollRef, 0, v, false); },
  );

  // Posizione di riposo che CENTRA verticalmente la sezione i nello schermo.
  // Le sezioni più alte dello schermo si allineano invece con l'inizio sotto la
  // barra (si legge dall'alto). Restituisce l'offset di scroll (clampato).
  const restYFor = (i: number): number => {
    "worklet";
    const offs = offsets.value;
    const hs = heights.value;
    const y = offs[i];
    if (y == null || y < 0) return 0;
    const readable = winH - headerBottom;
    const h = hs[i] ?? 0;
    let target: number;
    if (h === 0 || h > readable) target = y - headerBottom - spacing.md;      // alta: inizio sotto la barra
    else target = y + h / 2 - (winH + headerBottom) / 2;                       // corta: centrata
    return Math.min(maxScroll.value, Math.max(0, target));
  };

  // Aggancio a molla: a fine gesto/inerzia la sezione bersaglio si CENTRA da
  // sola con un piccolo rimbalzo organico (leggero overshoot poi si assesta).
  // Un fling medio-lungo che supera il ~40% verso la sezione adiacente completa
  // il passaggio; un piccolo trascinamento ricentra la sezione corrente.
  const settle = (y: number, speed: number, _vh: number) => {
    "worklet";
    const offs = offsets.value;
    const hs = heights.value;
    const n = offs.length;
    if (n === 0) return;
    // Sezione più alta dello schermo (es. "Da ricordare" in fondo, o un
    // capitolo lungo): se il lettore è già DENTRO, oltre l'inizio, lo scroll
    // resta libero — nessun ricentraggio né rimbalzo. Ci si aggancia solo
    // vicino a un confine tra sezioni.
    const readable = winH - headerBottom;
    for (let i = 0; i < n; i++) {
      if (offs[i] < 0) continue;
      const h = hs[i] ?? 0;
      if (h <= readable) continue;
      const startY = restYFor(i);
      const endY = Math.min(maxScroll.value, offs[i] + h - winH);
      if (y > startY + 12 && (i === n - 1 || y < endY - 12)) { snapIndex.value = i; return; }
    }
    // In fondo alla pagina non c'è più nulla da allineare.
    if (y >= maxScroll.value - 12) { snapIndex.value = n - 1; return; }
    // Posizioni di riposo: la copertina (y = 0, solo titolo) e ogni sezione.
    // Si sceglie la più vicina alla posizione attuale (l'inerzia ha già
    // fatto la maggior parte del lavoro).
    const rests: number[] = [0];
    const owners: number[] = [0];
    for (let i = 0; i < n; i++) {
      if (offs[i] < 0) continue;
      rests.push(restYFor(i));
      owners.push(i);
    }
    let best = 0;
    let bestDist = Infinity;
    for (let k = 0; k < rests.length; k++) {
      const d = Math.abs(rests[k] - y);
      if (d < bestDist) { bestDist = d; best = k; }
    }
    // Direzione del gesto e soglia: più forte è il fling, meno strada serve
    // per avanzare (forte → 12%, medio → 40%, lento → 50%).
    const dir = y >= dragStartY.value ? 1 : -1;
    const thr = speed > 1.6 ? 0.12 : speed > 0.5 ? 0.4 : 0.5;
    const nb = best + dir;
    if (nb >= 0 && nb < rests.length) {
      const a = rests[best];
      const b = rests[nb];
      const denom = Math.abs(b - a) || 1;
      const frac = Math.abs(y - a) / denom;
      if (frac >= thr && ((dir > 0 && b >= a) || (dir < 0 && b <= a))) best = nb;
    }
    const target = rests[best];
    snapIndex.value = owners[best];
    autoY.value = target;
    snapping.value = true;
    snapY.value = y;
    // Molla sotto-smorzata → micro-rimbalzo tattile all'arrivo.
    snapY.value = withSpring(target, { damping: 14, stiffness: 130, mass: 0.9 }, (done) => { if (done) snapping.value = false; });
  };

  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: (e) => { snapping.value = false; cancelAnimation(snapY); dragStartY.value = e.contentOffset.y; },
    onEndDrag: (e) => {
      const speed = Math.abs(e.velocity?.y ?? 0);
      flingSpeed.value = speed;
      // Rilascio lento (nessuna inerzia in arrivo): aggancia subito.
      if (speed <= 0.15) settle(e.contentOffset.y, speed, e.layoutMeasurement.height);
      // Altrimenti lascia scorrere l'inerzia nativa e aggancia a fine slancio.
    },
    onMomentumEnd: (e) => {
      settle(e.contentOffset.y, flingSpeed.value, e.layoutMeasurement.height);
      flingSpeed.value = 0;
    },
    onScroll: (e) => {
      const y = e.contentOffset.y;
      scrollY.value = y;
      if (!touchedSV.value && Math.abs(y - autoY.value) > 48) {
        touchedSV.value = true;
        runOnJS(markTouched)();
      }
      const range = Math.max(1, e.contentSize.height - e.layoutMeasurement.height);
      maxScroll.value = range;
      progress.value = Math.max(0, Math.min(1, y / range));
      // La barra diventa vetro insieme al titolo piccolo (stessa soglia).
      const titleTop = bigTitleY.value - headerBottom;
      const reveal = bigTitleY.value > 0 ? interpolate(y, [titleTop - 40, titleTop + 48], [0, 1], Extrapolation.CLAMP) : 0;
      headerReveal.value = reveal;
      headerSolid.value = reveal;
      const offs = offsets.value;
      let idx = 0;
      for (let i = 0; i < offs.length; i++) {
        if (offs[i] >= 0 && offs[i] <= y + anchor) idx = i;
      }
      if (offs.length > 0 && y + e.layoutMeasurement.height >= e.contentSize.height - 24) idx = offs.length - 1;
      if (idx !== currentSV.value) {
        currentSV.value = idx;
        runOnJS(setSection)(idx);
      }
    },
  });

  const scrollToSection = useCallback((i: number, animated = true) => {
    const offs = offsets.value;
    const hs = heights.value;
    const y = offs[i];
    if (y == null || y < 0) return;
    const readable = winH - headerBottom;
    const h = hs[i] ?? 0;
    const target = (h === 0 || h > readable)
      ? Math.max(0, y - headerBottom - spacing.md)          // alta: inizio sotto la barra
      : Math.max(0, y + h / 2 - (winH + headerBottom) / 2); // corta: centrata
    autoY.value = target;
    snapIndex.value = i;
    scrollRef.current?.scrollTo({ y: target, animated });
  }, [offsets, heights, scrollRef, headerBottom, winH, autoY, snapIndex]);

  const onSectionLayout = (i: number) => (e: LayoutChangeEvent) => {
    const y = Math.round(e.nativeEvent.layout.y);
    const h = Math.round(e.nativeEvent.layout.height);
    const next = offsets.value.length === sectionCount ? [...offsets.value] : Array(sectionCount).fill(-1);
    const nh = heights.value.length === sectionCount ? [...heights.value] : Array(sectionCount).fill(0);
    if (next[i] === y && nh[i] === h) return;
    next[i] = y;
    nh[i] = h;
    offsets.value = next;
    heights.value = nh;
    if (pendingScroll.current === i) {
      pendingScroll.current = null;
      scrollToSection(i, false);
    }
  };

  // Riprende dalla sezione in cui il lettore aveva lasciato questa storia.
  useEffect(() => {
    if (!userId || !id || !story) return;
    getReadingProgress(userId).then((p) => {
      if (p && p.story.id === id && p.page > 0 && p.page < lastSection) {
        setSection(p.page);
        if (offsets.value[p.page] >= 0) scrollToSection(p.page, false);
        else pendingScroll.current = p.page;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, id, !!story]);

  // Mark as completed once: when the reader reaches the end (or taps "next").
  const markComplete = useCallback(async () => {
    if (!userId || !id || completedRef.current === id) return;
    completedRef.current = id;
    try {
      await clearReadingProgress(userId);
      const secs = Math.round((Date.now() - startedAtRef.current) / 1000);
      await api.complete(userId, id, story?.deep_dive_time_min ?? 2, secs);
      qc.invalidateQueries({ queryKey: ["user"] });
      qc.invalidateQueries({ queryKey: ["limit"] });
    } catch {}
  }, [userId, id, story?.deep_dive_time_min, qc]);

  // A curiosity is counted as soon as it's opened — but only after a 5s dwell,
  // so backing out within 5 seconds (misclick / quick peek) does NOT consume
  // one of the session's stories. Leaving the screen clears the timer.
  const markCompleteRef = useRef(markComplete);
  markCompleteRef.current = markComplete;
  useEffect(() => {
    if (!userId || !id) return;
    const timer = setTimeout(() => markCompleteRef.current(), 5000);
    return () => clearTimeout(timer);
  }, [userId, id]);

  // Narration is resolved lazily by the audio player (status → persistent
  // URL); nothing is generated until the listener taps play.

  useEffect(() => {
    if (!story) return;
    const ratio = lastSection > 0 ? section / lastSection : 0;
    if (section >= lastSection) {
      markComplete();
      return;
    }
    // Remember genuine mid-read positions only (skip the intro).
    if (userId && section > 0 && touchedRef.current && completedRef.current !== id) {
      saveReadingProgress(userId, { story: toStoryPreview(story), page: section, progress: ratio, updatedAt: Date.now() });
    }
  }, [section, story, lastSection, userId, id, markComplete]);

  if (isLoading || !story) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const bookmarked = user?.bookmarked_story_ids.includes(story.id) ?? false;
  const liked = user?.liked_story_ids.includes(story.id) ?? false;

  const onNext = async () => {
    await markComplete();
    try {
      // 5 storie → pausa di 4 ore: se il limite è scattato, mostra la schermata di pausa.
      if (userId) {
        const limit = await api.limitCheck(userId);
        if (limit.blocked) {
          router.replace("/pause-limit");
          return;
        }
      }
      const next = await api.nextStory(story.id, userId ?? undefined);
      router.replace(`/deep-dive/${next.id}`);
    } catch {}
  };

  // Share a ready-made image card (cover + title + hook + brand). Falls back
  // to a plain text share where image sharing isn't available (e.g. web).
  const onShare = async () => {
    try {
      if (shareRef.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(shareRef, { format: "png", quality: 1, result: "tmpfile" });
        await Sharing.shareAsync(uri, { dialogTitle: t.share, mimeType: "image/png", UTI: "public.png" });
        return;
      }
    } catch {}
    Share.share({ message: `${story.title} — ${t.share_suffix}` }).catch(() => {});
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/discover"));

  // Barra in alto: titolo della storia sempre in vista + indicatore in
  // maiuscolo "3 DI 7" · "DA RICORDARE". Nell'introduzione l'etichetta è già
  // scritta nella pagina (occhiello con il pallino): qui resta solo la barra.
  const progressLabel =
    section === 0 ? ""
    : section >= lastSection ? t.remember.toUpperCase()
    : `${section} ${t.of.toUpperCase()} ${chapterCount}`;

  return (
    <Screen style={styles.container}>
      <SwipeBack onBack={goBack}>
      {/* Fondo notte: dal nero al blu-notte verso il basso, per profondità. */}
      <LinearGradient
        colors={[colors.surface, colors.surfaceDeep]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Copertina: card arrotondata a riposo, sfondo cinematografico scorrendo. */}
      <ReaderMorphCover story={story} scrollY={scrollY} frame={cover} screenW={winW} screenH={winH} morphEnd={morphEnd} />
      <StoryAudioProvider key={story.id} storyId={story.id} autoplay={listen === "1" && isPremium}>
        <ReaderHeader
          topInset={insets.top + spacing.xs}
          title={story.title}
          highlight={story.highlight_words}
          label={progressLabel}
          labelColor={section === 0 ? colors.intro : section >= lastSection ? colors.warning : colors.cyan}
          progress={progress}
          solid={headerSolid}
          reveal={headerReveal}
          corner={isPremium ? <AudioMiniBadge visible={listenStarted && !audioOpen} onPress={() => setAudioOpen(true)} /> : null}
        />

        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={markTouched}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          testID="deep-dive-scroll"
        >
          {/* Presentazione (sezione 0): spazio per la card copertina (l'immagine
              vera è il livello fisso dietro), titolo intero, introduzione,
              griglia informativa e azioni. Scorrendo si entra nella lettura. */}
          <View
            style={[styles.section, styles.hero, { paddingTop: cover.top }]}
            onLayout={onSectionLayout(0)}
            testID="deep-dive-page-intro"
          >
            <View style={{ height: cardH }} testID="deep-dive-cover-card" />
            <View style={styles.heroTitleWrap} onLayout={(e) => { bigTitleY.value = Math.round(e.nativeEvent.layout.y); }}>
              <CoverTitle title={story.title} highlight={story.highlight_words} reveal={headerReveal} />
            </View>
            <View style={styles.introBlock}>
              <View style={styles.introEyebrowRow}>
                <View style={styles.introDot} />
                <Text style={styles.introEyebrow} testID="reader-intro-eyebrow">{t.deep_intro}</Text>
              </View>
              <Text style={styles.hook} testID="deep-dive-hook">{story.hook}</Text>
            </View>
            <StoryInfoGrid story={story} minutes={story.deep_dive_time_min} />
            <View style={styles.ctaRow}>
              <IntroCtaButton icon="book" label={t.deep_start} onPress={() => { markTouched(); scrollToSection(1); }} testID="deep-dive-start" style={styles.cta} />
              {isPremium ? <IntroListenButton onListen={openAudio} style={styles.cta} /> : null}
            </View>
          </View>

          {story.chapters.map((c) => (
            <ChapterSection
              key={c.number}
              chapter={c}
              story={story}
              eyebrow={`${t.chapter} ${c.number}`}
              minHeight={winH - headerBottom - spacing.md}
              onLayout={onSectionLayout(c.number)}
            />
          ))}

          <ReaderEnding
            story={story}
            liked={liked}
            onLike={() => toggle("like")}
            bookmarked={bookmarked}
            onBookmark={() => toggle("bookmark")}
            onShare={onShare}
            onNext={onNext}
            bottomInset={insets.bottom}
            onLayout={onSectionLayout(lastSection)}
          />
        </Animated.ScrollView>

        {section === 1 ? (
          <CoachTip id="reader" text={t.tip_reader} icon="book-outline" style={{ top: headerBottom + spacing.md }} />
        ) : null}
        {isPremium ? <AudioSheet visible={audioOpen} onClose={() => setAudioOpen(false)} /> : null}
      </StoryAudioProvider>
      </SwipeBack>
      {/* Off-screen share card, captured as PNG on demand. */}
      <View style={styles.shareHidden}>
        <View ref={shareRef} collapsable={false}>
          <StoryShareCard story={story} />
        </View>
      </View>
    </Screen>
  );
}

// Titolo intero sulla copertina (prima schermata): grande, su più righe, con
// le parole chiave nel colore del tema. Sfuma via mentre scorre sotto la barra,
// dove lo stesso titolo ricompare in piccolo (nessun doppione a schermo).
function CoverTitle({ title, highlight, reveal }: { title: string; highlight: string[]; reveal: SharedValue<number> }) {
  const styles = useStyles();
  const fade = useAnimatedStyle(() => ({ opacity: 1 - reveal.value }));
  return (
    <Animated.View style={fade}>
      <HighlightedTitle title={title} highlight={highlight} style={styles.coverTitle} testID="deep-dive-cover-title" />
    </Animated.View>
  );
}

const useStyles = makeStyles((colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: spacing.lg },
  shareHidden: { position: "absolute", left: -4000, top: 0, width: SHARE_CARD_WIDTH, pointerEvents: "none" },

  section: { width: "100%", maxWidth: READER_MAX_W, alignSelf: "center", paddingHorizontal: spacing.xl },
  // Presentazione: card (spazio), titolo, introduzione, griglia, azioni.
  hero: { gap: spacing.xl, paddingBottom: spacing.xxl + spacing.md },
  heroTitleWrap: { marginTop: -spacing.xs },
  coverTitle: {
    color: colors.textWarm, fontFamily: typography.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.7,
    textShadowColor: withAlpha(colors.surface, 0.9), textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14,
  },
  introBlock: { gap: spacing.sm + 2 },
  // Occhiello "INTRODUZIONE": piccolo e luminoso, sopra l'aggancio.
  introEyebrowRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: spacing.sm },
  introDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.intro, boxShadow: `0px 0px 12px ${withAlpha(colors.intro, 0.85)}` as any },
  introEyebrow: {
    color: colors.intro, fontFamily: typography.bodyBold, fontSize: 12, letterSpacing: 2.4,
    textShadowColor: withAlpha(colors.surface, 0.7), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  // Aggancio: breve, grande e leggibile, sopra lo sfondo che si scurisce.
  hook: {
    color: colors.textWarm, fontFamily: typography.bodyMedium, fontSize: 19, lineHeight: 30, letterSpacing: 0.1,
    textShadowColor: withAlpha(colors.surface, 0.95), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12,
  },
  ctaRow: { flexDirection: "row", alignItems: "stretch", gap: spacing.sm + 2 },
  cta: { flex: 1 },
}));
