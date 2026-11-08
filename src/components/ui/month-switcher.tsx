import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { currentMonthKey, monthLabel } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type MonthSwitcherProps = {
  value: string;
  onChange: (monthKey: string) => void;
};

export function MonthSwitcher({ value, onChange }: MonthSwitcherProps) {
  const theme = useTheme();
  const isCurrent = value >= currentMonthKey();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(addMonthsSafe(value, -1))}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrow,
          { backgroundColor: theme.backgroundElement },
          pressed ? styles.pressed : null,
        ]}>
        <Ionicons name="chevron-back" size={18} color={theme.text} />
      </Pressable>

      <AppText variant="bodyStrong" style={styles.label}>
        {monthLabel(value)}
      </AppText>

      <Pressable
        onPress={() => onChange(addMonthsSafe(value, 1))}
        disabled={isCurrent}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrow,
          { backgroundColor: theme.backgroundElement, opacity: isCurrent ? 0.4 : 1 },
          pressed ? styles.pressed : null,
        ]}>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </Pressable>
    </View>
  );
}

function addMonthsSafe(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return next > currentMonthKey() ? currentMonthKey() : next;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    minWidth: 140,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  pressed: {
    opacity: 0.7,
  },
});
