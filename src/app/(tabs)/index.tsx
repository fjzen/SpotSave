import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { router } from 'expo-router';
import { auth, db } from '@/config/firebase';

interface Spot {
  id: string;
  title: string;
  note: string;
  imageUri: string | null;
  location: { latitude: number; longitude: number };
  isPublic: boolean;
  createdAt: any;
}

export default function MySpotsScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Real-time listener on user's private spots collection
    const q = query(
      collection(db, `users/${uid}/spots`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot));
      setSpots(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Spots</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-spot')}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : spots.length === 0 ? (
        <Text style={styles.empty}>No spots yet. Add your first one!</Text>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              {item.imageUri && (
                <Image source={{ uri: item.imageUri }} style={styles.image} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
                <Text style={styles.cardLocation}>
                  {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                </Text>
                <Text style={styles.cardBadge}>{item.isPublic ? 'Public' : 'Private'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  addButton: { backgroundColor: '#000', padding: 10, borderRadius: 8, paddingHorizontal: 16 },
  addButtonText: { color: '#fff', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 60 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  image: { width: '100%', height: 180 },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardNote: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardLocation: { fontSize: 12, color: '#999', marginBottom: 4 },
  cardBadge: { fontSize: 11, color: '#fff', backgroundColor: '#000', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
});
