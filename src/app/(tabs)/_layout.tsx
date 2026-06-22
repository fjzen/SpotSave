import { useRef } from 'react';
import { Tabs, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Platform, Pressable, View, Animated, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';

// Center action: open the camera immediately (camera is the primary action),
// then hand the captured photo straight to the New Spot screen.
function CameraButton() {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Camera access needed', 'Enable camera access in Settings to take a photo.');
    }
    let result;
    try {
      result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    } catch {
      return Alert.alert('Camera unavailable', 'Try adding a photo from your library instead.');
    }
    if (!result.canceled) {
      router.push({ pathname: '/add-spot', params: { imageUri: result.assets[0].uri } });
    }
  };

  return (
    <View style={styles.addButton} pointerEvents="box-none">
      <Pressable
        onPressIn={() => animateTo(0.88)}
        onPressOut={() => animateTo(1)}
        onPress={openCamera}
        hitSlop={12}
      >
        <Animated.View
          style={[
            styles.addButtonInner,
            { backgroundColor: colors.primary, transform: [{ scale }] },
          ]}
        >
          <SymbolView name="camera.fill" tintColor={colors.onPrimary} size={26} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.tabBarBg, borderTopColor: colors.border },
        ],
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
              style={[StyleSheet.absoluteFill, styles.blurBorder, { borderTopColor: colors.border }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Spots',
          tabBarIcon: ({ color }) => (
            <SymbolView name="mappin.and.ellipse" tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <SymbolView name="globe" tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => <CameraButton />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <SymbolView name="map" tintColor={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView name="person.circle" tintColor={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  blurBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  addButton: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
