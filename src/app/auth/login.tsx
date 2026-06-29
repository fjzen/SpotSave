import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

export default function LoginScreen() {
    // Build styles from the active theme so the screen follows light/dark mode.
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Sign in with Firebase, then hand off to the main app. Errors surface as alerts.
    const handleLogin = async () => {
        if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Login failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        // KeyboardAvoidingView keeps the inputs and button visible above the keyboard.
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.inner}>
                <Text style={styles.title}>SpotSave</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/auth/register')}>
                    <Text style={styles.link}>Don't have an account? Register</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (c: Palette) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        inner: { flex: 1, justifyContent: 'center', padding: 24 },
        title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: c.text },
        input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, marginBottom: 16, color: c.text, backgroundColor: c.card },
        button: { backgroundColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
        buttonText: { color: c.onPrimary, fontWeight: '600' },
        link: { textAlign: 'center', color: c.textSecondary },
    });
