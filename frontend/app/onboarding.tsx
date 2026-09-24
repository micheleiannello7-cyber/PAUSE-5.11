import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";

import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { makeStyles, useTheme, spacing, typography, radius, withAlpha } from "@/src/theme";
import { getOrCreateUserId, setOnboarded } from "@/src/session";
import { CategoryGrid, toggleInterest } from "@/src/components/category-grid";
import { PagerDots } from "@/src/components/pager";
import { OnboardingIntro } from "@/src/components/onboarding-intro";
import { KindIcon } from "@/src/components/kind-icon";
import { useI18n } from "@/src/i18n";

type Mode = "stories" | "lessons";

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modes, setModes] = useState<Set<Mode>>(new Set<Mode>(["stories"]));
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: categories, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories,
  });

  const canContinue = selected.size > 0 && modes.size > 0;

  const toggleMode = (m: Mode) => {
    setModes((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      // never let the user end with nothing selected
      if (next.size === 0) next.add(m);
      return next;
    });
  };

  const onContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      const uid = await getOrCreateUserId();
      await api.setInterests(uid, Array.from(selected));
      await api.setContentModes(uid, Array.from(modes));
      await setOnboarded();
      router.replace("/(tabs)/discover");
    } finally {
      setSaving(false);
    }
  };

  // Only the presentation changes; topic selection and persistence stay intact.
  if (step === 0) {
    return <OnboardingIntro onContinue={() => setStep(1)} />;
  }

  // ------------------------------------------------ STEP 1 — content + topics
  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="onboarding-topics">
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xxxl }} testID="onboarding-loading" />
      ) : isError || !categories ? (
        <View style={styles.errorWrap} testID="onboarding-error">
          <Ionicons name="cloud-offline-outline" size={44} color={colors.muted} />
          <Text style={styles.errorTitle}>{t.load_error}</Text>
          <Text style={styles.errorText}>{t.load_error_sub}</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.7 : 1 }]}
            testID="onboarding-retry"
          >
            {isFetching ? (
              <ActivityIndicator color={colors.brand} size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={colors.brand} />
                <Text style={styles.retryText}>{t.retry}</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Pressable onPress={() => setStep(0)} style={styles.backLink} testID="onboarding-back" hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={colors.muted} />
            <Text style={styles.backLinkText}>{t.back}</Text>
          </Pressable>

          {/* Single, prominent title — one clear hierarchy */}
          <Text style={styles.stepTitle}>{t.onb_content_q}</Text>

          {/* Content toggles: curiosities / mini lessons, individually or both */}
          <View style={styles.modeRow}>
            <ModeToggle
              kind="stories"
              label={t.onb_toggle_stories}
              active={modes.has("stories")}
              onPress={() => toggleMode("stories")}
              styles={styles}
              colors={colors}
              testID="onboarding-mode-stories"
            />
            <ModeToggle
              kind="lessons"
              label={t.onb_toggle_lessons}
              active={modes.has("lessons")}
              onPress={() => toggleMode("lessons")}
              styles={styles}
              colors={colors}
              testID="onboarding-mode-lessons"
            />
          </View>

          <Text style={styles.sectionLabel}>{t.onb_interests_label}</Text>
          <Text style={styles.subtitle}>{t.onb_subtitle}</Text>
          <CategoryGrid
            compact
            categories={categories}
            selected={selected}
            modes={Array.from(modes)}
            onToggle={(id) => setSelected((prev) => toggleInterest(prev, id))}
          />
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PagerDots count={2} index={1} style={styles.dots} testID="onboarding-dots" />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onContinue();
          }}
          disabled={!canContinue || saving}
          testID="onboarding-continue"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: canContinue ? 1 : 0.45 },
            canContinue && styles.ctaBtnActive,
            pressed && styles.ctaPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.cyan} />
          ) : (
            <>
              <Text style={styles.ctaText}>{t.onb_cta}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.cyan} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ModeToggle({
  kind, label, hint, active, onPress, styles, colors, testID,
}: {
  kind: Mode; label: string; hint?: string; active: boolean; onPress: () => void;
  styles: any; colors: any; testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      style={[styles.modeCard, active && { borderColor: colors.brand, backgroundColor: colors.brand + "12" }]}
    >
      <View style={styles.modeTop}>
        <KindIcon kind={kind} size={44} lit={active} glow />
        <Ionicons
          name={active ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={active ? colors.brand : colors.borderStrong}
        />
      </View>
      <Text style={[styles.modeLabel, active && { color: colors.onSurface }]}>{label}</Text>
      {hint ? <Text style={styles.modeHint}>{hint}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  backLink: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.md },
  backLinkText: { color: colors.muted, fontFamily: typography.bodyMedium, fontSize: 14 },
  sectionLabel: { color: colors.muted, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.6, marginBottom: spacing.xs },
  stepTitle: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 28, lineHeight: 34, marginBottom: spacing.lg },
  modeRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  modeCard: {
    flex: 1, gap: 6, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border,
  },
  modeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modeLabel: { color: colors.onSurfaceSecondary, fontFamily: typography.bodyBold, fontSize: 15, marginTop: 4 },
  modeHint: { color: colors.brand, fontFamily: typography.bodyMedium, fontSize: 10, letterSpacing: 0.3 },
  title: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 22, lineHeight: 27, marginBottom: spacing.xs },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18, marginBottom: spacing.lg },
  dots: { alignSelf: "center", marginBottom: spacing.md },
  ctaBtn: {
    minHeight: 56, borderRadius: radius.lg, overflow: "hidden",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.artworkSurface,
    borderWidth: 1.5, borderColor: colors.glassBorderStrong,
  },
  ctaBtnActive: {
    borderColor: withAlpha(colors.cyan, 0.67),
    boxShadow: `0px 0px 14px ${colors.cyanGlow}` as any,
  },
  ctaPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  ctaText: { color: colors.onGradient, fontFamily: typography.bodyBold, fontSize: 16 },
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  errorWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  errorTitle: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 18, textAlign: "center" },
  errorText: { color: colors.muted, fontFamily: typography.body, fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 48, paddingHorizontal: spacing.xl,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brand,
  },
  retryText: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 15 },
}));
