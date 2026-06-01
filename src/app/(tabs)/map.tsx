import { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
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
  uid: string;
}

export default function MapScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Listen to user's private spots for map pins
    const q = query(
      collection(db, `users/${uid}/spots`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot));
      setSpots(data);
    });

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: spots[0]?.location.latitude ?? 37.78,
          longitude: spots[0]?.location.longitude ?? -122.4,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {spots.map(spot => (
          <Marker
            key={spot.id}
            coordinate={spot.location}
            onCalloutPress={() => router.push({
              pathname: '/spot-detail',
              params: {
                id: spot.id,
                title: spot.title,
                note: spot.note || '',
                imageUri: spot.imageUri || '',
                latitude: String(spot.location.latitude),
                longitude: String(spot.location.longitude),
                isPublic: String(spot.isPublic),
                uid: spot.uid,
              }
            })}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{spot.title}</Text>
                {spot.note ? <Text style={styles.calloutNote}>{spot.note}</Text> : null}
                <Text style={styles.calloutTap}>Tap to open →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  callout: { padding: 8, minWidth: 150 },
  calloutTitle: { fontWeight: '600', fontSize: 14, marginBottom: 2 },
  calloutNote: { fontSize: 12, color: '#666', marginBottom: 4 },
  calloutTap: { fontSize: 11, color: '#999' },
});
