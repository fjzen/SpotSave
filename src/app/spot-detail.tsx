import { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useLocationName } from '@/hooks/use-location-name';

export default function SpotDetailScreen() {
  const { id, title: initialTitle, note: initialNote, imageUri, latitude, longitude, isPublic: initialIsPublic, uid, from } = useLocalSearchParams<{
    id: string;
    title: string;
    note: string;
    imageUri: string;
    latitude: string;
    longitude: string;
    isPublic: string;
    uid: string;
    from?: string;
  }>();

  const isOwner = auth.currentUser?.uid === uid;
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const locationName = useLocationName(lat, lng);

  // Edit state
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editNote, setEditNote] = useState(initialNote || '');
  const [editIsPublic, setEditIsPublic] = useState(initialIsPublic === 'true');
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (from === 'map') router.replace('/(tabs)/map');
    else if (from === 'discover') router.replace('/(tabs)/discover');
    else router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete Spot', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `users/${auth.currentUser!.uid}/spots/${id}`));
            if (initialIsPublic === 'true') await deleteDoc(doc(db, `spots/${id}`));
            handleBack();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editTitle) return Alert.alert('Error', 'Title cannot be empty.');
    setSaving(true);
    try {
      const updates = { title: editTitle, note: editNote, isPublic: editIsPublic };

      // Update private collection
      await updateDoc(doc(db, `users/${auth.currentUser!.uid}/spots/${id}`), updates);

      // Handle public collection changes
      if (editIsPublic) {
        await updateDoc(doc(db, `spots/${id}`), updates).catch(() => {});
      } else if (initialIsPublic === 'true' && !editIsPublic) {
        // Was public, now private — remove from public collection
        await deleteDoc(doc(db, `spots/${id}`)).catch(() => {});
      }

      setEditVisible(false);
      Alert.alert('Saved!', 'Your spot has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Photo */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No photo</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Title and badge */}
        <View style={styles.row}>
          <Text style={styles.title}>{editTitle}</Text>
          <Text style={[styles.badge, editIsPublic ? styles.badgePublic : styles.badgePrivate]}>
            {editIsPublic ? 'Public' : 'Private'}
          </Text>
        </View>

        {/* Note */}
        {editNote ? <Text style={styles.note}>{editNote}</Text> : null}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          {locationName && <Text style={styles.sectionValue}>{locationName}</Text>}
          <Text style={styles.sectionCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        </View>

        {/* Owner actions */}
        {isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditVisible(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Edit bottom sheet */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Spot</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
            />

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Note (optional)"
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Share publicly</Text>
              <Switch value={editIsPublic} onValueChange={setEditIsPublic} />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  image: { width: '100%', height: 280 },
  imagePlaceholder: { width: '100%', height: 200, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: '#999' },
  body: { padding: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', flex: 1 },
  badge: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginLeft: 8 },
  badgePublic: { backgroundColor: '#000', color: '#fff' },
  badgePrivate: { backgroundColor: '#eee', color: '#666' },
  note: { fontSize: 16, color: '#444', marginBottom: 24, lineHeight: 24 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  sectionValue: { fontSize: 15, color: '#333', marginBottom: 2 },
  sectionCoords: { fontSize: 12, color: '#aaa' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  editButton: { flex: 1, borderWidth: 1, borderColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center' },
  editButtonText: { fontWeight: '600' },
  deleteButton: { flex: 1, backgroundColor: '#ff3b30', padding: 14, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
  backButton: { padding: 14, alignItems: 'center' },
  backButtonText: { color: '#666' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  fieldLabel: { fontSize: 13, color: '#999', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  saveButton: { backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  saveButtonText: { color: '#fff', fontWeight: '600' },
  cancelButton: { padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#666' },
});
