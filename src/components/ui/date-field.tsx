import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { formatDate, parseISODate, relativeDayLabel, toISODate, todayISO } from '@/lib/date';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  /** Earliest selectable date (ISO). When set, future dates become selectable. */
  minimumDate?: string;
  /** Latest selectable date (ISO). Defaults to today unless `minimumDate` is set. */
  maximumDate?: string;
};

export function DateField({
  label = 'Fecha',
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [show, setShow] = useState(false);
  const date = parseISODate(value);
  const today = parseISODate(todayISO());
  const minDate = minimumDate ? parseISODate(minimumDate) : undefined;
  // Without an explicit maximum, dates are capped at today (records are not
  // created in the future) — unless a minimum is set, as with expiry dates.
  const maxDate = maximumDate ? parseISODate(maximumDate) : minimumDate ? undefined : today;
  const relative = relativeDayLabel(value);
  const borderColor = error ? theme.danger : theme.border;

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) onChange(toISODate(selected));
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>

      {Platform.OS === 'ios' ? (
        <View
          style={[styles.field, { backgroundColor: theme.card, borderColor }]}>
          <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
          <AppText variant="body" style={styles.flex}>
            {formatDate(value)}
          </AppText>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            minimumDate={minDate}
            maximumDate={maxDate}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            accentColor={theme.primary}
            onChange={handleChange}
          />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setShow(true)}
            style={[styles.field, { backgroundColor: theme.card, borderColor }]}>
            <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
            <AppText variant="body" style={styles.flex}>
              {formatDate(value)}
            </AppText>
            {relative ? <AppText variant="caption" color="primary">{relative}</AppText> : null}
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </Pressable>

          {show ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              minimumDate={minDate}
              maximumDate={maxDate}
              onChange={handleChange}
            />
          ) : null}
        </>
      )}

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  field: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
});
