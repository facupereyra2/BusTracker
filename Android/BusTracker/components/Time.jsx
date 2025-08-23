import { get, onValue, ref } from 'firebase/database';
import { Box, Button, CheckIcon, Modal, Select, Spinner, Text, VStack } from 'native-base';
import { useEffect, useState } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { db } from '../constants/firebaseConfig';

const Time = () => {
  const [cities, setCities] = useState([]);
  const [selectedOrig, setSelectedOrig] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectSchedule, setSelectSchedule] = useState([]);
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [mapaData, setMapaData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cargar ciudades desde Firebase
  useEffect(() => {
  const citiesRef = ref(db, "Cities");
  onValue(
    citiesRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const citiesArray = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name,
          coord: data[key].coord,
        }));
        setCities(citiesArray);
      } else {
        console.log('No data found in Cities');
      }
    },
    (error) => {
      console.log('Firebase error:', error);
    }
  );
}, []);

  // Obtener destinos disponibles según origen
  useEffect(() => {
    if (!selectedOrig || cities.length === 0) {
      setAvailableDestinations([]);
      setSelectedDest('');
      setSelectSchedule([]);
      setSelectedSchedule('');
      return;
    }
    const recorridosRef = ref(db, "Recorridos");
    get(recorridosRef).then(snapshot => {
      const data = snapshot.val();
      const availableDestinationsList = [];
      const originID = cities.find(city => city.name === selectedOrig)?.id;
      for (const recorridoKey in data) {
        const recorrido = data[recorridoKey];
        const citiesOrder = recorrido.cities.filter(city => city && city.cityID);
        const originIndex = citiesOrder.findIndex(city => city.cityID === originID);
        if (originIndex !== -1) {
          const possibleDestinations = citiesOrder.slice(originIndex + 1).map(city => {
            return cities.find(c => c.id === city.cityID)?.name;
          });
          availableDestinationsList.push(...possibleDestinations);
        }
      }
      setAvailableDestinations([...new Set(availableDestinationsList)]);
      setSelectedDest('');
      setSelectSchedule([]);
      setSelectedSchedule('');
    });
  }, [selectedOrig, cities]);

  // Obtener horarios según origen y destino
  useEffect(() => {
    if (!selectedOrig || !selectedDest || cities.length === 0) {
      setSelectSchedule([]);
      setSelectedSchedule('');
      return;
    }
    const recorridosRef = ref(db, "Recorridos");
    get(recorridosRef).then(snapshot => {
      const data = snapshot.val();
      let schedulesArray = [];
      const originID = cities.find(city => city.name === selectedOrig)?.id;
      const destinationID = cities.find(city => city.name === selectedDest)?.id;
      for (const recorridoKey in data) {
        const recorrido = data[recorridoKey];
        const citiesOrder = recorrido.cities.filter(city => city && city.cityID);
        const originIndex = citiesOrder.findIndex(city => city.cityID === originID);
        const destinationIndex = citiesOrder.findIndex(city => city.cityID === destinationID);
        if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
          schedulesArray.push({
            originTime: citiesOrder[originIndex].hour,
            destinationTime: citiesOrder[destinationIndex].hour,
            routeKey: recorridoKey,
          });
        }
      }
      setSelectSchedule(schedulesArray);
      setSelectedSchedule('');
    });
  }, [selectedOrig, selectedDest, cities]);

  // Buscar el recorrido y llamar al backend
  const fetchLocation = async () => {
    if (!selectedOrig || !selectedDest || !selectedSchedule) {
      setResultText("Por favor seleccioná origen, destino y horario.");
      setMapaData(null);
      setModalOpen(true);
      return;
    }
    setLoading(true);
    setResultText('');
    setMapaData(null);

    // Buscar el recorridoKey correcto
    const scheduleObj = selectSchedule.find(s => s.originTime === selectedSchedule);
    if (!scheduleObj) {
      setResultText("No se encontró el recorrido.");
      setLoading(false);
      setModalOpen(true);
      return;
    }

    const queryParams = new URLSearchParams({
      recorridoID: scheduleObj.routeKey,
      ciudadObjetivo: selectedOrig
    });

    try {
      const response = await fetch(`https://bustracker-kfkx.onrender.com/distance?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        setResultText(errorData.error || 'Error inesperado');
        setMapaData(null);
        setLoading(false);
        setModalOpen(true);
        return;
      }
      const data = await response.json();
      setResultText(data.texto);
      setMapaData(data.mapa);
      setLoading(false);
      setModalOpen(true);
    } catch (err) {
      setResultText(`Hubo un error al consultar la ubicación.\n${err.message}`);
      setMapaData(null);
      setLoading(false);
      setModalOpen(true);
    }
  };

console.log('CITIES:', cities);
console.log('DESTINOS:', availableDestinations);
console.log('HORARIOS:', selectSchedule);

  return (
    <Box bg="#212121" p={4} borderRadius={12} w="100%" maxW={400} alignItems="center">
      <VStack space={4} w="100%">
        <Select
          selectedValue={selectedOrig}
          minWidth="100%"
          accessibilityLabel="Selecciona ciudad de origen"
          placeholder="Selecciona ciudad de origen"
          onValueChange={setSelectedOrig}
          _selectedItem={{
            bg: "#F35E3E",
            endIcon: <CheckIcon size="5" />,
          }}
          bg="#fff"
          borderRadius={8}
        >
          {cities.map((city) => (
            <Select.Item key={city.id} label={city.name} value={city.name} />
          ))}
        </Select>

        <Select
          selectedValue={selectedDest}
          minWidth="100%"
          accessibilityLabel="Selecciona ciudad de destino"
          placeholder="Selecciona ciudad de destino"
          onValueChange={setSelectedDest}
          isDisabled={!selectedOrig}
          _selectedItem={{
            bg: "#F35E3E",
            endIcon: <CheckIcon size="5" />,
          }}
          bg="#fff"
          borderRadius={8}
        >
          {availableDestinations.map((city, idx) => (
            <Select.Item key={idx} label={city} value={city} />
          ))}
        </Select>

        <Select
          selectedValue={selectedSchedule}
          minWidth="100%"
          accessibilityLabel="Selecciona horario"
          placeholder={selectSchedule.length ? "Selecciona tu horario" : "No hay horarios"}
          onValueChange={setSelectedSchedule}
          isDisabled={!selectedDest}
          _selectedItem={{
            bg: "#F35E3E",
            endIcon: <CheckIcon size="5" />,
          }}
          bg="#fff"
          borderRadius={8}
        >
          {selectSchedule.map((schedule, idx) => (
            <Select.Item
              key={idx}
              label={`Salida: ${schedule.originTime} - Llegada: ${schedule.destinationTime}`}
              value={schedule.originTime}
            />
          ))}
        </Select>

        <Button
          mt={2}
          bg="#F35E3E"
          borderRadius={8}
          isDisabled={!(selectedOrig && selectedDest && selectedSchedule)}
          onPress={fetchLocation}
        >
          Consultar ubicación del colectivo
        </Button>

        {loading && <Spinner color="#F35E3E" mt={2} />}

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <Modal.Content maxWidth="400px" bg="#fff">
            <Modal.CloseButton />
            <Modal.Header _text={{ color: "#212121" }}>Resultado del cálculo</Modal.Header>
            <Modal.Body>
              <Text color="#212121">{resultText}</Text>
              {mapaData && (
                <Box mt={4} w="100%" h={300} borderRadius={12} overflow="hidden">
                  <MapView
                    style={{ width: '100%', height: 300 }}
                    initialRegion={{
                      latitude: mapaData.bus.latitude,
                      longitude: mapaData.bus.longitude,
                      latitudeDelta: 0.2,
                      longitudeDelta: 0.2,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: mapaData.bus.latitude,
                        longitude: mapaData.bus.longitude,
                      }}
                      title="Colectivo"
                      description="Ubicación actual del colectivo"
                    />
                    {/* Línea desde colectivo hasta objetivo */}
                    <Polyline
                      coordinates={[
                        { latitude: mapaData.bus.latitude, longitude: mapaData.bus.longitude },
                        mapaData.objetivo,
                      ]}
                      strokeColor="#F35E3E"
                      strokeWidth={4}
                    />
                    {/* Marcador de objetivo */}
                    <Marker
                      coordinate={mapaData.objetivo}
                      title="Tu parada"
                      pinColor="#F35E3E"
                    />
                  </MapView>
                </Box>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button onPress={() => setModalOpen(false)} bg="#F35E3E" borderRadius={8}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      </VStack>
    </Box>
  );
};

export default Time;