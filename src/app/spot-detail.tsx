import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useLocationName } from '@/hooks/use-location-name';

export default function SpotDetailScreen() {
  const { id, title, note, imageUri, latitude, longitude, isPublic, uid, from } = useLocalSearchParams<{
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

  // Navigate back to the correct tab based on where we came from
  const handleBack = () => {
    if (from === 'map') {
      router.replace('/(tabs)/map');
    } else if (from === 'discover') {
      router.replace('/(tabs)/discover');
    } else {
      router.back();
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Spot', 'Are you sure you want to delete this spot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, `users/${auth.currentUser!.uid}/spots/${id}`));
            if (isPublic === 'true') {
              await deleteDoc(doc(db, `spots/${id}`));
            }
            handleBack();
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

        {/* Location — city name + precise coords */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          {locationName && <Text style={styles.sectionValue}>{locationName}</Text>}
          <Text style={styles.sectionCoords}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        </View>

        {/* Owner actions */}
        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Spot</Text>
          </TouchableOpacity>
        )}

        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  sectionValue: { fontSize: 15, color: '#333', marginBottom: 2 },
  sectionCoords: { fontSize: 12, color: '#aaa' },
  deleteButton: { backgroundColor: '#ff3b30', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
  backButton: { padding: 14, alignItems: 'center' },
  backButtonText: { color: '#666' },
});
