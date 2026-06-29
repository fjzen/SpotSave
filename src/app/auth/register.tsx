import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

export default function RegisterScreen() {
    // Build styles from the active theme so the screen follows light/dark mode.
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    // Validate the inputs, create the Firebase account, then enter the app.
    const handleRegister = async () => {
        if (!email || !password || !confirm) {
            return Alert.alert('Error', 'Please fill in all fields');
        }
        if (password !== confirm) {
            return Alert.alert('Error', 'Passwords do not match');
        }
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Registration failed', error.message);
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
                <Text style={styles.title}>Create Account</Text>
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
                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                />
                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Register'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>Already have an account? Login</Text>
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
