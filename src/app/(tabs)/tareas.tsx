import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { SettingsButton } from '@/components/ui/settings-button';
import { useTheme } from '@/hooks/use-theme';

/**
 * Task list tab. The feature is intentionally disabled for now (see the
 * project instructions), so this screen only announces that it is pending.
 */
export default function TasksScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            Recordatorios
          </AppText>
          <AppText variant="title">Tareas</AppText>
        </View>
        <SettingsButton />
      </View>

      <Card padded={false}>
        <EmptyState
          icon={<Ionicons name="construct-outline" size={24} color={theme.textSecondary} />}
          title="Pendiente"
          message="La lista de tareas con recordatorios y fechas límite estará disponible en una próxima versión."
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
});
