import { useState, useMemo, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc, updateDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useLocationName } from '@/hooks/use-location-name';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

// Detail view for a single spot. Opened from any list/map; the spot's data is
// passed in as navigation params and kept fresh via a live Firestore listener.
// Owners can edit or delete; others see a read-only view.
export default function SpotDetailScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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

  // Owner check drives whether Edit/Delete show. Uses the reactive auth user so
  // it stays correct even if the screen loads before the session is restored.
  const isOwner = user?.uid === uid;
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);
  const locationName = useLocationName(hasLocation ? lat : 0, hasLocation ? lng : 0);

  // Edit state
  const [editVisible, setEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editNote, setEditNote] = useState(initialNote || '');
  const [editIsPublic, setEditIsPublic] = useState(initialIsPublic === 'true');
  const [saving, setSaving] = useState(false);

  // Keep the view in sync with the live document so edits (here or elsewhere)
  // never leave stale title/note/visibility on screen. The nav params are only
  // the initial seed. We skip updates while the edit sheet is open so an
  // incoming snapshot can't clobber what the user is typing.
  useEffect(() => {
    if (!id) return;
    const ref = isOwner
      ? doc(db, `users/${user!.uid}/spots/${id}`)
      : doc(db, `spots/${id}`);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists() || editVisible) return;
      const d = snap.data() as { title?: string; note?: string; isPublic?: boolean };
      setEditTitle(d.title ?? '');
      setEditNote(d.note ?? '');
      setEditIsPublic(!!d.isPublic);
    });
  }, [id, isOwner, editVisible, user?.uid]);

  // Returns to wherever the user came from (map, discover, or the previous screen).
  const handleBack = () => {
    if (from === 'map') router.replace('/(tabs)/map');
    else if (from === 'discover') router.replace('/(tabs)/discover');
    else router.back();
  };

  // Confirm, then remove the spot from the private collection and, if it was
  // shared, the public one too.
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

  // Save edits to the private copy, then keep the public copy in sync with the
  // chosen visibility (create/update it when public, remove it when made private).
  const handleSaveEdit = async () => {
    if (!editTitle) return Alert.alert('Error', 'Title cannot be empty.');
    setSaving(true);
    try {
      const uid = auth.currentUser!.uid;
      const updates = { title: editTitle, note: editNote, isPublic: editIsPublic };

      // Update private collection
      await updateDoc(doc(db, `users/${uid}/spots/${id}`), updates);

      // Handle public collection changes
      if (editIsPublic) {
        // Write the full document so a spot that was never public is created
        // correctly (including createdAt, which the Discover/map query orders by).
        // merge keeps it idempotent if the public copy already exists.
        await setDoc(
          doc(db, `spots/${id}`),
          {
            title: editTitle,
            note: editNote,
            imageUri: imageUri || null,
            location: hasLocation ? { latitude: lat, longitude: lng } : null,
            isPublic: true,
            uid,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else if (initialIsPublic === 'true') {
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
          {hasLocation ? (
            <>
              {locationName && <Text style={styles.sectionValue}>{locationName}</Text>}
              <Text style={styles.sectionCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
            </>
          ) : (
            <Text style={styles.sectionValue}>Location not set</Text>
          )}
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

      {/* Edit bottom sheet — KeyboardAvoidingView lifts it above the keyboard */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Spot</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Note (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Share publicly</Text>
              <Switch value={editIsPublic} onValueChange={setEditIsPublic} trackColor={{ true: colors.tint }} />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setEditVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    image: { width: '100%', height: 280 },
    imagePlaceholder: { width: '100%', height: 200, backgroundColor: c.backgroundElement, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: c.textSecondary },
    body: { padding: 24 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', flex: 1, color: c.text },
    badge: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', marginLeft: 8 },
    badgePublic: { backgroundColor: c.tint, color: '#fff' },
    badgePrivate: { backgroundColor: c.backgroundSelected, color: c.textSecondary },
    note: { fontSize: 16, color: c.text, marginBottom: 24, lineHeight: 24 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    sectionValue: { fontSize: 15, color: c.text, marginBottom: 2 },
    sectionCoords: { fontSize: 12, color: c.textSecondary },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    editButton: { flex: 1, borderWidth: 1, borderColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
    editButtonText: { fontWeight: '600', color: c.text },
    deleteButton: { flex: 1, backgroundColor: c.danger, padding: 14, borderRadius: 8, alignItems: 'center' },
    deleteButtonText: { color: '#fff', fontWeight: '600' },
    backButton: { padding: 14, alignItems: 'center' },
    backButtonText: { color: c.textSecondary },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: c.text },
    fieldLabel: { fontSize: 13, color: c.textSecondary, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15, color: c.text, backgroundColor: c.background },
    textArea: { height: 80, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    saveButton: { backgroundColor: c.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
    saveButtonText: { color: c.onPrimary, fontWeight: '600' },
    cancelButton: { padding: 14, alignItems: 'center' },
    cancelButtonText: { color: c.textSecondary },
  });
