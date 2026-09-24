// PAUSE — copertina "che si trasforma". Un solo livello fisso dietro allo
// scroll: a riposo ha esattamente la geometria della card arrotondata della
// presentazione (in alto, staccata dai bordi); scorrendo si aggancia in alto,
// si allarga a tutto schermo, perde gli angoli, si scurisce e si sfoca un po'
// finché diventa lo sfondo cinematografico della lettura. La card nel flusso
// è solo uno spazio vuoto: non ci sono due immagini, è la stessa che cambia.
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle } from "react-native-reanimated";

import { Story, isLesson } from "@/src/api";
import { makeStyles, useTheme, withAlpha } from "@/src/theme";
import { StoryHero } from "./story-hero";
import { LessonCover } from "./lesson-cover";

export type CoverFrame = { top: number; left: number; width: number; height: number; radius: number };

export function ReaderMorphCover({ story, scrollY, frame, screenW, screenH, morphEnd }: {
  story: Story; scrollY: SharedValue<number>; frame: CoverFrame; screenW: number; screenH: number;
  /** Offset di scroll al quale la trasformazione in sfondo è completa. */
  morphEnd: number;
}) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const hasCover = !!story.hero_image_generated || (!isLesson(story) && !!story.hero_image);

  const box = useAnimatedStyle(() => {
    const y = scrollY.value;
    const p = interpolate(y, [0, morphEnd], [0, 1], Extrapolation.CLAMP);
    return {
      // Segue il contenuto finché tocca il bordo alto, poi resta agganciata.
      top: Math.max(0, frame.top - Math.max(0, y)) + (y < 0 ? -y * 0.35 : 0),
      left: interpolate(p, [0, 1], [frame.left, 0]),
      width: interpolate(p, [0, 1], [frame.width, screenW]),
      height: interpolate(p, [0, 1], [frame.height, screenH]),
      borderRadius: interpolate(p, [0, 1], [frame.radius, 0]),
      borderColor: withAlpha(colors.onGradient, 0.16 * (1 - p)),
    };
  });
  const zoom = useAnimatedStyle(() => {
    const y = scrollY.value;
    const p = interpolate(y, [0, morphEnd], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: 1 + (y < 0 ? Math.min(0.08, -y / 700) : 0) + p * 0.04 }] };
  });
  const dim = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, morphEnd * 0.4, morphEnd, morphEnd + screenH], [0, 0.26, 0.44, 0.54], Extrapolation.CLAMP),
  }));
  const blur = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [morphEnd * 0.5, morphEnd], [0, 1], Extrapolation.CLAMP),
  }));
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, morphEnd], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.box, box]} pointerEvents="none" testID="chapter-cover-bg">
      <Animated.View style={[StyleSheet.absoluteFill, zoom]}>
        {hasCover ? (
          <StoryHero story={story} style={StyleSheet.absoluteFill} transition={400} />
        ) : (
          <LessonCover color={colors.muted} icon={story.category_icon} iconSize={72} showBadge={false} style={StyleSheet.absoluteFill} />
        )}
        {/* Tinta notte: porta ogni foto verso la stessa temperatura blu-notte. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.nightTint }]} />
      </Animated.View>
      {/* Sfocatura leggera solo quando è diventata sfondo. */}
      <Animated.View style={[StyleSheet.absoluteFill, blur]}>
        <BlurView tint={scheme === "dark" ? "dark" : "light"} intensity={14} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {/* Velo scuro che cresce con lo scroll: il testo resta protagonista. */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }, dim]} />
      {/* Fusione verso il fondo pagina: lunga e morbida, solo da sfondo. */}
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <LinearGradient
          colors={[withAlpha(colors.surface, 0), withAlpha(colors.surface, 0), withAlpha(colors.surface, 0.3), withAlpha(colors.surface, 0.68), colors.surface]}
          locations={[0, 0.5, 0.7, 0.88, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  box: { position: "absolute", overflow: "hidden", borderWidth: 1, backgroundColor: colors.surfaceSecondary },
}));
