// PAUSE — ritorno alla Home dal lettore con uno swipe che parte dal bordo
// sinistro o destro dello schermo: la schermata segue il dito e, superata la
// soglia, scivola via (a destra o a sinistra) prima di tornare indietro.
// Il tasto indietro di sistema (Android) resta gestito dal navigatore.
import { ReactNode, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing, interpolate, Extrapolation,
} from "react-native-reanimated";

import { useTheme } from "@/src/theme";

const OUT = { duration: 280, easing: Easing.out(Easing.cubic) };
const EDGE = 44;

export function SwipeBack({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const x = useSharedValue(0);
  // +1 = partito dal bordo sinistro (scivola a destra), -1 = dal bordo destro, 0 = non dal bordo.
  const dir = useSharedValue(0);
  const leaving = useRef(false);

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    onBack();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onBegin((e) => { dir.value = e.x <= EDGE ? 1 : e.x >= width - EDGE ? -1 : 0; })
    .onUpdate((e) => {
      if (dir.value === 0) return;
      x.value = dir.value > 0 ? Math.max(0, e.translationX) : Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (dir.value === 0) return;
      const far = Math.abs(e.translationX) > width * 0.33 || Math.abs(e.velocityX) > 800;
      const sameWay = Math.sign(e.translationX) === dir.value;
      if (far && sameWay) x.value = withTiming(dir.value * width, OUT, (done) => { if (done) runOnJS(leave)(); });
      else x.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // La pagina sotto si intravede: velo scuro che si alza mentre si scivola via.
  const veil = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value), [0, width], [0.35, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }, veil]} />
        <Animated.View style={[styles.fill, slide]} testID="reader-swipe-back">
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
