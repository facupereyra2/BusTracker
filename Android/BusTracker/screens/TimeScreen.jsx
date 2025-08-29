import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { db } from '../constants/firebaseConfig';

const TimeScreen = () => {
  const [cities, setCities] = useState([]);
  const [selectedOrig, setSelectedOrig] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [selectSchedule, setSelectSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultado, setResultado] = useState('');

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
      setResultado("Las ciudades aún no se cargaron. Esperá unos segundos.");
      setModalVisible(true);
      return;
    }
    try {
      if (!selectedOrig || !selectedDest || !selectedSchedule) {
        setResultado("Por favor seleccioná origen, destino y horario.");
        setModalVisible(true);
        return;
      }
      const [recorridoID, originTime] = selectedSchedule.split("_");
      const fullRoute = await getFullRoute(selectedOrig, selectedDest, originTime);
      if (!fullRoute) {
        setResultado("No se encontró un recorrido válido para los datos ingresados.");
        setModalVisible(true);
        return;
      }

      const queryParams = new URLSearchParams({
        recorridoID: fullRoute.key,
        ciudadObjetivo: getCityNameById(selectedOrig), // O el ID si ya lo corregiste en backend
      });

      setLoading(true);
      const response = await fetch(`https://bustracker-kfkx.onrender.com/distance?${queryParams.toString()}`);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setResultado(text);
        setModalVisible(true);
        return;
      }

      setResultado(data.texto);
      console.log(resultado)
      setModalVisible(true);
    } catch (err) {
      setResultado(`Hubo un error al consultar la ubicación.\n${err.message}`);
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <Text style={styles.title}>Consulta de llegada</Text>

      <View style={styles.card}>
      <View style={[styles.inputWrapper, { borderRadius: 16 }]}>
  <RNPickerSelect
    onValueChange={setSelectedOrig}
    value={selectedOrig}
    placeholder={{ label: 'Selecciona el origen', value: '' }}
    items={cities.map(city => ({ label: city.name, value: city.id }))}
    style={{
      ...pickerSelectStyles,
      inputIOS: { ...pickerSelectStyles.inputIOS, borderRadius: 16 },
      inputAndroid: { ...pickerSelectStyles.inputAndroid, borderRadius: 16 }
    }}
  />
</View>

        <RNPickerSelect
          onValueChange={setSelectedDest}
          value={selectedDest}
          placeholder={{ label: 'Selecciona el destino', value: '' }}
          items={availableDestinations.map(destID => {
            const city = cities.find(c => c.id === destID);
            return city ? { label: city.name, value: city.id } : null;
          }).filter(Boolean)}
          style={pickerSelectStyles}
        />

        <RNPickerSelect
          onValueChange={setSelectedSchedule}
          value={selectedSchedule}
          placeholder={{ label: selectSchedule.length ? 'Selecciona el horario' : 'No hay horarios', value: '' }}
          items={selectSchedule.map(schedule => ({
            label: `Salida: ${schedule.originTime} - Llegada: ${schedule.destinationTime}`,
            value: schedule.id
          }))}
          style={pickerSelectStyles}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!selectedOrig || !selectedDest || !selectedSchedule || loading) && styles.disabledButton
          ]}
          onPress={fetchLocation}
          disabled={!selectedOrig || !selectedDest || !selectedSchedule || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
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
            <Text style={styles.modalText}>{resultado}</Text>
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
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EEEE',
    marginBottom: 24,
    marginTop: 12
  },
  label: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 2,
    color: '#222',
    borderRadius: 16
  },
  button: {
    backgroundColor: '#ee7b18',
    padding: 16,
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#ee7b18',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4
  },
  disabledButton: {
    backgroundColor: '#cccccc'
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
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
    marginBottom: 24
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

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ee7b18',
    borderRadius: 16,
    color: 'black',
    marginBottom: 12,
    backgroundColor: '#fafafa'
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ee7b18',
    borderRadius: 16,
    color: 'black',
    marginBottom: 12,
    backgroundColor: '#fafafa'
  }
});

export default TimeScreen;