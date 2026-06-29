import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
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

// One spot row: photo, title, place name, and a public/private badge. It's its
// own component so the reverse-geocoding hook can run once per card.
function SpotCard({ item, onPress, styles, colors }: { item: Spot; onPress: () => void; styles: ReturnType<typeof makeStyles>; colors: Palette }) {
  const locationName = useLocationName(item.location?.latitude ?? 0, item.location?.longitude ?? 0);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.image} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.note ? <Text style={styles.cardNote}>{item.note}</Text> : null}
        <Text style={styles.cardLocation}>
          {item.location
            ? (locationName ?? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`)
            : 'No location'}
        </Text>
        <Text style={[styles.cardBadge, { backgroundColor: item.isPublic ? colors.tint : colors.backgroundSelected, color: item.isPublic ? '#fff' : colors.textSecondary }]}>
          {item.isPublic ? 'Public' : 'Private'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Home tab: the signed-in user's own saved spots, newest first.
export default function MySpotsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    // Real-time listener on user's private spots collection.
    // Depends on user.uid so it attaches once Firebase restores the session.
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
  }, [user?.uid]);

  // Secondary add path: pick from the photo library, then go straight to New Spot.
  const addFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission denied', 'Photo library access is required.');
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled) {
      router.push({ pathname: '/add-spot', params: { imageUri: result.assets[0].uri } });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Spots</Text>
        <TouchableOpacity style={styles.libraryButton} onPress={addFromLibrary} activeOpacity={0.8}>
          <SymbolView name="photo.on.rectangle" tintColor={colors.text} size={18} />
          <Text style={styles.libraryButtonText}>Library</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : spots.length === 0 ? (
        <Text style={styles.empty}>No spots yet. Tap the camera to add your first one!</Text>
      ) : (
        <FlatList
          data={spots}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SpotCard item={item} styles={styles} colors={colors} onPress={() => router.push({
              pathname: '/spot-detail',
              params: {
                id: item.id,
                title: item.title,
                note: item.note || '',
                imageUri: item.imageUri || '',
                latitude: item.location ? String(item.location.latitude) : '',
                longitude: item.location ? String(item.location.longitude) : '',
                isPublic: String(item.isPublic),
                uid: item.uid,
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: c.text },
    libraryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.backgroundElement, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
    libraryButtonText: { color: c.text, fontWeight: '600', fontSize: 14 },
    empty: { textAlign: 'center', color: c.textSecondary, marginTop: 60, paddingHorizontal: 32 },
    listContent: { paddingBottom: BottomTabInset + 40 },
    card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', backgroundColor: c.card },
    image: { width: '100%', height: 180 },
    cardBody: { padding: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: c.text },
    cardNote: { fontSize: 14, color: c.textSecondary, marginBottom: 4 },
    cardLocation: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    cardBadge: { fontSize: 11, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  });
