import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { onValue, ref, set } from 'firebase/database';
import { Text } from 'native-base';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { db } from '../constants/firebaseConfig';

const LOCATION_TASK_NAME = 'background-location-task';

let globalShareData = {};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  if (data && globalShareData.routeId) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      await set(ref(db, `location/${globalShareData.routeId}`), {
        origin: globalShareData.origin,
        originCoord: globalShareData.originCoord,
        destination: globalShareData.destination,
        schedule: globalShareData.schedule,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        date: Date.now(),
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

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
      setModalMsg('No se puede acceder a la ubicación');
      setModalVisible(true);
      return;
    }
    let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      setModalMsg('No se puede acceder a la ubicación en segundo plano');
      setModalVisible(true);
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
    setModalMsg('¡Listo! Tu ubicación se está compartiendo.');
    setModalVisible(true);
  };

  const stopBackgroundTracking = async () => {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    setTracking(false);
    setModalMsg('Dejaste de compartir tu ubicación.');
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.bg}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#F35E3E" />
          <Text style={styles.label}>Cargando ciudades...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <Text style={styles.title}>Compartir ubicación</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Enviá tu ubicación al sistema</Text>

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
            canShare && !tracking ? styles.buttonEnabled : styles.buttonDisabled,
            tracking && styles.buttonTracking
          ]}
          onPress={tracking ? stopBackgroundTracking : startBackgroundTracking}
          disabled={!canShare && !tracking}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {tracking ? "Dejar de compartir" : "Compartir ubicación"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>{modalMsg}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#212121',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F4F4F4',
    marginBottom: 24,
    marginTop: 12
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F4F4F4',
    marginBottom: 14,
    textAlign: 'center'
  },
  inputWrapper: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ee7b18',
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#212121',
    backgroundColor: '#fafafa',
  },
  label: {
    fontSize: 17,
    color: '#F4F4F4',
    textAlign: 'center',
    marginBottom: 8,
  },
  labelPicker: {
    fontSize: 15,
    color: '#ee7b18',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  button: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ee7b18',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4
  },
  buttonEnabled: {
    backgroundColor: '#ee7b18',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonTracking: {
    backgroundColor: '#6dbf43',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12
  },
  modalText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  closeBtn: {
    backgroundColor: '#ee7b18',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 32
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16
  }
});