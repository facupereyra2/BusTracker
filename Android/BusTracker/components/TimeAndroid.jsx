import { get, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { db } from '../constants/firebaseConfig';

const Time = () => {
  const [cities, setCities] = useState([]);
  const [selectedOrig, setSelectedOrig] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [selectSchedule, setSelectSchedule] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const getCityIdByName = (name) => {
    const city = cities.find(
      city => city.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    return city ? city.id : null;
  };

  const getFullRoute = async (originName, destinationName, originTime) => {
    const recorridosRef = ref(db, "Recorridos");
    const snapshot = await get(recorridosRef);
  
    if (snapshot.exists()) {
      const data = snapshot.val();
      const originID = getCityIdByName(originName);
      const destinationID = getCityIdByName(destinationName);

      console.log("originName:", originName, "destinationName:", destinationName);
  
      console.log("originID:", originID, "destinationID:", destinationID);
  
      for (const recorridoKey in data) {
        const recorrido = data[recorridoKey];
        const citiesOrder = recorrido.cities.filter(city => city !== null && city.cityID);
  
        const originIndex = citiesOrder.findIndex(
          city => city.cityID === originID && city.hour === originTime
        );
        const destinationIndex = citiesOrder.findIndex(
          city => city.cityID === destinationID
        );
  
        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          return {
            key: recorridoKey,
            origin: originName,
            destination: destinationName,
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
      Alert.alert("Error", "Las ciudades aún no se cargaron. Esperá unos segundos.");
      return;
    }
    try {
      if (!selectedOrig || !selectedDest || !selectedSchedule) {
        Alert.alert("Error", "Por favor seleccioná origen, destino y horario.");
        return;
      }
  
      const fullRoute = await getFullRoute(selectedOrig, selectedDest, selectedSchedule);
      console.log("fullRoute:", fullRoute);
  
      if (!fullRoute) {
        Alert.alert("Error", "No se encontró un recorrido válido para los datos ingresados.");
        return;
      }
  
      const queryParams = new URLSearchParams({
        recorridoID: fullRoute.key,
        ciudadObjetivo: selectedOrig,
      });
  
      setLoading(true);
      const response = await fetch(`https://bustracker-kfkx.onrender.com/distance?${queryParams.toString()}`);
      console.log("response:", response);
  
      const text = await response.text();
      console.log("Respuesta cruda del backend:", text);
  
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert("Error backend", text);
        return;
      }
  
      if (!response.ok) {
        if (data.error === "El colectivo ya pasó por tu ciudad.") {
          Alert.alert("Info", data.error);
          return;
        } else {
          throw new Error(data.error || "Error inesperado");
        }
      }
  
      Alert.alert("Resultado", data.texto);
      console.log("Mapa recibido:", data.mapa);
    } catch (err) {
      console.error("Error backend:", err);
      Alert.alert("Error", `Hubo un error al consultar la ubicación.\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consulta de llegada</Text>

      {/* Select Origen */}
      <RNPickerSelect
        onValueChange={(value) => setSelectedOrig(value)}
        value={selectedOrig}
        placeholder={{ label: 'Selecciona el origen', value: '' }}
        items={cities.map(city => ({ label: city.name, value: city.id }))}
        style={pickerSelectStyles}
      />

      {/* Select Destino */}
      <RNPickerSelect
        onValueChange={(value) => setSelectedDest(value)}
        value={selectedDest}
        placeholder={{ label: 'Selecciona el destino', value: '' }}
        items={availableDestinations.map(destID => {
          const city = cities.find(c => c.id === destID);
          return city ? { label: city.name, value: city.id } : null;
        }).filter(Boolean)}
        style={pickerSelectStyles}
      />

      {/* Select Horario */}
      <RNPickerSelect
        onValueChange={(value) => setSelectedSchedule(value)}
        value={selectedSchedule}
        placeholder={{ label: selectSchedule.length ? 'Selecciona el horario' : 'No hay horarios', value: '' }}
        items={selectSchedule.map(schedule => ({
          label: `Salida: ${schedule.originTime} - Llegada: ${schedule.destinationTime}`,
          value: schedule.id
        }))}
        style={pickerSelectStyles}
      />

      <TouchableOpacity
        style={[styles.button, (!selectedOrig || !selectedDest || !selectedSchedule || loading) && styles.disabledButton]}
        onPress={fetchLocation}
        disabled={!selectedOrig || !selectedDest || !selectedSchedule || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Consultar ubicación</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: 'orange', padding: 15, borderRadius: 8, marginTop: 20 },
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', textAlign: 'center', fontSize: 16 }
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: 'black',
    marginBottom: 12
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: 'black',
    marginBottom: 12
  }
});

export default Time;
