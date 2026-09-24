import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";

import { api, heroUrl } from "@/src/api";
import { spacing, radius, typography, useTheme, makeStyles } from "@/src/theme";
import { GradientButton } from "@/src/components/gradient-button";
import { HomeButton } from "@/src/components/home-button";
import { Screen } from "@/src/components/screen";
import { PLANS, PlanId, usePremium } from "@/src/premium";
import { useI18n } from "@/src/i18n";

// Paywall: un'unica promessa chiara in alto (con le copertine vere delle
// storie come "assaggio"), 5 vantaggi concreti, piano annuale in evidenza con
// prova gratuita, e una CTA che dice esattamente cosa succede oggi (niente).
export default function Premium() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useStyles();
  const { isPremium, activate, cancel, isPending } = usePremium();
  const [selected, setSelected] = useState<PlanId>("yearly");
  const plan = PLANS.find((p) => p.id === selected)!;
  const yearly = PLANS.find((p) => p.id === "yearly")!;
  const monthly = PLANS.find((p) => p.id === "monthly")!;
  const lifetime = PLANS.find((p) => p.id === "lifetime")!;

  // Tre copertine reali per il ventaglio in alto (prima le più "cinematografiche").
  const { data: stories } = useQuery({ queryKey: ["paywall-covers"], queryFn: () => api.stories({ limit: 60 }) });
  const withCover = (stories ?? []).filter((s) => s.hero_image_generated);
  const preferred = ["aurora-borealis", "black-holes-basics", "how-stars-die", "moon-tides", "mars-red", "how-many-galaxies"];
  const covers = [
    ...preferred.map((id) => withCover.find((s) => s.id === id)).filter(Boolean),
    ...withCover.filter((s) => !preferred.includes(s.id)),
  ].slice(0, 3) as typeof withCover;

  const benefits = [
    { icon: "headset", title: t.pb_audio, sub: t.pb_audio_sub },
    { icon: "albums", title: t.pb_choose, sub: t.pb_choose_sub },
    { icon: "musical-notes", title: t.pb_playlist, sub: t.pb_playlist_sub },
    { icon: "stats-chart", title: t.pb_stats, sub: t.pb_stats_sub },
    { icon: "heart", title: t.pb_saved, sub: t.pb_saved_sub },
  ];

  const planLabel = (id: PlanId) => (id === "monthly" ? t.plan_month : id === "yearly" ? t.plan_year : t.plan_lifetime);
  const planPeriod = (id: PlanId) => (id === "monthly" ? t.per_month : id === "yearly" ? t.per_year : t.per_once);

  const ctaLabel = plan.trialDays ? t.pw_cta_trial : t.pw_cta_plan.replace("{plan}", planLabel(plan.id));
  const ctaNote = plan.trialDays
    ? `${t.pw_no_charge} · ${t.pw_then.replace("{price}", plan.price).replace("{period}", planPeriod(plan.id))}`
    : plan.id === "lifetime" ? t.pw_lifetime_hint : t.pw_no_charge;

  const onActivate = async () => {
    await activate();
    router.back();
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/discover"));

  return (
    <Screen style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* ---- Hero: ventaglio di copertine su sfondo sfocato ---- */}
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]} testID="paywall-hero">
          {covers[0] ? (
            <Image source={{ uri: heroUrl(covers[0], "thumb") }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} cachePolicy="memory-disk" />
          ) : null}
          <LinearGradient
            colors={["rgba(5,7,12,0.35)", "rgba(5,7,12,0.55)", colors.surface]}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.fan}>
            {covers.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.fanCard,
                  i === 0 && { transform: [{ rotate: "-9deg" }, { translateX: -26 }, { translateY: 10 }] },
                  i === 1 && { zIndex: 2, transform: [{ scale: 1.08 }] },
                  i === 2 && { transform: [{ rotate: "9deg" }, { translateX: 26 }, { translateY: 10 }] },
                ]}
              >
                <Image source={{ uri: heroUrl(s, "thumb") }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} cachePolicy="memory-disk" />
                <LinearGradient colors={["transparent", "rgba(5,7,12,0.75)"]} style={StyleSheet.absoluteFill} />
                {i === 1 ? (
                  <View style={styles.fanPlay}>
                    <Ionicons name="headset" size={16} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* ---- Promessa ---- */}
        <View style={styles.body}>
          <View style={styles.pill} testID="paywall-trial-pill">
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={styles.pillText}>{t.pw_trial_pill.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{t.pw_title}</Text>
          <Text style={styles.sub}>{t.pw_sub}</Text>

          {/* ---- 5 vantaggi ---- */}
          <View style={styles.benefits}>
            {benefits.map((b) => (
              <View key={b.title} style={styles.benefit} testID={`benefit-${b.icon}`}>
                <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.benefitOrb}>
                  <Ionicons name={b.icon as any} size={16} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitSub}>{b.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ---- Piano annuale in evidenza ---- */}
          <Pressable onPress={() => setSelected("yearly")} testID="plan-yearly" style={{ marginTop: spacing.xl }}>
            <LinearGradient
              colors={selected === "yearly" ? colors.gradient : [colors.border, colors.border]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.featuredBorder}
            >
              <View style={styles.featured}>
                <View style={styles.featuredTop}>
                  <View style={styles.featuredTag}>
                    <Ionicons name="star" size={10} color={colors.onBrand} />
                    <Text style={styles.featuredTagText}>{t.pw_most_chosen.toUpperCase()} · {t.badge_save.toUpperCase()}</Text>
                  </View>
                  <Radio active={selected === "yearly"} />
                </View>
                <View style={styles.featuredRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featuredName}>{t.plan_year}</Text>
                    <Text style={styles.featuredHint}>{t.pw_per_month_eq}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.featuredPrice}>{yearly.price}</Text>
                    <Text style={styles.featuredPeriod}>{t.per_year}</Text>
                  </View>
                </View>
                <View style={styles.featuredTrial}>
                  <Ionicons name="gift-outline" size={14} color={colors.brand} />
                  <Text style={styles.featuredTrialText}>{t.trial_note.replace("{d}", String(yearly.trialDays))}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* ---- Altri due piani, compatti ---- */}
          <View style={styles.smallPlans}>
            <SmallPlan
              active={selected === "monthly"}
              onPress={() => setSelected("monthly")}
              name={t.plan_month}
              price={monthly.price}
              period={t.per_month}
              testID="plan-monthly"
            />
            <SmallPlan
              active={selected === "lifetime"}
              onPress={() => setSelected("lifetime")}
              name={t.plan_lifetime}
              price={lifetime.price}
              period={t.per_once}
              tag={t.badge_best}
              testID="plan-lifetime"
            />
          </View>

          {/* ---- Fiducia ---- */}
          <View style={styles.trust}>
            <Trust icon="shield-checkmark-outline" label={t.pw_trust_store} />
            <Trust icon="close-circle-outline" label={t.pw_trust_cancel} />
            <Trust icon="phone-portrait-outline" label={t.pw_trust_family} />
          </View>

          {isPremium ? (
            <Pressable style={styles.cancel} onPress={() => cancel()} testID="premium-cancel">
              <Text style={styles.cancelText}>{t.premium_cancel_preview}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* ---- Barra superiore sopra l'hero ---- */}
      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <HomeButton testID="premium-home" />
        <Pressable style={styles.closeBtn} onPress={goBack} testID="premium-close" hitSlop={10}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* ---- CTA fissa ---- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {isPremium ? (
          <View style={styles.activeChip} testID="premium-active-chip">
            <Ionicons name="checkmark-done" size={18} color={colors.success} />
            <Text style={styles.activeChipText}>{t.premium_active}</Text>
          </View>
        ) : (
          <GradientButton label={ctaLabel} icon="arrow-forward" onPress={onActivate} loading={isPending} testID="premium-activate" />
        )}
        <Text style={styles.ctaNote} testID="paywall-cta-note">{ctaNote}</Text>
        <Pressable onPress={() => {}} testID="premium-restore" hitSlop={8}>
          <Text style={styles.restore}>{t.premium_restore}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Radio({ active }: { active: boolean }) {
  const styles = useStyles();
  return <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>;
}

function SmallPlan({ active, onPress, name, price, period, tag, testID }: {
  active: boolean; onPress: () => void; name: string; price: string; period: string; tag?: string; testID: string;
}) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} testID={testID} style={[styles.small, active && styles.smallActive]}>
      <View style={styles.smallHead}>
        <Text style={styles.smallName}>{name}</Text>
        <Radio active={active} />
      </View>
      <Text style={styles.smallPrice}>{price}</Text>
      <Text style={styles.smallPeriod}>{period}</Text>
      {tag ? (
        <View style={styles.smallTag}>
          <Text style={styles.smallTagText}>{tag}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Trust({ icon, label }: { icon: string; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.trustItem}>
      <Ionicons name={icon as any} size={16} color={colors.muted} />
      <Text style={styles.trustText}>{label}</Text>
    </View>
  );
}

const FAN_W = 108;
const FAN_H = 144;

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    position: "absolute", left: spacing.xl, right: spacing.xl,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(5,7,12,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  hero: { height: 300, overflow: "hidden", alignItems: "center", justifyContent: "flex-end", paddingBottom: spacing.lg },
  fan: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: FAN_H + 24 },
  fanCard: {
    width: FAN_W, height: FAN_H, borderRadius: 18, overflow: "hidden", marginHorizontal: -22,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: colors.surfaceSecondary,
    boxShadow: "0px 14px 30px rgba(0,0,0,0.45)",
  },
  fanPlay: {
    position: "absolute", right: 10, bottom: 10, width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
  },
  body: { paddingHorizontal: spacing.xl, marginTop: -spacing.sm },
  pill: {
    alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
    backgroundColor: colors.brand + "1A", borderWidth: 1, borderColor: colors.brand + "44",
  },
  pillText: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 10, letterSpacing: 1.6 },
  title: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 32, lineHeight: 38, marginTop: spacing.md },
  sub: { color: colors.onSurfaceSecondary, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  benefits: { marginTop: spacing.xl, gap: spacing.md },
  benefit: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  benefitOrb: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitTitle: { color: colors.onSurface, fontFamily: typography.bodyBold, fontSize: 15 },
  benefitSub: { color: colors.muted, fontFamily: typography.body, fontSize: 12, lineHeight: 17, marginTop: 1 },
  featuredBorder: { borderRadius: radius.lg + 2, padding: 1.5 },
  featured: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  featuredTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  featuredTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.brand,
  },
  featuredTagText: { color: colors.onBrand, fontFamily: typography.bodyBold, fontSize: 9.5, letterSpacing: 1 },
  featuredRow: { flexDirection: "row", alignItems: "flex-end" },
  featuredName: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 20 },
  featuredHint: { color: colors.muted, fontFamily: typography.body, fontSize: 12, marginTop: 2 },
  featuredPrice: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 26, lineHeight: 30 },
  featuredPeriod: { color: colors.muted, fontFamily: typography.body, fontSize: 12 },
  featuredTrial: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  featuredTrialText: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 12 },
  smallPlans: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  small: {
    flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: 2,
    backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border,
  },
  smallActive: { borderColor: colors.brand },
  smallHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  smallName: { color: colors.onSurface, fontFamily: typography.bodyBold, fontSize: 14 },
  smallPrice: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 18 },
  smallPeriod: { color: colors.muted, fontFamily: typography.body, fontSize: 11 },
  smallTag: {
    alignSelf: "flex-start", marginTop: spacing.xs, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.pill, backgroundColor: colors.success + "22",
  },
  smallTagText: { color: colors.success, fontFamily: typography.bodyBold, fontSize: 9.5 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  trust: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.xl },
  trustItem: { flex: 1, alignItems: "center", gap: 4 },
  trustText: { color: colors.muted, fontFamily: typography.bodyMedium, fontSize: 10.5, textAlign: "center", lineHeight: 14 },
  cancel: { alignSelf: "center", padding: spacing.sm, marginTop: spacing.md },
  cancelText: { color: colors.muted, fontFamily: typography.bodyMedium, fontSize: 13 },
  footer: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  ctaNote: { color: colors.muted, fontFamily: typography.body, fontSize: 11.5, lineHeight: 16, textAlign: "center" },
  restore: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 13, marginTop: 2 },
  activeChip: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch", justifyContent: "center",
    height: 52, borderRadius: radius.pill,
    backgroundColor: colors.success + "1A", borderWidth: 1, borderColor: colors.success + "55",
  },
  activeChipText: { color: colors.success, fontFamily: typography.bodyBold, fontSize: 15 },
}));
