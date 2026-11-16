import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * A compact selector that opens a bottom sheet with the available options.
 * Used for units, where a free text field would allow typos and inconsistent data.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  containerStyle,
}: SelectFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const borderColor = error ? theme.danger : theme.border;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: theme.card, borderColor },
          pressed ? styles.pressed : null,
        ]}>
        <AppText
          variant="body"
          color={selected ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={styles.flex}>
          {selected?.label ?? placeholder ?? 'Selecciona una opción'}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
      </Pressable>

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(event) => event.stopPropagation()}>
            <AppText variant="subtitle" style={styles.sheetTitle}>
              {label ?? 'Selecciona'}
            </AppText>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.option,
                      active ? { backgroundColor: theme.primarySoft } : null,
                    ]}>
                    <AppText
                      variant={active ? 'bodyStrong' : 'body'}
                      color={active ? 'primary' : 'text'}
                      style={styles.flex}>
                      {option.label}
                    </AppText>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={theme.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
});
