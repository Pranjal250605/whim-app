import { PixelRatio, StyleSheet, Text, TextInput } from 'react-native';

// Cap Dynamic Type at the largest *standard* iOS size (XXXL ≈ 1.35×).
//
// Why: every screen was checked up to XXXL and reflows fine. The accessibility
// sizes scale text up to ~3× (2.64× at "AX Extra Large"), which overflows
// fixed-height pills and buttons, chops the tab bar labels and splits headings
// mid-word. Users on those sizes get XXXL-sized text instead — still large, and
// the layout holds.
//
// Why not `maxFontSizeMultiplier`: on RN 0.76's new architecture (Fabric), iOS
// ignores it — RCTAttributedTextUtils only honours `allowFontScaling`. So above
// the cap we switch system scaling off and apply the capped scale ourselves.
// Remove this module once RN's Fabric text honours maxFontSizeMultiplier.
//
// Nested <Text> without its own fontSize inherits the parent's already-capped
// size (scaling is off for it too), so nothing is scaled twice.
export const MAX_FONT_SCALE = 1.35;

function capped(props: any): any {
  const scale = PixelRatio.getFontScale();
  if (scale <= MAX_FONT_SCALE || props.allowFontScaling === false) return props;
  const flat = StyleSheet.flatten(props.style) ?? {};
  const style: Record<string, unknown> = {};
  if (typeof flat.fontSize === 'number') style.fontSize = flat.fontSize * MAX_FONT_SCALE;
  if (typeof flat.lineHeight === 'number') style.lineHeight = flat.lineHeight * MAX_FONT_SCALE;
  return { ...props, allowFontScaling: false, style: [props.style, style] };
}

let installed = false;
export function installFontScaleCap(): void {
  if (installed) return;
  installed = true;
  for (const C of [Text, TextInput] as any[]) {
    const render = C.render; // both are forwardRef components in RN 0.76
    if (typeof render !== 'function') continue;
    C.render = function cappedRender(props: any, ref: any) {
      return render(capped(props), ref);
    };
  }
}
