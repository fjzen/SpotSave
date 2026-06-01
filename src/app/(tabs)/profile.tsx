import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '@/config/firebase';

export default function ProfileScreen() {
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error: any) {
      console.log('Logout error:', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Avatar circle */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user?.email?.charAt(0).toUpperCase() ?? '?'}
        </Text>
      </View>

      {/* User info */}
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.uid}>ID: {user?.uid?.slice(0, 8)}...</Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', paddingTop: 80 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  email: { fontSize: 18, fontWeight: '500', marginBottom: 6 },
  uid: { fontSize: 13, color: '#999', marginBottom: 32 },
  divider: { width: '80%', height: 0.5, backgroundColor: '#eee', marginBottom: 32 },
  logoutButton: { borderWidth: 1, borderColor: '#ff3b30', padding: 14, borderRadius: 8, paddingHorizontal: 48 },
  logoutText: { color: '#ff3b30', fontWeight: '600' },
});
