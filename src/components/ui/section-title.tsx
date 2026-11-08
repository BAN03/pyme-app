import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type SectionTitleProps = {
  title: string;
  action?: ReactNode;
};

export function SectionTitle({ title, action }: SectionTitleProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary">
        {title}
      </AppText>
      {action}
      <View style={[styles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
