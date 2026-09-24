import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/src/i18n";
import { typography } from "@/src/theme";
import { OnboardingBrand } from "@/src/components/onboarding-brand";

// Newly generated clean artwork in managed image storage, not an enlarged
// screenshot. The logo, wordmark, copy and button are all drawn separately.
const ARTWORK = "https://static.prod-images.emergentagent.com/jobs/28e12fec-acaf-4031-be76-8ab73ac62f06/images/bf742891c8e2291fe83007a503faab16afa32a336fa2dff4e37d8958ff1c358b.jpeg";

// Fixed brand colours: this reference must look identical in both app themes.
const INK = "#020916";
const WHITE = "#F8FAFF";
const DISCOVERY = ["#19D9FA", "#26C8FE", "#35B2FF", "#5196FF", "#707AFF", "#9761FC", "#B752F1", "#D654E2", "#E562D7"];

function IntroArtwork() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { t } = useI18n();
  return (
    <View style={StyleSheet.absoluteFill} testID="onboarding-hero">
      <Image
        key={attempt}
        source={{ uri: ARTWORK }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessible={false}
        testID="onboarding-background-artwork"
        onLoad={() => { setLoading(false); setFailed(false); }}
        onError={() => { setLoading(false); setFailed(true); }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient colors={["#02091655", "#02091600", "#02091600", "#02091670", "#020916B8", INK]} locations={[0, 0.3, 0.49, 0.6, 0.76, 1]} style={[StyleSheet.absoluteFill, styles.noTouch]} />
      {loading && <ActivityIndicator testID="onboarding-artwork-loading" color="#71B9F3" style={styles.artworkState} />}
      {failed && (
        <Pressable testID="onboarding-artwork-retry" accessibilityRole="button" onPress={() => { setLoading(true); setFailed(false); setAttempt(attempt + 1); }} style={styles.artworkState}>
          <Text testID="onboarding-artwork-retry-label" style={styles.retryText}>{t.retry}</Text>
        </Pressable>
      )}
    </View>
  );
}

function IntroHeadline({ fontSize }: { fontSize: number }) {
  const { t } = useI18n();
  const [first, second] = t.onb_intro_title_a.split("\n");
  const letters = Array.from(t.onb_intro_title_hl);
  const type = { fontSize, lineHeight: fontSize * 1.16 };
  return (
    <View testID="onboarding-headline" accessible accessibilityRole="header" accessibilityLabel={`${first} ${second}${t.onb_intro_title_hl}`}>
      <Text testID="onboarding-headline-first-line" style={[styles.headline, type]} maxFontSizeMultiplier={1.15}>{first}</Text>
      <Text testID="onboarding-headline-second-line" style={[styles.headline, type]} maxFontSizeMultiplier={1.15}>
        {second}
        {letters.map((letter, index) => (
          <Text key={index} style={{ color: DISCOVERY[Math.round(index * (DISCOVERY.length - 1) / Math.max(1, letters.length - 1))] }}>{letter}</Text>
        ))}
      </Text>
    </View>
  );
}

function IntroButton({ onPress, height, fontSize }: { onPress: () => void; height: number; fontSize: number }) {
  const { t } = useI18n();
  return (
    <Pressable testID="onboarding-intro-continue" accessibilityRole="button" accessibilityLabel={t.onb_intro_cta} onPress={onPress} style={({ pressed }) => [styles.button, { height, borderRadius: height / 2 }, pressed && styles.buttonPressed]}>
      <LinearGradient colors={["#D98DFF", "#657CFF", "#76DEFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonBorder}>
        <LinearGradient colors={["#35217D", "#2C4BD0", "#238DDC"]} locations={[0, 0.58, 1]} start={{ x: 0, y: 0.8 }} end={{ x: 1, y: 0.1 }} style={styles.buttonFill}>
          <LinearGradient colors={["#B8DDFF55", "#547EEA00", "#10093430"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
          <Text testID="onboarding-intro-continue-label" style={[styles.buttonText, { fontSize }]} maxFontSizeMultiplier={1.2}>{t.onb_intro_cta}</Text>
          <Ionicons name="arrow-forward" color={WHITE} size={fontSize * 1.3} />
        </LinearGradient>
      </LinearGradient>
    </Pressable>
  );
}

export function OnboardingIntro({ onContinue }: { onContinue: () => void }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const width = layout.width || windowWidth;
  const height = layout.height || windowHeight;
  // Keep the original artwork undistorted, including on tablets/short phones.
  const canvasWidth = Math.min(width, height * 0.61, 600);
  const unit = canvasWidth / 984;
  const contentHeight = height - insets.bottom;
  const buttonHeight = Math.max(48, Math.min(76, 158 * unit));
  return (
    <View testID="onboarding-intro" style={styles.screen} onLayout={({ nativeEvent: { layout: next } }) => setLayout((prev) => prev.width === next.width && prev.height === next.height ? prev : { width: next.width, height: next.height })}>
      <StatusBar style="light" />
      <View style={[styles.canvas, { width: canvasWidth }]}>
        <IntroArtwork />
        <OnboardingBrand unit={unit} top={Math.max(insets.top + 16, contentHeight * 0.16)} />
        <View style={[styles.copy, { top: contentHeight * 0.598, left: 158 * unit, right: 100 * unit }]}>
          <IntroHeadline fontSize={Math.min(40, 67 * unit)} />
          <Text testID="onboarding-subtitle" style={[styles.subtitle, { marginTop: 48 * unit, fontSize: Math.min(23, 43 * unit), lineHeight: Math.min(31, 57 * unit) }]} maxFontSizeMultiplier={1.15}>{t.onb_intro_sub}</Text>
        </View>
        <View style={[styles.footer, { top: Math.min(contentHeight * 0.815, contentHeight - buttonHeight - 60), left: 70 * unit, right: 64 * unit }]}>
          <IntroButton onPress={onContinue} height={buttonHeight} fontSize={Math.min(24, 44 * unit)} />
          {/* Three visual markers belong to the supplied design, not new routes. */}
          <View testID="onboarding-dots" style={[styles.dots, { marginTop: 62 * unit, gap: 20 * unit }]} accessible={false}>
            {[0, 1, 2].map((index) => <View key={index} testID={`onboarding-intro-dot-${index}`} style={[styles.dot, { width: (index === 0 ? 23 : 16) * unit, height: 15 * unit }, index === 0 && styles.activeDot]} />)}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: INK, alignItems: "center", overflow: "hidden" },
  canvas: { height: "100%" },
  noTouch: { pointerEvents: "none" },
  artworkState: { position: "absolute", top: "45%", alignSelf: "center", minHeight: 44, minWidth: 44, justifyContent: "center" },
  retryText: { fontFamily: typography.bodyMedium, color: WHITE, fontSize: 16 },
  copy: { position: "absolute" },
  headline: { fontFamily: typography.display, color: WHITE, letterSpacing: -0.55, includeFontPadding: false },
  subtitle: { fontFamily: typography.body, color: "#D4DCF0", letterSpacing: -0.25, includeFontPadding: false },
  footer: { position: "absolute" },
  button: { minHeight: 44, boxShadow: "6px 1px 26px #168BFA66, -3px 0px 15px #9E49F544" },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  buttonBorder: { flex: 1, padding: 1.3, borderRadius: 100, overflow: "hidden" },
  buttonFill: { flex: 1, borderRadius: 100, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  buttonText: { fontFamily: typography.bodyBold, color: WHITE, includeFontPadding: false },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dot: { borderRadius: 20, backgroundColor: "#354573" },
  activeDot: { backgroundColor: "#9FE7FF", boxShadow: "0px 0px 12px #41AEFFAA" },
});