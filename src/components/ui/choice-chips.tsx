import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

export type ChipOption = {
  value: string;
  label: string;
};

type ChoiceChipsProps = {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
};

export function ChoiceChips({ options, value, onChange }: ChoiceChipsProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}>
            <AppText
              variant="small"
              style={{ color: selected ? theme.primary : theme.textSecondary }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
