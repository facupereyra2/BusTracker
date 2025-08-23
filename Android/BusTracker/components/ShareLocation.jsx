import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { onValue, ref, set } from 'firebase/database';
import { Text } from 'native-base';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { db } from '../constants/firebaseConfig';

const LOCATION_TASK_NAME = 'background-location-task';

let globalShareData = {};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  if (data && globalShareData.routeId) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      await set(ref(db, `locations/${globalShareData.routeId}`), {
        origin: globalShareData.origin,
        originCoord: globalShareData.originCoord,
        destination: globalShareData.destination,
        schedule: globalShareData.schedule,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      });
    }
  }
});

export default function ShareLocation() {
  const [cities, setCities] = useState({});
  const [origin, setOrigin] = useState('');
  const [originCoord, setOriginCoord] = useState('');
  const [destination, setDestination] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [routeId, setRouteId] = useState('');
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar ciudades
  useEffect(() => {
    const citiesRef = ref(db, "Cities");
    onValue(citiesRef, (snapshot) => {
      const data = snapshot.val();
      setCities(data || {});
      setLoading(false);
    });
  }, []);

  // Cargar destinos disponibles según origen
  useEffect(() => {
    if (!origin) {
      setAvailableDestinations([]);
      setDestination('');
      setSchedules([]);
      setSelectedSchedule('');
      setRouteId('');
      return;
    }
    const recorridosRef = ref(db, "Recorridos");
    onValue(recorridosRef, (snapshot) => {
      const data = snapshot.val();
      const destinationsSet = new Set();
      for (const recorrido in data) {
        const citiesArray = data[recorrido].cities.filter(Boolean);
        let originIndex = -1;
        citiesArray.forEach((ciudad, index) => {
          const cityName = cities[ciudad.cityID]?.name;
          if (cityName === origin) originIndex = index;
        });
        if (originIndex !== -1) {
          for (let i = originIndex + 1; i < citiesArray.length; i++) {
            const cityName = cities[citiesArray[i].cityID]?.name;
            if (cityName) destinationsSet.add(cityName);
          }
        }
      }
      setAvailableDestinations(Array.from(destinationsSet));
      setDestination('');
      setSchedules([]);
      setSelectedSchedule('');
      setRouteId('');
    });
    // Guardar coordenadas del origen
    const cityEntry = Object.values(cities).find(c => c.name === origin);
    setOriginCoord(cityEntry?.coord || '');
  }, [origin, cities]);

  // Cargar horarios y routeId según origen y destino
  useEffect(() => {
    if (!origin || !destination) {
      setSchedules([]);
      setSelectedSchedule('');
      setRouteId('');
      return;
    }
    const recorridosRef = ref(db, "Recorridos");
    onValue(recorridosRef, (snapshot) => {
      const data = snapshot.val();
      const allSchedules = [];
      for (const recorrido in data) {
        const citiesArray = data[recorrido].cities.filter(Boolean);
        let originIndex = -1;
        let destinationIndex = -1;
        citiesArray.forEach((ciudad, index) => {
          const cityID = ciudad.cityID;
          const cityName = cities[cityID]?.name;
          if (cityName === origin) originIndex = index;
          if (cityName === destination) destinationIndex = index;
        });
        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          allSchedules.push({ hour: citiesArray[originIndex].hour, route: recorrido });
        }
      }
      setSchedules(allSchedules);
      setSelectedSchedule('');
      setRouteId('');
    });
  }, [origin, destination, cities]);

  // Guardar datos seleccionados para background task
  useEffect(() => {
    if (!origin || !originCoord || !destination || !selectedSchedule) return;
    const scheduleObj = schedules.find(s => s.route === selectedSchedule);
    setRouteId(selectedSchedule);
    globalShareData = {
      origin,
      originCoord,
      destination,
      schedule: scheduleObj?.hour || '',
      routeId: selectedSchedule,
    };
  }, [origin, originCoord, destination, selectedSchedule, schedules]);

  const canShare = origin && destination && selectedSchedule;

  const startBackgroundTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'No se puede acceder a la ubicación');
      return;
    }
    let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert('Permiso denegado', 'No se puede acceder a la ubicación en segundo plano');
      return;
    }
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 10000, // cada 10 segundos
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Compartiendo ubicación',
        notificationBody: 'Tu ubicación se está compartiendo en segundo plano.',
      },
    });
    setTracking(true);
    Alert.alert('¡Listo!', 'Tu ubicación se está compartiendo.');
  };

  const stopBackgroundTracking = async () => {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    setTracking(false);
    Alert.alert('Ubicación', 'Dejaste de compartir tu ubicación.');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff9800" />
        <Text style={styles.label}>Cargando ciudades...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      <View style={styles.card}>
        <Text style={styles.heading}>Consulta de llegada</Text>

        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={origin}
            onValueChange={setOrigin}
            style={styles.picker}
            dropdownIconColor="#212121"
          >
            <Picker.Item label="Selecciona ciudad de origen" value="" />
            {Object.keys(cities).map((cityKey) => (
              <Picker.Item key={cityKey} label={cities[cityKey].name} value={cities[cityKey].name} />
            ))}
          </Picker>
        </View>

        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={destination}
            onValueChange={setDestination}
            style={styles.picker}
            enabled={!!origin}
            dropdownIconColor="#212121"
          >
            <Picker.Item label="Selecciona ciudad de destino" value="" />
            {availableDestinations.map((dest, idx) => (
              <Picker.Item key={idx} label={dest} value={dest} />
            ))}
          </Picker>
        </View>

        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={selectedSchedule}
            onValueChange={setSelectedSchedule}
            style={styles.picker}
            enabled={!!destination}
            dropdownIconColor="#212121"
          >
            <Picker.Item label={schedules.length ? "Selecciona horario" : "No hay horarios"} value="" />
            {schedules.map((schedule, idx) => (
              <Picker.Item key={idx} label={schedule.hour} value={schedule.route} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            canShare ? styles.buttonEnabled : styles.buttonDisabled,
          ]}
          onPress={tracking ? stopBackgroundTracking : startBackgroundTracking}
          disabled={!canShare}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {tracking ? "Dejar de compartir" : "Compartir ubicación"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#212121',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#F4F4F4',
    textAlign: 'center',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 0,
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 48,
    width: '100%',
    color: '#212121',
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEnabled: {
    backgroundColor: '#F35E3E',
  },
  buttonDisabled: {
    backgroundColor: '#bdbdbd',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  label: {
    fontSize: 16,
    color: '#F4F4F4',
    textAlign: 'center',
    marginBottom: 8,
  },
});