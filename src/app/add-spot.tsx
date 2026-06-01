import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export default function AddSpotScreen() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sensor 1: Camera — falls back to photo library if camera unavailable (e.g. simulator)
  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission denied', 'Camera access is required to take a photo.');
    }
    let result;
    try {
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    } catch {
      const libStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libStatus.status !== 'granted') {
        return Alert.alert('Permission denied', 'Photo library access is required.');
      }
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
    }
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Sensor 2: GPS — request permission and get current coordinates
  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission denied', 'Location access is required to save your spot.');
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    Alert.alert('Location captured', `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
  };

  // Save spot to Firestore — image URI stored locally, all other data in Firestore
  const handleSave = async () => {
    if (!title) return Alert.alert('Error', 'Please enter a title.');
    if (!image) return Alert.alert('Error', 'Please take a photo.');
    if (!location) return Alert.alert('Error', 'Please capture your location.');

    setLoading(true);
    try {
      const spotData = {
        title,
        note,
        imageUri: image, // local URI — persists on device
        location,
        isPublic,
        uid: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
      };

      // Always save to private user collection
      await addDoc(collection(db, `users/${auth.currentUser!.uid}/spots`), spotData);

      // Also save to public collection if toggled on
      if (isPublic) {
        await addDoc(collection(db, 'spots'), { ...spotData, imageUri: null });
      }

      console.log('Spot saved!');
      Alert.alert('Saved!', 'Your spot has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error saving spot:', error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Add Spot</Text>

      {/* Title and note inputs */}
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
      />

      {/* Camera/photo button + preview */}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>{image ? 'Retake Photo' : 'Take Photo'}</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={styles.preview} />}

      {/* GPS button */}
      <TouchableOpacity style={styles.button} onPress={getLocation}>
        <Text style={styles.buttonText}>{location ? 'Location Captured ✓' : 'Get Location'}</Text>
      </TouchableOpacity>

      {/* Public/private toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Share publicly</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Spot'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  button: { borderWidth: 1, borderColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { fontWeight: '600' },
  preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  label: { fontSize: 16 },
  saveButton: { backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontSize: 16, color: '#666' },
});
