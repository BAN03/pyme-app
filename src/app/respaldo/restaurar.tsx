import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/form-screen';
import { useBackup } from '@/hooks/use-backup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import type { DriveBackupFile } from '@/lib/drive';
import { formatFileSize } from '@/lib/format';

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Intenta de nuevo.';
}

export default function RestoreBackupScreen() {
  const theme = useTheme();
  const { listBackups, restore, busy } = useBackup();

  const [backups, setBackups] = useState<DriveBackupFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const files = await listBackups();
      setBackups(files);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [listBackups]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError(null);

      void (async () => {
        try {
          const files = await listBackups();
          if (active) setBackups(files);
        } catch (cause) {
          if (active) setError(errorMessage(cause));
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [listBackups]),
  );

  const runRestore = async (file: DriveBackupFile) => {
    setRestoringId(file.id);

    try {
      await restore(file);
      Alert.alert('Respaldo restaurado', 'Los datos de este dispositivo se actualizaron.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (cause) {
      Alert.alert('No se pudo restaurar', errorMessage(cause));
    } finally {
      setRestoringId(null);
    }
  };

  const confirmRestore = (file: DriveBackupFile) => {
    Alert.alert(
      'Restaurar respaldo',
      `Se reemplazarán los datos de este dispositivo con la copia del ${formatDateTime(
        file.createdAt,
      )}. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            void runRestore(file);
          },
        },
      ],
    );
  };

  return (
    <FormScreen title="Restaurar respaldo" subtitle="Elige una copia de Google Drive">
      <Card style={styles.notice}>
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={20} color={theme.warning} />
          <AppText variant="small" color="textSecondary" style={styles.flex}>
            Al restaurar se reemplazan todos los datos actuales de este dispositivo. Los respaldos
            anteriores no se borran de Drive.
          </AppText>
        </View>
      </Card>

      {loading ? (
        <Card style={styles.center}>
          <ActivityIndicator color={theme.primary} />
          <AppText variant="small" color="textSecondary">
            Buscando respaldos…
          </AppText>
        </Card>
      ) : error ? (
        <Card style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
          <AppText variant="small" color="textSecondary" align="center">
            {error}
          </AppText>
          <Button title="Reintentar" variant="secondary" onPress={load} />
        </Card>
      ) : backups && backups.length > 0 ? (
        <View style={styles.list}>
          {backups.map((file) => (
            <Card key={file.id} style={styles.item}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{formatDateTime(file.createdAt)}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatFileSize(file.size)} · {file.name}
                  </AppText>
                </View>
                <Button
                  title="Restaurar"
                  size="sm"
                  variant="secondary"
                  onPress={() => confirmRestore(file)}
                  loading={restoringId === file.id}
                  disabled={busy !== null || restoringId !== null}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={28} color={theme.textSecondary} />
          <AppText variant="small" color="textSecondary" align="center">
            No hay respaldos en tu Google Drive. Haz uno desde Ajustes.
          </AppText>
        </Card>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notice: {
    gap: 8,
  },
  center: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  list: {
    gap: 10,
  },
  item: {
    gap: 8,
  },
});
