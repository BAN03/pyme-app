/**
 * Design tokens for the app. Colors are defined for light and dark mode.
 * Keep every color used by components here so the theme stays consistent.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    background: '#F4F6F8',
    card: '#FFFFFF',
    backgroundElement: '#EEF2F6',
    backgroundSelected: '#E2E8F0',
    border: '#E2E8F0',
    primary: '#0F766E',
    primarySoft: '#D5F5EF',
    onPrimary: '#FFFFFF',
    success: '#15803D',
    successSoft: '#DCFCE7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
    info: '#1D4ED8',
    infoSoft: '#DBEAFE',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  dark: {
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    background: '#0B1220',
    card: '#131C2B',
    backgroundElement: '#1B2637',
    backgroundSelected: '#243247',
    border: '#243247',
    primary: '#2DD4BF',
    primarySoft: '#134E4A',
    onPrimary: '#042F2E',
    success: '#4ADE80',
    successSoft: '#14532D',
    danger: '#F87171',
    dangerSoft: '#4C1D1D',
    warning: '#FBBF24',
    warningSoft: '#451A03',
    info: '#60A5FA',
    infoSoft: '#1E3A8A',
    overlay: 'rgba(2, 6, 23, 0.65)',
  },
} as const;

export type Theme = typeof Colors.light;
export type ThemeColor = keyof Theme;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
