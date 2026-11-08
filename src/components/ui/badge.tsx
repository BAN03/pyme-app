import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const palette = {
    neutral: { background: theme.backgroundElement, text: theme.textSecondary },
    primary: { background: theme.primarySoft, text: theme.primary },
    success: { background: theme.successSoft, text: theme.success },
    danger: { background: theme.dangerSoft, text: theme.danger },
    warning: { background: theme.warningSoft, text: theme.warning },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <AppText variant="caption" style={{ color: palette.text }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
});
