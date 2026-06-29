import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// Entry route ("/"). Acts as a gate: it renders nothing visible and immediately
// sends the user to the right place based on auth state. This replaces the old
// Expo starter screen that used to flash on every cold launch.
export default function Index() {
  const { user, loading } = useAuth();

  // Wait until Firebase has restored the saved session before deciding.
  if (loading) return null;

  // Signed-in users go to the app; everyone else goes to login.
  return <Redirect href={user ? '/(tabs)' : '/auth/login'} />;
}
