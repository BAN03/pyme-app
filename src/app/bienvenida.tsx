import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useBackup } from '@/hooks/use-backup';
import { useTheme } from '@/hooks/use-theme';
import { markWelcomeSeen, useWelcomeSeen } from '@/lib/app-prefs';
import { isExpoGo } from '@/lib/google-auth';

/**
 * First screen of the app. Offers Google sign-in / sign-up and a way to keep
 * using the app without an account. There is deliberately no tour.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const seen = useWelcomeSeen();
  const { configured, account, busy, connect } = useBackup();
  const [working, setWorking] = useState(false);

  // Already onboarded (or already signed in) — skip straight to the app.
  useEffect(() => {
    if (seen || account) {
      router.replace('/(tabs)');
    }
  }, [seen, account, router]);

  const enter = () => {
    markWelcomeSeen();
    router.replace('/(tabs)');
  };

  const handleGoogle = async () => {
    try {
      setWorking(true);
      await connect();
      markWelcomeSeen();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'No se pudo continuar',
        error instanceof Error && error.message
          ? error.message
          : 'Revisa tu conexión e intenta de nuevo.',
      );
    } finally {
      setWorking(false);
    }
  };

  const loading = working || busy === 'connect';
  const googleDisabled = loading || isExpoGo() || !configured;

  if (seen || account) return null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="storefront" size={40} color={theme.primary} />
        </View>
        <AppText variant="display" align="center">
          Pyme
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          Controla tus ventas, insumos y ganancias desde tu teléfono. Tus datos viven en el
          dispositivo y funcionan sin internet.
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          title="Continuar con Google"
          icon={<Ionicons name="logo-google" size={18} color={theme.onPrimary} />}
          onPress={handleGoogle}
          loading={loading}
          disabled={googleDisabled}
          fullWidth
        />

        {!configured ? (
          <AppText variant="caption" color="warning" align="center">
            Falta configurar las credenciales de Google (ver README).
          </AppText>
        ) : isExpoGo() ? (
          <AppText variant="caption" color="warning" align="center">
            Google requiere un development build; Expo Go no incluye el módulo nativo.
          </AppText>
        ) : null}

        <Pressable onPress={enter} hitSlop={8} style={styles.skip}>
          <AppText variant="bodyStrong" color="primary">
            Continuar sin cuenta
          </AppText>
        </Pressable>

        <AppText variant="caption" color="textSecondary" align="center">
          Podrás conectar tu cuenta más tarde desde Ajustes para respaldar tu información en
          Drive.
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
