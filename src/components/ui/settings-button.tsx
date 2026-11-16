import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useBackupStore } from '@/lib/backup-store';

/**
 * Header shortcut to the settings screen. Shows the signed-in Google avatar when
 * available so the user can tell at a glance which account is connected.
 */
export function SettingsButton() {
  const theme = useTheme();
  const router = useRouter();
  const { account } = useBackupStore();

  return (
    <Pressable
      onPress={() => router.push('/ajustes')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Ajustes"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.primarySoft },
        pressed ? styles.pressed : null,
      ]}>
      {account?.photo ? (
        <Image source={{ uri: account.photo }} style={styles.avatar} />
      ) : (
        <Ionicons
          name={account ? 'person' : 'person-outline'}
          size={20}
          color={theme.primary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  pressed: {
    opacity: 0.7,
  },
});
