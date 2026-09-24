// PAUSE — barra superiore del lettore verticale. Sempre visibile sopra il
// contenuto: indietro, al centro il titolo di ciò che si sta leggendo (sempre
// in vista) con sotto un indicatore discreto ("3 di 7" + barra sottile), e le
// azioni già esistenti (Ascolta per premium, Salva). Il fondo è un vetro molto
// trasparente che compare solo quando la copertina è scorsa via.
import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { makeStyles, useTheme, spacing, typography, withAlpha } from "@/src/theme";
import { HighlightedTitle } from "@/src/components/highlighted-title";

export const READER_HEADER_H = 96;

type Props = {
  topInset: number;
  /** Titolo della storia: parole chiave nel colore del tema, come nella Home. */
  title: string;
  highlight: string[];
  label: string;
  /** Colore dell'etichetta (pervinca per l'introduzione, ambra per "Da ricordare", azzurro per i capitoli). */
  labelColor?: string;
  /** 0..1, continuous through the whole story (drives the thin bar). */
  progress: SharedValue<number>;
  /** 0..1, opacity of the glass background (1 once the cover is scrolled away). */
  solid: SharedValue<number>;
  /** 0..1: il titolo nella barra compare solo quando il titolo grande della copertina è scorso via. */
  reveal: SharedValue<number>;
  /** Badge piccolo (es. riapri il player): a destra, alla quota della riga progresso, mai sopra il titolo. */
  corner?: ReactNode;
};

export function ReaderHeader({
  topInset, title, highlight, label, labelColor, progress, solid, reveal, corner,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = useAnimatedStyle(() => ({ opacity: solid.value }));
  const show = useAnimatedStyle(() => ({ opacity: reveal.value, transform: [{ translateY: (1 - reveal.value) * 8 }] }));
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(Math.max(0, Math.min(1, progress.value)) * 100)}%` }));

  return (
    <View style={[styles.wrap, { paddingTop: topInset }]} testID="reader-header">
      {/* Scrim leggero sulla foto, per la leggibilità di titolo e pulsanti. */}
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(colors.surface, 0.92), withAlpha(colors.surface, 0.62), withAlpha(colors.surface, 0)]}
        locations={[0, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Fondo in vetro, molto trasparente, che appare scorrendo oltre la copertina. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.solid, bg]} />
      <View style={styles.row}>
        <Animated.View style={[styles.center, corner ? styles.centerWithCorner : null, show]} pointerEvents="none" testID="reader-progress">
          <HighlightedTitle
            title={title}
            highlight={highlight}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={styles.title}
            testID="reader-header-title"
          />
          <View style={styles.progressRow}>
            {label ? <Text style={[styles.label, labelColor ? { color: labelColor } : null]} numberOfLines={1} testID="deep-dive-page-label">{label}</Text> : null}
            <View style={styles.track} accessibilityRole="progressbar">
              <Animated.View style={[styles.fillWrap, fill]}>
                <LinearGradient
                  colors={[colors.brandSecondary, colors.cyan]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.fill}
                  testID="reader-progress-fill"
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
        {corner ? <View style={styles.corner}>{corner}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  solid: {
    backgroundColor: withAlpha(colors.surface, 0.94),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  row: {
    minHeight: READER_HEADER_H, paddingHorizontal: spacing.xl + spacing.md, paddingBottom: spacing.sm,
    alignItems: "center", justifyContent: "center",
  },
  center: { alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 8 },
  // Con il badge a destra il titolo lascia spazio simmetrico su entrambi i lati (resta centrato).
  centerWithCorner: { paddingHorizontal: 30 },
  title: {
    color: colors.textWarm, fontFamily: typography.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, textAlign: "center",
    textShadowColor: withAlpha(colors.surface, 0.75), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: {
    color: colors.cyan, fontFamily: typography.bodyBold,
    fontSize: 13, letterSpacing: 2,
  },
  track: { width: 56, height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: withAlpha(colors.onSurface, 0.14) },
  fillWrap: { height: 3, borderRadius: 2, overflow: "hidden", boxShadow: `0px 0px 10px ${colors.cyanGlow}` as any },
  fill: { flex: 1 },
  corner: { position: "absolute", right: spacing.md, bottom: spacing.sm - 2, alignItems: "center", justifyContent: "center" },
}));
