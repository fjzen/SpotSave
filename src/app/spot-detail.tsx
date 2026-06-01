import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

export default function SpotDetailScreen() {
  const { id, title, note, imageUri, latitude, longitude, isPublic, uid } = useLocalSearchParams<{
    id: string;
    title: string;
    note: string;
    imageUri: string;
    latitude: string;
    longitude: string;
    isPublic: string;
    uid: string;
  }>();

  const isOwner = auth.currentUser?.uid === uid;

  const handleDelete = () => {
    Alert.alert('Delete Spot', 'Are you sure you want to delete this spot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete from user's private collection
            await deleteDoc(doc(db, `users/${auth.currentUser!.uid}/spots/${id}`));
            // Delete from public collection if it was public
            if (isPublic === 'true') {
              await deleteDoc(doc(db, `spots/${id}`));
            }
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
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
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.badge, isPublic === 'true' ? styles.badgePublic : styles.badgePrivate]}>
            {isPublic === 'true' ? 'Public' : 'Private'}
          </Text>
        </View>

        {/* Note */}
        {note ? <Text style={styles.note}>{note}</Text> : null}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.sectionValue}>
            {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
          </Text>
        </View>

        {/* Owner actions */}
        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Spot</Text>
          </TouchableOpacity>
        )}

        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
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
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  sectionValue: { fontSize: 15, color: '#333' },
  deleteButton: { backgroundColor: '#ff3b30', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 12 },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
  backButton: { padding: 14, alignItems: 'center' },
  backButtonText: { color: '#666' },
});
