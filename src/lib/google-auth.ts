import Constants from 'expo-constants';

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const WEB_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '').trim();

export type GoogleAccount = {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
};

export type GoogleSession = {
  account: GoogleAccount;
  accessToken: string;
};

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let modulePromise: Promise<GoogleModule> | null = null;
let configured = false;

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export function isGoogleAuthConfigured(): boolean {
  return WEB_CLIENT_ID.length > 0;
}

/** True when the app is running inside Expo Go, which has no Google Sign-In native module. */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

async function loadModule(): Promise<GoogleModule> {
  if (!modulePromise) {
    modulePromise = import('@react-native-google-signin/google-signin');
  }
  return modulePromise;
}

async function configure(): Promise<GoogleModule> {
  if (!WEB_CLIENT_ID) {
    throw new GoogleAuthError(
      'Falta el ID de cliente de Google. Agrega EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.local y vuelve a compilar la app.',
    );
  }

  const google = await loadModule();

  if (!configured) {
    google.GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      scopes: [DRIVE_APPDATA_SCOPE],
      offlineAccess: false,
    });
    configured = true;
  }

  return google;
}

function toAccount(user: {
  user: { id: string; name: string | null; email: string; photo: string | null };
}): GoogleAccount {
  return {
    id: user.user.id,
    name: user.user.name,
    email: user.user.email,
    photo: user.user.photo,
  };
}

function toFriendlyError(error: unknown): Error {
  if (error instanceof GoogleAuthError) return error;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'SIGN_IN_CANCELLED':
      return new GoogleAuthError('Cancelaste el inicio de sesión.');
    case 'IN_PROGRESS':
      return new GoogleAuthError('Ya hay un inicio de sesión en curso. Espera un momento.');
    case 'PLAY_SERVICES_NOT_AVAILABLE':
      return new GoogleAuthError(
        'Google Play Services no está disponible o está desactualizado.',
      );
    case 'SIGN_IN_REQUIRED':
      return new GoogleAuthError('Vuelve a conectar tu cuenta de Google.');
    default:
      break;
  }

  if (isExpoGo()) {
    return new GoogleAuthError(
      'El inicio de sesión con Google requiere un development build. Expo Go no incluye el módulo nativo.',
    );
  }

  if (error instanceof Error && error.message) return error;

  return new GoogleAuthError('No se pudo completar la operación con Google.');
}

export async function signInWithGoogle(): Promise<GoogleSession> {
  try {
    const { GoogleSignin } = await configure();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      throw new GoogleAuthError('Cancelaste el inicio de sesión.');
    }

    const tokens = await GoogleSignin.getTokens();
    return { account: toAccount(response.data), accessToken: tokens.accessToken };
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Tries to recover the Google session without showing UI. Returns `null` when
 * there is no saved credential (for example, the user revoked access).
 */
export async function restoreGoogleSession(): Promise<GoogleSession | null> {
  if (!isGoogleAuthConfigured()) return null;

  try {
    const { GoogleSignin } = await configure();
    const response = await GoogleSignin.signInSilently();
    if (response.type !== 'success') return null;

    const tokens = await GoogleSignin.getTokens();
    return { account: toAccount(response.data), accessToken: tokens.accessToken };
  } catch (error) {
    if (isExpoGo()) return null;
    throw toFriendlyError(error);
  }
}

/** Clears a stale cached access token and asks Google for a fresh one. */
export async function refreshAccessToken(staleToken: string): Promise<string> {
  const { GoogleSignin } = await configure();

  try {
    await GoogleSignin.clearCachedAccessToken(staleToken);
  } catch {
    // Clearing is best-effort; getTokens below may still return a valid token.
  }

  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

export async function signOutGoogle(): Promise<void> {
  try {
    const { GoogleSignin } = await configure();
    await GoogleSignin.signOut();
  } catch {
    // Local state is cleared by the caller even if Google sign-out fails.
  }
}
