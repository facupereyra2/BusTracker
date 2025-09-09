import { Picker } from '@react-native-picker/picker';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../constants/firebaseConfig';
import { COLORS } from '../styles/theme';

const TimeScreen = () => {
  const [cities, setCities] = useState([]);
  const [selectedOrig, setSelectedOrig] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [selectSchedule, setSelectSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Cargar ciudades
  useEffect(() => {
    const citiesRef = ref(db, 'Cities');
    get(citiesRef)
      .then(snapshot => {
        const data = snapshot.val();
        if (data) {
          const citiesArray = Object.keys(data).map(key => ({
            id: key,
            name: data[key].name
          }));
          setCities(citiesArray);
        }
      })
      .catch(error => console.error('Error al obtener las ciudades:', error));
  }, []);

  // Obtener destinos según origen
  useEffect(() => {
    if (!selectedOrig) {
      setAvailableDestinations([]);
      setSelectedDest('');
      setSelectSchedule([]);
      return;
    }
    const recorridosRef = ref(db, 'Recorridos');
    get(recorridosRef).then(snapshot => {
      const data = snapshot.val();
      const availableDestinationsList = [];
      for (const key in data) {
        const recorrido = data[key];
        const citiesOrder = recorrido.cities.filter(city => city && city.cityID);

        const originIndex = citiesOrder.findIndex(city => city.cityID === selectedOrig);
        if (originIndex !== -1) {
          const possibleDestinations = citiesOrder
            .slice(originIndex + 1)
            .map(city => city.cityID);
          availableDestinationsList.push(...possibleDestinations);
        }
      }
      setAvailableDestinations([...new Set(availableDestinationsList)]);
    });
  }, [selectedOrig]);

  // Obtener horarios
  useEffect(() => {
    if (!selectedOrig || !selectedDest) {
      setSelectSchedule([]);
      return;
    }
    const recorridosRef = ref(db, 'Recorridos');
    get(recorridosRef).then(snapshot => {
      const data = snapshot.val();
      const schedulesArray = [];
      for (const key in data) {
        const recorrido = data[key];
        const citiesOrder = recorrido.cities.filter(city => city && city.cityID);
        const originIndex = citiesOrder.findIndex(city => city.cityID === selectedOrig);
        const destinationIndex = citiesOrder.findIndex(city => city.cityID === selectedDest);
        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          schedulesArray.push({
            id: `${key}_${citiesOrder[originIndex].hour}`,
            originTime: citiesOrder[originIndex].hour,
            destinationTime: citiesOrder[destinationIndex].hour,
            recorridoID: key
          });
        }
      }
      setSelectSchedule(schedulesArray);
    });
  }, [selectedOrig, selectedDest]);

  // Buscar nombre por ID
  const getCityNameById = (id) => {
    const city = cities.find(city => city.id === id);
    return city ? city.name : '';
  };

  // Recibe IDs y hora de origen
  const getFullRoute = async (originID, destinationID, originTime) => {
    const recorridosRef = ref(db, "Recorridos");
    const snapshot = await get(recorridosRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const recorridoKey in data) {
        const recorrido = data[recorridoKey];
        const citiesOrder = recorrido.cities.filter(city => city !== null && city.cityID);

        const originIndex = citiesOrder.findIndex(city => city.cityID === originID && city.hour === originTime);
        const destinationIndex = citiesOrder.findIndex(city => city.cityID === destinationID);

        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          return {
            key: recorridoKey,
            origin: originID,
            destination: destinationID,
            citiesOrder
          };
        }
      }
    }
    return null;
  };

  // Consultar ubicación
  const fetchLocation = async () => {

    if (cities.length === 0) {
      setResultado({ error: true, msg: "Las ciudades aún no se cargaron. Esperá unos segundos." });
      setModalVisible(true);
      return;
    }
    if (!selectedOrig || !selectedDest || !selectedSchedule) {
      setResultado({ error: true, msg: "Por favor seleccioná origen, destino y horario." });
      setModalVisible(true);
      return;
    }

    setLoading(true);
    try {
      const [recorridoID, originTime] = selectedSchedule.split("_");
      const fullRoute = await getFullRoute(selectedOrig, selectedDest, originTime);
      if (!fullRoute) {
        setResultado({ error: true, msg: "No se encontró un recorrido válido para los datos ingresados." });
        setModalVisible(true);
        return;
      }

      const queryParams = new URLSearchParams({
        recorridoID: fullRoute.key,
        origin: getCityNameById(selectedOrig),
        destination: getCityNameById(selectedDest),
        ciudadObjetivo: getCityNameById(selectedOrig),
      });

      const url = `https://bustracker-kfkx.onrender.com/distance?${queryParams.toString()}`;
      console.log("Consultando backend:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Respuesta no OK:", errorText);
        setResultado({ error: true, msg: `Error del servidor: ${errorText}` });
        setModalVisible(true);
        return;
      }

      let data;
      try {
        data = await response.json(); // Espera JSON del backend
      } catch (parseErr) {
        const text = await response.text();
        console.error("Error de parseo JSON:", text);
        setResultado({ error: true, msg: `Error de formato del backend:\n${text}` });
        setModalVisible(true);
        return;
      }

      setResultado(data);
      setModalVisible(true);
    } catch (err) {
      console.error("Error en fetchLocation:", err);
      setResultado({ error: true, msg: `Hubo un error al consultar la ubicación.\n${err.message}` });
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Condición para habilitar el botón
  const canQuery = selectedOrig && selectedDest && selectedSchedule;

  function isValidCoord(coord) {
    return (
      coord &&
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      !isNaN(coord.latitude) &&
      !isNaN(coord.longitude)
    );
  }

  function ModalContent({ resultado }) {
    if (!resultado) return null;
    if (resultado.error || resultado.msg) {
      return (
        <Text style={[styles.modalText, { color: '#b71c1c' }]}>
          {resultado.msg || resultado.texto || "Ocurrió un error"}
        </Text>
      );
    }

    return (
      <View style={{ height: '10%' }}>
        <View style={{ height: '20%' }}>
          <View style={{ alignItems: 'flex-start', width: '100%' }}>
            <Text style={styles.modalTitle}>Consulta de llegada</Text>
            <Text style={styles.modalStrong}>
              {resultado.ciudadObjetivo ? `🚌 Tiempo estimado hasta ${resultado.ciudadObjetivo}: ` : "🚌 Tiempo estimado: "}
              <Text style={styles.modalNormal}>{resultado.tiempo}</Text>
            </Text>
            <Text style={styles.modalStrong}>🕓 Hora estimada de llegada: <Text style={styles.modalNormal}>{resultado.hora}</Text></Text>
            <Text style={styles.modalStrong}>🌦️ Clima: <Text style={styles.modalNormal}>{resultado.clima}</Text></Text>
            <Text style={styles.modalStrong}>📅 Día: <Text style={styles.modalNormal}>{resultado.dia}</Text></Text>
            <Text style={styles.modalStrong}>⏱️ Ajustes aplicados: <Text style={styles.modalNormal}>{resultado.ajustes}</Text></Text>
            <Text style={styles.modalStrong}>🚏 Paradas intermedias: <Text style={styles.modalNormal}>{resultado.paradas}</Text></Text>
            <Text style={styles.modalStrong}>📍 Última ubicación recibida: <Text style={styles.modalNormal}>{resultado.ubicacion}</Text></Text>      </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <Text style={styles.title}>Consulta de llegada</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Consultá el horario de llegada</Text>
        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={selectedOrig}
            onValueChange={setSelectedOrig}
            style={styles.picker}
            dropdownIconColor={COLORS.card}
          >
            <Picker.Item label="Selecciona ciudad de origen" value="" />
            {cities.map(city => (
              <Picker.Item key={city.id} label={city.name} value={city.id} />
            ))}
          </Picker>
        </View>
        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={selectedDest}
            onValueChange={setSelectedDest}
            style={styles.picker}
            enabled={!!selectedOrig}
            dropdownIconColor={COLORS.card}
          >
            <Picker.Item label="Selecciona ciudad de destino" value="" />
            {availableDestinations.map(destID => {
              const city = cities.find(c => c.id === destID);
              return city ? <Picker.Item key={city.id} label={city.name} value={city.id} /> : null;
            })}
          </Picker>
        </View>
        <View style={styles.inputWrapper}>
          <Picker
            selectedValue={selectedSchedule}
            onValueChange={setSelectedSchedule}
            style={styles.picker}
            enabled={!!selectedDest}
            dropdownIconColor={COLORS.card}
          >
            <Picker.Item label={selectSchedule.length ? "Selecciona horario" : "No hay horarios"} value="" />
            {selectSchedule.map(schedule => (
              <Picker.Item
                key={schedule.id}
                label={`Salida: ${schedule.originTime} - Llegada: ${schedule.destinationTime}`}
                value={schedule.id}
              />
            ))}
          </Picker>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            !canQuery || loading ? styles.buttonDisabled : styles.buttonEnabled
          ]}
          onPress={fetchLocation}
          disabled={!canQuery || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.buttonText}>Consultar ubicación</Text>
          }
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
            <ScrollView>
              <ModalContent resultado={resultado} />
            </ScrollView>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    marginBottom: 24,
    marginTop: 12
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 14,
    textAlign: 'center'
  },
  inputWrapper: {
    backgroundColor: COLORS.text,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
  },
  picker: {
    height: 50,
    width: '100%',
    color: COLORS.inputBg,
    backgroundColor: COLORS.text,
  },
  button: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4
  },
  buttonEnabled: {
    backgroundColor: COLORS.orange,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalBg: {
    flex: 1,
    backgroundColor: COLORS.modalBg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    backgroundColor: COLORS.text,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    width: '87%',
    maxWidth: 370,
    minHeight: 120,
    shadowColor: "#000",
    shadowOpacity: 0.20,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 28,
    marginVertical: 32,
    zIndex: 100,
  },
  modalText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
    textAlign: 'center'
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 12,
    color: '#222'
  },
  modalStrong: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#222'
  },
  modalNormal: {
    fontWeight: 'normal',
    color: '#333'
  },
  closeBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 32,
    marginTop: 18
  },
  closeBtnText: {
    color: COLORS.white,
    fontSize: 16
  }
});

export default TimeScreen;