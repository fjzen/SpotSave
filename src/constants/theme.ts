/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // semantic tokens used across screens
    card: '#ffffff',
    border: '#E6E8EB',
    tint: '#208AEF',
    danger: '#FF3B30',
    primary: '#000000',
    onPrimary: '#ffffff',
    // tab bar
    tabActive: '#000000',
    tabInactive: '#8A8F98',
    tabBarBg: 'rgba(255,255,255,0.82)',
    privatePin: '#208AEF',
    publicPin: '#FF3B30',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    // semantic tokens used across screens
    card: '#161718',
    border: '#2E3135',
    tint: '#3B9EFF',
    danger: '#FF453A',
    primary: '#ffffff',
    onPrimary: '#000000',
    // tab bar
    tabActive: '#ffffff',
    tabInactive: '#7C828B',
    tabBarBg: 'rgba(20,20,22,0.82)',
    privatePin: '#3B9EFF',
    publicPin: '#FF453A',
  },
} as const;

export type ThemeMode = keyof typeof Colors;
export type Palette = (typeof Colors)[ThemeMode];

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
