/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';


export const Colors = {
  primary: '#4CAF50', // Green
  secondary: '#FF9800', // Orange
  background: '#F5F5F5', // Light gray background
  textPrimary: '#212121', // Dark gray text
  textSecondary: '#757575', // Light gray text
  border: '#E0E0E0', // Gray border
  error: '#F44336', // Red for errors
  success: '#4CAF50', // Green for success messages
  warning: '#FFC107', // Yellow for warnings
  info: '#2196F3', // Blue for informational messages
  light: '#FFFFFF', // White
  dark: '#000000', // Black
} as const;

export type ColorKeys = keyof typeof Colors;
