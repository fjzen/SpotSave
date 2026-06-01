import { useEffect } from 'react';
import { router, Slot } from 'expo-router';
import { useAuth, AuthProvider } from '@/context/AuthContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
