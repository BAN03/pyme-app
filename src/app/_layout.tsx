import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { DATABASE_NAME, initDatabase } from '@/db/schema';

SplashScreen.preventAutoHideAsync();

async function initialize(db: SQLiteDatabase) {
  try {
    await initDatabase(db);
  } catch (error) {
    console.error('Error initializing the database', error);
  } finally {
    await SplashScreen.hideAsync();
  }
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initialize}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="venta/nueva" options={{ presentation: 'modal' }} />
          <Stack.Screen name="gasto/form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="producto/form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="insumo/form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="insumo/compra" options={{ presentation: 'modal' }} />
          <Stack.Screen name="cliente/form" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
