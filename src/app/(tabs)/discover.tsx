import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { router } from 'expo-router';
import { db } from '@/config/firebase';

interface Spot {
  id: string;
  title: string;
  note: string;
  imageUri: string | null;
  location: { latitude: number; longitude: number };
  isPublic: boolean;
  uid: string;
  createdAt: any;
}

export default function DiscoverScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener on public spots collection
    const q = query(
      collection(db, 'spots'),
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
        <Text style={styles.title}>Discover</Text>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : spots.length === 0 ? (
        <Text style={styles.empty}>No public spots yet. Be the first!</Text>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: '/spot-detail',
                params: {
                  id: item.id,
                  title: item.title,
                  note: item.note || '',
                  imageUri: item.imageUri || '',
                  latitude: String(item.location.latitude),
                  longitude: String(item.location.longitude),
                  isPublic: String(item.isPublic),
                  uid: item.uid,
                }
              })}
            >
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No photo</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
                <Text style={styles.cardLocation}>
                  {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                </Text>
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
  header: { paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#999', marginTop: 60 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  image: { width: '100%', height: 180 },
  imagePlaceholder: { width: '100%', height: 120, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: '#999' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardNote: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardLocation: { fontSize: 12, color: '#999' },
});
