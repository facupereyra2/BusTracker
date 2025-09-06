import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LocationProvider, useLocationTracking } from '../../context/LocationContext';
import { COLORS } from '../../styles/theme';

const TAB_ICONS = {
  home: (color, size) => <MaterialCommunityIcons name="home-variant" size={size} color={color} />,
  time: (color, size) => <Ionicons name="time" size={size} color={color} />,
  profile: (color, size) => <Ionicons name="person" size={size} color={color} />,
};

function CustomTabBar({ state, navigation }) {
  const { isTracking, setIsTracking } = useLocationTracking();

  async function stopLocationSharing() {
    try {
      await Location.stopLocationUpdatesAsync('background-location-task');
      setIsTracking(false);
    } catch (err) {
      alert('Error al intentar detener la compartición');
    }
  }

  // Debug: muestra el valor de isTracking
  // Puedes quitar este Text cuando todo funcione bien.
  // <Text style={{ color: 'red', position: 'absolute', left: 5, top: 5, zIndex: 999 }}>
  //   isTracking: {JSON.stringify(isTracking)}
  // </Text>

  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const iconFn = TAB_ICONS[route.name];
        if (!iconFn) return null;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => {
              if (!isFocused) navigation.navigate(route.name);
            }}
          >
            {iconFn(isFocused ? COLORS.orange : COLORS.inputBg, 28)}
          </TouchableOpacity>
        );
      })}
      {isTracking && (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopLocationSharing}
        >
          <Ionicons name="power" size={24} color={COLORS.white} />
          <Text style={styles.stopButtonText}>Dejar de compartir</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data.screen;
      if (screen) {
        router.push(`/${screen.toLowerCase()}`); // Ej: /stoplocation
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <LocationProvider>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="time" options={{ title: 'Horarios' }} />
        <Tabs.Screen name="profile" options={{ title: 'Ubicación' }} />
      </Tabs>
    </LocationProvider>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    flexDirection: 'row',
    backgroundColor: COLORS.text,
    borderRadius: 32,
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  stopButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});