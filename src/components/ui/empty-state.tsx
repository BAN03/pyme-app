import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  message?: string;
};

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement }]}>{icon}</View>
      ) : null}
      <AppText variant="subtitle" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
