import { Slot } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

// Renders the active route once the session is known. While Firebase is still
// restoring the saved login, we show a splash spinner instead of a screen so
// nothing flashes before routing decisions are made (see app/index.tsx).
function RootLayoutNav() {
  const { loading } = useAuth();
  const { isDark, colors } = useTheme();

  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

// App root. Theme wraps Auth so every screen (including the splash) can read
// colors, and Auth exposes the current user to the whole tree.
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
