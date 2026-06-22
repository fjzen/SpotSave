import { useEffect } from 'react';
import { router, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth, AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
