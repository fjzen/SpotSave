import { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { auth, db } from '@/config/firebase';
import { useTheme } from '@/context/ThemeContext';
import type { Palette } from '@/constants/theme';

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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [privateSpots, setPrivateSpots] = useState<Spot[]>([]);
  const [publicSpots, setPublicSpots] = useState<Spot[]>([]);
  const mapRef = useRef<MapView>(null);

  // The user's own spots (shown as "private" pins regardless of share status).
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, `users/${uid}/spots`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setPrivateSpots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Spot)));
    });
  }, []);

  // Public spots from everyone — exclude the current user's own (they're already shown above).
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const q = query(collection(db, 'spots'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Spot))
        .filter(s => s.uid !== uid);
      setPublicSpots(data);
    });
  }, []);

  // Center the map on the user's current location once GPS resolves,
  // while leaving the map freely pannable afterwards.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);

  const openSpot = (spot: Spot) =>
    router.push({
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
        from: 'map',
      },
    });

  const renderMarker = (spot: Spot, pinColor: string) => (
    <Marker
      key={`${spot.uid}-${spot.id}`}
      coordinate={spot.location}
      pinColor={pinColor}
      onCalloutPress={() => openSpot(spot)}
    >
      <Callout tooltip>
        <View style={styles.callout}>
          {spot.imageUri ? <Image source={{ uri: spot.imageUri }} style={styles.calloutImage} /> : null}
          <Text style={styles.calloutTitle}>{spot.title}</Text>
          {spot.note ? <Text style={styles.calloutNote} numberOfLines={1}>{spot.note}</Text> : null}
          <Text style={styles.calloutTap}>Tap to open →</Text>
        </View>
      </Callout>
    </Marker>
  );

  // Fall back to the first spot, then a default region, until GPS resolves.
  const initialRegion = {
    latitude: privateSpots[0]?.location.latitude ?? publicSpots[0]?.location.latitude ?? 37.78,
    longitude: privateSpots[0]?.location.longitude ?? publicSpots[0]?.location.longitude ?? -122.4,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} showsUserLocation>
        {privateSpots.map(spot => renderMarker(spot, colors.privatePin))}
        {publicSpots.map(spot => renderMarker(spot, colors.publicPin))}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: colors.privatePin }]} />
          <Text style={styles.legendText}>My spots</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: colors.publicPin }]} />
          <Text style={styles.legendText}>Public</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    callout: { padding: 8, width: 180, backgroundColor: c.card, borderRadius: 10 },
    calloutImage: { width: '100%', height: 90, borderRadius: 6, marginBottom: 6 },
    calloutTitle: { fontWeight: '600', fontSize: 14, marginBottom: 2, color: c.text },
    calloutNote: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    calloutTap: { fontSize: 11, color: c.tint },
    legend: { position: 'absolute', top: 60, right: 16, backgroundColor: c.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, gap: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: c.text },
  });
