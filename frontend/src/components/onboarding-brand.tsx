import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { typography } from "@/src/theme";

// Vector artwork stays sharp at every device pixel ratio. Fixed reference
// palette deliberately does not change with the user's light/dark theme.
export function OnboardingBrand({ unit, top }: { unit: number; top: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ring = `intro-ring-${id}`;
  const bars = `intro-bars-${id}`;
  const shine = `intro-shine-${id}`;
  return (
    <View testID="onboarding-brand" style={[styles.brand, { top }]} accessible accessibilityLabel="PAUSE">
      <Svg testID="onboarding-pause-mark" width={258 * unit} height={258 * unit} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id={ring} x1="0" y1="0.2" x2="1" y2="0.7">
            <Stop offset="0" stopColor="#B347FF" /><Stop offset="0.22" stopColor="#D970FA" />
            <Stop offset="0.52" stopColor="#6965FF" /><Stop offset="1" stopColor="#31D9FA" />
          </LinearGradient>
          <LinearGradient id={bars} x1="0" y1="0" x2="0.65" y2="1">
            <Stop offset="0" stopColor="#C47CFF" /><Stop offset="0.42" stopColor="#5A9FFF" /><Stop offset="1" stopColor="#39DCF7" />
          </LinearGradient>
          <LinearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F0BDFF" stopOpacity="0.75" /><Stop offset="0.35" stopColor="#ADDFFF" stopOpacity="0" /><Stop offset="1" stopColor="#75E9FF" stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Circle cx="60" cy="60" r="51" stroke={`url(#${ring})`} strokeWidth="18" opacity="0.06" fill="none" />
        <Circle cx="60" cy="60" r="51" stroke={`url(#${ring})`} strokeWidth="11" opacity="0.12" fill="none" />
        <Circle cx="60" cy="60" r="51" stroke={`url(#${ring})`} strokeWidth="8.5" fill="none" />
        <Circle cx="60" cy="60" r="54.5" stroke={`url(#${shine})`} strokeWidth="1" fill="none" />
        {[40, 67].map((x) => <Rect key={x} x={x} y="36" width="14" height="48" rx="7" fill={`url(#${bars})`} stroke={`url(#${shine})`} strokeWidth="1" />)}
      </Svg>
      <View testID="onboarding-wordmark" style={[styles.wordmarkRow, { gap: 33 * unit, marginTop: 17 * unit }]}>
        {["P", "A", "U", "S", "E"].map((letter) => letter === "A" ? (
          <Svg key={letter} width={58 * unit} height={61 * unit} viewBox="0 0 60 64" testID="onboarding-wordmark-a">
            <Path d="M 5 60 L 30 5 L 55 60" fill="none" stroke="#F6F8FF" strokeWidth="6.4" strokeLinecap="square" strokeLinejoin="round" />
          </Svg>
        ) : <Text key={letter} testID={`onboarding-wordmark-${letter.toLowerCase()}`} style={[styles.wordmark, { fontSize: 78 * unit, lineHeight: 96 * unit }]} maxFontSizeMultiplier={1}>{letter}</Text>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  wordmarkRow: { flexDirection: "row", alignItems: "center" },
  wordmark: { color: "#F6F8FF", fontFamily: typography.display, includeFontPadding: false },
});