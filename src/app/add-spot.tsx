import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, Switch, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

// Create-a-spot form: capture location, attach a photo, and save it to Firestore
// (privately, and to the public feed when shared).
export default function AddSpotScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // A photo may be handed in from the center camera button or the library shortcut.
  const { imageUri: presetImage } = useLocalSearchParams<{ imageUri?: string }>();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<string | null>(presetImage ?? null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [locationError, setLocationError] = useState(false);

  // Get the device's coordinates for the spot, with a timeout + last-known
  // fallback so a slow or missing GPS fix doesn't hang the form.
  const captureLocation = async () => {
    setLocationError(false);
    setLocation(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setLocationError(true); return; }
    try {
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      // A live fix can be slow indoors — fall back to the last known position
      // so the user isn't blocked waiting on GPS.
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      } else {
        setLocationError(true);
      }
    }
  };

  // Auto-capture GPS when screen opens
  useEffect(() => { captureLocation(); }, []);

  // Sensor 1: Camera
  const openCamera = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Camera access is required.');
    let result;
    try {
      result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    } catch {
      return Alert.alert('Camera unavailable', 'Use photo library instead.');
    }
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Sensor 1 (fallback): Photo Library
  const openLibrary = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Photo library access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Upload image to Cloudinary using base64
  const uploadImage = async (uri: string): Promise<string> => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: `data:image/jpeg;base64,${base64}`,
          upload_preset: uploadPreset,
        }),
      }
    );
    const data = await response.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
    return data.secure_url;
  };

  // Save spot to Firestore
  const handleSave = async () => {
    if (!title) return Alert.alert('Error', 'Please enter a title.');
    if (!image) return Alert.alert('Error', 'Please add a photo.');

    // GPS may be unavailable indoors — let the user save anyway rather than blocking.
    if (!location) {
      return Alert.alert(
        'No location',
        "We couldn't get your GPS location. Save without it? The spot won't appear on the map.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: () => persistSpot(null) },
        ]
      );
    }
    persistSpot(location);
  };

  const persistSpot = async (loc: { latitude: number; longitude: number } | null) => {
    setLoading(true);
    try {
      let imageUri = image!;
      try {
        imageUri = await uploadImage(image!);
        console.log('Cloudinary upload success:', imageUri);
      } catch (uploadError: any) {
        console.log('Cloudinary failed, using local URI:', uploadError.message);
      }

      const spotData = {
        title,
        note,
        imageUri,
        location: loc,
        isPublic,
        uid: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
      };

      // Always save to the user's private collection; mirror to the shared
      // public feed with the SAME id when the spot is marked public, so the two
      // copies can be edited/deleted together later.
      const uid = auth.currentUser!.uid;
      const privateRef = doc(collection(db, `users/${uid}/spots`));
      await setDoc(privateRef, spotData);
      if (isPublic) await setDoc(doc(collection(db, 'spots'), privateRef.id), spotData);

      Alert.alert('Saved!', 'Your spot has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // KeyboardAvoidingView keeps the note input and Save button above the keyboard.
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>New Spot</Text>

      {/* GPS status */}
      {locationError ? (
        <TouchableOpacity onPress={captureLocation} style={styles.gpsRetry}>
          <Text style={styles.gpsStatus}>📍 Location unavailable — tap to retry</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.gpsStatus}>
          {location ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : '📍 Capturing location...'}
        </Text>
      )}

      {/* Photo preview / picker (camera-first) */}
      {image ? (
        <Image source={{ uri: image }} style={styles.preview} />
      ) : (
        <TouchableOpacity style={styles.photoPlaceholder} onPress={() => setPickerVisible(true)}>
          <Text style={styles.photoPlaceholderText}>Tap to add a photo</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.button} onPress={() => setPickerVisible(true)}>
        <Text style={styles.buttonText}>{image ? 'Change Photo' : 'Add Photo'}</Text>
      </TouchableOpacity>

      {/* Title and note inputs */}
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Note (optional)"
        placeholderTextColor={colors.textSecondary}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
      />

      {/* Public/private toggle */}
      <View style={styles.row}>
        <Text style={styles.label}>Share publicly</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.tint }} />
      </View>

      {/* Save button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Spot'}</Text>
      </TouchableOpacity>

      {/* Photo source picker bottom sheet */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <TouchableOpacity style={styles.modalButton} onPress={openCamera}>
              <Text style={styles.modalButtonText}>📷  Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={openLibrary}>
              <Text style={styles.modalButtonText}>🖼️  Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPickerVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
    backButton: { marginBottom: 16 },
    backButtonText: { fontSize: 16, color: c.textSecondary },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: c.text },
    gpsStatus: { fontSize: 13, color: c.textSecondary, marginBottom: 24 },
    gpsRetry: { marginBottom: 24 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, marginBottom: 16, color: c.text, backgroundColor: c.card },
    textArea: { height: 80, textAlignVertical: 'top' },
    photoPlaceholder: { height: 180, borderRadius: 12, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', backgroundColor: c.backgroundElement, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    photoPlaceholderText: { color: c.textSecondary, fontSize: 15 },
    button: { borderWidth: 1, borderColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
    buttonText: { fontWeight: '600', color: c.text },
    preview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    label: { fontSize: 16, color: c.text },
    saveButton: { backgroundColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
    saveButtonText: { color: c.onPrimary, fontWeight: '600', fontSize: 16 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center', color: c.text },
    modalButton: { padding: 16, borderRadius: 12, backgroundColor: c.backgroundElement, marginBottom: 12, alignItems: 'center' },
    modalButtonText: { fontSize: 16, fontWeight: '500', color: c.text },
    cancelButton: { padding: 14, alignItems: 'center' },
    cancelButtonText: { color: c.textSecondary, fontSize: 15 },
  });
