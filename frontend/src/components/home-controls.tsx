import { Pressable, Text, View } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Category } from "@/src/api";
import { makeStyles, radius, typography, useTheme, withAlpha } from "@/src/theme";
import { DirectionIcon } from "./category-icon";
import { CategoryArtwork } from "./category-artwork";

export function HomeCategoryTile({ cat, active, onPress, size }: {
  cat: Category; active: boolean; onPress: () => void; size: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={`home-cat-${cat.id}`} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={cat.name}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tile, { width: size, height: size * 1.4, borderColor: withAlpha(colors.onGradient, 0.1) }, active && {
        borderColor: withAlpha(cat.color, 0.85), backgroundColor: cat.color + "12",
      }, pressed && styles.pressed]}
    >
      <CategoryArtwork category={cat} testID={`home-category-art-${cat.id}`} compact cornerRadius={radius.md} />
      {active ? <View style={[styles.check, { backgroundColor: cat.color }]}><Ionicons testID={`home-cat-selected-${cat.id}`} name="checkmark" size={11} color={styles.checkGlyph.color} /></View> : null}
      <View style={styles.tileNameWrap}>
        <Text testID={`home-cat-label-${cat.id}`} style={styles.tileName} numberOfLines={2}>{cat.name}</Text>
      </View>
    </Pressable>
  );
}

export function HomeNavButton({ direction, disabled, onPress, label }: {
  direction: "prev" | "next"; disabled: boolean; onPress: () => void; label: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress} disabled={disabled} testID={`discover-${direction}`}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.arrow, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View pointerEvents="none" style={styles.highlight} />
      <DirectionIcon direction={direction} color={colors.onSurface} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  tile: {
    paddingBottom: 7, paddingHorizontal: 2,
    borderRadius: radius.md, backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.glassBorderStrong, alignItems: "center", justifyContent: "flex-end", overflow: "hidden",
  },
  highlight: { position: "absolute", top: 0, left: 12, right: 12, height: 1, backgroundColor: colors.glassHighlight },
  check: { position: "absolute", top: 6, right: 6, width: 17, height: 17, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  checkGlyph: { color: colors.artworkSurface },
  tileNameWrap: { height: 30, alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  tileName: { color: colors.onGradient, fontFamily: typography.bodyBold, fontSize: 10.5, lineHeight: 13, textAlign: "center" },
  arrow: {
    width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.glassBorderStrong,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.3 },
}));