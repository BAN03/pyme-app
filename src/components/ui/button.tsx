import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 34, md: 46, lg: 54 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { background: theme.primary, border: theme.primary, text: theme.onPrimary },
    secondary: {
      background: theme.backgroundElement,
      border: theme.border,
      text: theme.text,
    },
    ghost: { background: 'transparent', border: 'transparent', text: theme.primary },
    danger: { background: theme.danger, border: theme.danger, text: '#FFFFFF' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: palette.background,
          borderColor: palette.border,
          paddingHorizontal: size === 'sm' ? 12 : 18,
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <>
          {icon}
          <AppText
            variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'}
            style={{ color: palette.text }}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
