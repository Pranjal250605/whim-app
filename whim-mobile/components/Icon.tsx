import Svg, { Circle, Path } from 'react-native-svg';

// Crisp line icons ported from the design prototype (Travelo.dc.html). Stroked,
// so they tint to any color (active nav = accent, etc.).
export type IconName =
  | 'discover'
  | 'heart'
  | 'heartFilled'
  | 'route'
  | 'person'
  | 'bell'
  | 'chevronLeft'
  | 'chevronDown'
  | 'arrowRight'
  | 'close'
  | 'clock'
  | 'check';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 24, color = '#1C1C1C', strokeWidth = 1.8 }: IconProps) {
  const s = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const svg = (children: React.ReactNode) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );

  switch (name) {
    case 'discover':
      return svg(
        <>
          <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} fill="none" />
          <Path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3 5.3-2.2z" fill={color} />
        </>,
      );
    case 'heart':
      return svg(<Path d="M12 21s-7-4.6-9.2-8C1 9.7 2.4 6.2 5.7 6c2-.1 3.4 1.1 3.8 1.9.4-.8 1.8-2 3.8-1.9C16.6 6.2 18 9.7 16.2 13 14 16.4 12 21 12 21z" {...s} />);
    case 'heartFilled':
      return svg(<Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />);
    case 'route':
      return svg(
        <>
          <Path d="M9 20l-5.5-2V6L9 8l6-2 5.5 2v12L15 18l-6 2z" {...s} />
          <Path d="M9 8v12M15 6v12" {...s} />
        </>,
      );
    case 'person':
      return svg(
        <>
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={strokeWidth} fill="none" />
          <Path d="M4 21c0-4 4-6.2 8-6.2S20 17 20 21" {...s} />
        </>,
      );
    case 'bell':
      return svg(
        <>
          <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...s} />
        </>,
      );
    case 'chevronLeft':
      return svg(<Path d="M15 18l-6-6 6-6" {...s} />);
    case 'chevronDown':
      return svg(<Path d="M6 9l6 6 6-6" {...s} />);
    case 'arrowRight':
      return svg(<Path d="M5 12h14M13 6l6 6-6 6" {...s} />);
    case 'close':
      return svg(<Path d="M6 6l12 12M18 6L6 18" {...s} />);
    case 'check':
      return svg(<Path d="M4 12l5 5L20 6" {...s} />);
    case 'clock':
      return svg(
        <>
          <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} fill="none" />
          <Path d="M12 7v5l3 2" {...s} />
        </>,
      );
  }
}
