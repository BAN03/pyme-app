import { Text, type TextProps, type TextStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong'
  | 'caption'
  | 'label'
  | 'mono';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  align?: 'left' | 'center' | 'right';
};

const VARIANTS: Record<TextVariant, TextStyle> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  smallStrong: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mono: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
};

export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: theme[color] }, VARIANTS[variant], align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
