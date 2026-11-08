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
};

export function DateField({ label = 'Fecha', value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [show, setShow] = useState(false);
  const date = parseISODate(value);
  const today = parseISODate(todayISO());
  const relative = relativeDayLabel(value);

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
          style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
          <AppText variant="body" style={styles.flex}>
            {formatDate(value)}
          </AppText>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={today}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            accentColor={theme.primary}
            onChange={handleChange}
          />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setShow(true)}
            style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
              maximumDate={today}
              onChange={handleChange}
            />
          ) : null}
        </>
      )}
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
