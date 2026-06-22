import { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Animated } from 'react-native';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { auth } from '@/config/firebase';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

// Full-width slide control: tap a side (or anywhere) to slide between Light and Dark.
function ThemeSlider() {
  const { colors, isDark, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [trackWidth, setTrackWidth] = useState(0);
  const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: isDark ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [isDark, anim]);

  const padding = 4;
  const thumbWidth = trackWidth > 0 ? (trackWidth - padding * 2) / 2 : 0;
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, thumbWidth] });

  return (
    <Pressable
      style={styles.sliderTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      onPress={() => setMode(isDark ? 'light' : 'dark')}
    >
      {thumbWidth > 0 && (
        <Animated.View style={[styles.sliderThumb, { width: thumbWidth, transform: [{ translateX }] }]} />
      )}
      <Pressable style={styles.sliderHalf} onPress={() => setMode('light')}>
        <SymbolView name="sun.max.fill" tintColor={isDark ? colors.textSecondary : colors.onPrimary} size={16} />
        <Text style={[styles.sliderLabel, { color: isDark ? colors.textSecondary : colors.onPrimary }]}>Light</Text>
      </Pressable>
      <Pressable style={styles.sliderHalf} onPress={() => setMode('dark')}>
        <SymbolView name="moon.fill" tintColor={isDark ? colors.onPrimary : colors.textSecondary} size={16} />
        <Text style={[styles.sliderLabel, { color: isDark ? colors.onPrimary : colors.textSecondary }]}>Dark</Text>
      </Pressable>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

      {/* Appearance slider */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <ThemeSlider />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    avatarText: { color: c.onPrimary, fontSize: 32, fontWeight: '600' },
    email: { fontSize: 18, fontWeight: '500', marginBottom: 6, color: c.text },
    uid: { fontSize: 13, color: c.textSecondary, marginBottom: 32 },
    divider: { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginBottom: 32 },
    section: { width: '100%', marginBottom: 40 },
    sectionLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 10, fontWeight: '600' },
    sliderTrack: { flexDirection: 'row', width: '100%', height: 48, borderRadius: 14, backgroundColor: c.backgroundElement, padding: 4 },
    sliderThumb: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 10, backgroundColor: c.primary },
    sliderHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    sliderLabel: { fontSize: 15, fontWeight: '600' },
    logoutButton: { borderWidth: 1, borderColor: c.danger, padding: 14, borderRadius: 8, paddingHorizontal: 48 },
    logoutText: { color: c.danger, fontWeight: '600' },
  });
