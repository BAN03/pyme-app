import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Image, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBackup } from '@/hooks/use-backup';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/date';
import { formatFileSize } from '@/lib/format';
import { isExpoGo } from '@/lib/google-auth';

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Intenta de nuevo.';
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function GoogleDriveCard() {
  const theme = useTheme();
  const {
    configured,
    account,
    lastBackup,
    autoBackup,
    busy,
    connect,
    disconnect,
    backupNow,
    setAutoBackup,
  } = useBackup();

  const expoGo = isExpoGo();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      Alert.alert('No se pudo conectar', errorMessage(error));
    }
  };

  const handleBackup = async () => {
    try {
      const meta = await backupNow();
      if (meta) {
        Alert.alert('Respaldo listo', 'Tu información se guardó en Google Drive.');
      }
    } catch (error) {
      Alert.alert('No se pudo respaldar', errorMessage(error));
    }
  };

  const confirmDisconnect = () => {
    Alert.alert(
      'Desconectar Google',
      'Tus datos seguirán en este dispositivo y en Drive. Podrás volver a conectar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => {
            void disconnect();
          },
        },
      ],
    );
  };

  const statusLabel = !configured ? 'Sin configurar' : account ? 'Conectado' : 'Desconectado';
  const statusTone = account ? 'success' : configured ? 'neutral' : 'warning';

  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <View style={[styles.googleIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="logo-google" size={20} color={theme.text} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Google Drive</AppText>
            <AppText variant="caption" color="textSecondary">
              Respaldo de tu base de datos
            </AppText>
          </View>
        </View>
        <Badge label={statusLabel} tone={statusTone} />
      </View>

      {!configured ? (
        <>
          <AppText variant="small" color="textSecondary">
            La app todavía no tiene configuradas las credenciales de Google. Define
            {' '}
            <AppText variant="smallStrong">EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID</AppText>
            {' '}
            en tu archivo .env.local y vuelve a compilar la app. En el README están los pasos
            completos de Google Cloud.
          </AppText>
        </>
      ) : !account ? (
        <>
          <AppText variant="small" color="textSecondary">
            Conecta tu cuenta para guardar una copia de tu base de datos en la carpeta privada de
            Pyme App en Drive. Solo tú puedes verla y la app sigue funcionando sin internet.
          </AppText>

          {expoGo ? (
            <AppText variant="caption" color="warning">
              Expo Go no incluye el módulo nativo de Google. Necesitas un development build.
            </AppText>
          ) : null}

          <Button
            title="Conectar con Google"
            variant="secondary"
            icon={<Ionicons name="logo-google" size={18} color={theme.text} />}
            onPress={handleConnect}
            loading={busy === 'connect'}
            disabled={expoGo || busy !== null}
          />
        </>
      ) : (
        <>
          <View style={[styles.account, { borderColor: theme.border }]}>
            {account.photo ? (
              <Image source={{ uri: account.photo }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: theme.primarySoft },
                ]}>
                <AppText variant="smallStrong" style={{ color: theme.primary }}>
                  {initials(account.name ?? account.email)}
                </AppText>
              </View>
            )}
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {account.name ?? 'Cuenta de Google'}
              </AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {account.email}
              </AppText>
            </View>
          </View>

          <View style={styles.backupInfo}>
            <Ionicons name="cloud-done-outline" size={18} color={theme.success} />
            <View style={styles.flex}>
              <AppText variant="smallStrong">
                {lastBackup ? 'Último respaldo' : 'Sin respaldos todavía'}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {lastBackup
                  ? `${formatDateTime(lastBackup.createdAt)} · ${formatFileSize(lastBackup.size)}`
                  : 'Haz tu primer respaldo ahora.'}
              </AppText>
            </View>
          </View>

          <Button
            title="Respaldar ahora"
            onPress={handleBackup}
            loading={busy === 'backup'}
            disabled={busy !== null}
            icon={<Ionicons name="cloud-upload-outline" size={18} color={theme.onPrimary} />}
          />

          <View style={styles.buttonRow}>
            <Button
              title="Restaurar"
              variant="secondary"
              onPress={() => router.push('/respaldo/restaurar')}
              disabled={busy !== null}
              style={styles.flex}
              icon={<Ionicons name="cloud-download-outline" size={18} color={theme.text} />}
            />
            <Button
              title="Desconectar"
              variant="ghost"
              onPress={confirmDisconnect}
              disabled={busy !== null}
              loading={busy === 'disconnect'}
              style={styles.flex}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopColor: theme.border }]}>
            <View style={styles.flex}>
              <AppText variant="smallStrong">Respaldo automático</AppText>
              <AppText variant="caption" color="textSecondary">
                Se actualiza al abrir la app si el último respaldo tiene más de 12 horas.
              </AppText>
            </View>
            <Switch
              value={autoBackup}
              onValueChange={setAutoBackup}
              trackColor={{ false: theme.backgroundSelected, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  googleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
});
