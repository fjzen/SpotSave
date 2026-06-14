import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { router } from 'expo-router';
import { db } from '@/config/firebase';
import { useLocationName } from '@/hooks/use-location-name';
import { useTheme } from '@/context/ThemeContext';
import { BottomTabInset, type Palette } from '@/constants/theme';

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

function SpotCard({ item, onPress, styles }: { item: Spot; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  const locationName = useLocationName(item.location.latitude, item.location.longitude);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
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
          {locationName ?? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SpotCard item={item} styles={styles} onPress={() => router.push({
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
                from: 'discover',
              }
            })} />
          )}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: 60 },
    header: { paddingHorizontal: 24, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: c.text },
    empty: { textAlign: 'center', color: c.textSecondary, marginTop: 60 },
    listContent: { paddingBottom: BottomTabInset + 40 },
    card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', backgroundColor: c.card },
    image: { width: '100%', height: 180 },
    imagePlaceholder: { width: '100%', height: 120, backgroundColor: c.backgroundElement, justifyContent: 'center', alignItems: 'center' },
    imagePlaceholderText: { color: c.textSecondary },
    cardBody: { padding: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: c.text },
    cardNote: { fontSize: 14, color: c.textSecondary, marginBottom: 4 },
    cardLocation: { fontSize: 12, color: c.textSecondary },
  });
