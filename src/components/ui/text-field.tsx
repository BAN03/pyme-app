import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  error,
  hint,
  prefix,
  suffix,
  containerStyle,
  multiline,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const borderColor = error ? theme.danger : theme.border;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? (
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.card,
            borderColor,
            alignItems: multiline ? 'flex-start' : 'center',
            minHeight: multiline ? 92 : 48,
          },
        ]}>
        {prefix ? (
          <AppText variant="body" color="textSecondary">
            {prefix}
          </AppText>
        ) : null}

        <TextInput
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          style={[
            styles.input,
            { color: theme.text },
            multiline ? styles.multiline : null,
          ]}
          {...rest}
        />

        {suffix ? (
          <AppText variant="body" color="textSecondary">
            {suffix}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
