import { Image, type ImageSourcePropType, type StyleProp, StyleSheet, Text, type TextStyle } from 'react-native';

const ARTWORK: Readonly<Partial<Record<string, { source: ImageSourcePropType; focusY: number }>>> = {
  eoraptor: { source: require('../../../assets/art/eoraptor.webp'), focusY: 0 },
  proganochelys: { source: require('../../../assets/art/proganochelys.webp'), focusY: 0.5 },
  tanystropheus: { source: require('../../../assets/art/tanystropheus.webp'), focusY: 0 },
};

export function hasFossilArtwork(fossilId: string | undefined): boolean {
  return fossilId !== undefined && Object.prototype.hasOwnProperty.call(ARTWORK, fossilId);
}

/** Artwork never changes card effects or fossil discovery. */
export function FossilArtwork({ fossilId, emoji, emojiStyle, frame }: {
  fossilId?: string; emoji: string; emojiStyle?: StyleProp<TextStyle>; frame?: { width: number; height: number };
}) {
  const art = fossilId !== undefined && hasFossilArtwork(fossilId) ? ARTWORK[fossilId] : undefined;
  if (!art) return <Text style={emojiStyle} allowFontScaling={false} accessible={false}>{emoji}</Text>;
  // The bundled portraits are square. Crop around each creature's head instead
  // of its feet when a card's art window is much wider than it is tall.
  const framed = frame ? {
    width: frame.width,
    height: Math.max(frame.width, frame.height),
    top: -(Math.max(frame.width, frame.height) - frame.height) * art.focusY,
  } : null;
  return <Image source={art.source} resizeMode="cover" style={[StyleSheet.absoluteFill, styles.image, framed]} accessible={false} />;
}

const styles = StyleSheet.create({ image: { width: '100%', height: '100%' } });
