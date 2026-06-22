
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        console.log('Register button pressed');
        console.log('Email:', email, 'Password:', password);
        if (!email || !password || !confirm) {
            console.log('Validation failed');
            return Alert.alert('Error', 'Please fill in all fields');
        }
        if (password !== confirm) {
            console.log('Passwords do not match');
            return Alert.alert('Error', 'Passwords do not match');
        }
        setLoading(true);
        try {
            console.log('Attempting Firebase registration...');
            const result = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Success:', result.user.uid);
            router.replace('/(tabs)');
        } catch (error: any) {
            console.log('Firebase error:', error.code, error.message);
            Alert.alert('Registration failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
    button: { backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
    buttonText: { color: '#fff', fontWeight: '600' },
    link: { textAlign: 'center', color: '#666' },
});