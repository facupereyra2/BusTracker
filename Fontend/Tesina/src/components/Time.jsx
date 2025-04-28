import React, { useEffect, useState } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import app from '../firebaseConfig';
import {
  Menu, MenuButton, MenuList, MenuItem, Button,
  Box, Heading
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Modal from '../components/Modal';
import MapView from './MapView';

const Time = () => {
  const [cities, setCities] = useState([]);
  const [selectedOrig, setSelectedOrig] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectSchedule, setSelectSchedule] = useState([]);
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [mapaData, setMapaData] = useState(null);
  const [availableDestinations, setAvailableDestinations] = useState([]);

  useEffect(() => {
    const db = getDatabase(app);
    const citiesRef = ref(db, "Cities");
    get(citiesRef).then(snapshot => {
      const data = snapshot.val();
      if (data) {
        const citiesArray = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name
        }));
        setCities(citiesArray);
      }
    });
  }, []);

  const getCityIdByName = (name) => {
    const city = cities.find(city => city.name === name);
    return city ? city.id : null;
  };

  const getFullRoute = async (originName, destinationName, originTime) => {
    const db = getDatabase(app);
    const recorridosRef = ref(db, "Recorridos");
    const snapshot = await get(recorridosRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const originID = getCityIdByName(originName);
      const destinationID = getCityIdByName(destinationName);

      for (const recorridoKey in data) {
        const recorrido = data[recorridoKey];
        const citiesOrder = recorrido.cities.filter(city => city !== null && city.cityID);

        const originIndex = citiesOrder.findIndex(city => city.cityID === originID && city.hour === originTime);
        const destinationIndex = citiesOrder.findIndex(city => city.cityID === destinationID);

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

  useEffect(() => {
    if (selectedOrig && cities.length > 0) {
      const db = getDatabase(app);
      const recorridosRef = ref(db, "Recorridos");

      get(recorridosRef).then(snapshot => {
        const data = snapshot.val();
        const availableDestinationsList = [];
        for (const recorridoKey in data) {
          const recorrido = data[recorridoKey];
          const citiesOrder = recorrido.cities.filter(city => city !== null && city.cityID);
          const originID = getCityIdByName(selectedOrig);

          const originIndex = citiesOrder.findIndex(city => city.cityID === originID);
          if (originIndex !== -1) {
            const possibleDestinations = citiesOrder.slice(originIndex + 1).map(city => {
              return cities.find(c => c.id === city.cityID)?.name;
            });
            availableDestinationsList.push(...possibleDestinations);
          }
        }
        setAvailableDestinations([...new Set(availableDestinationsList)]);
      });
    }
  }, [selectedOrig, cities]);

  useEffect(() => {
    if (selectedOrig && selectedDest && cities.length > 0) {
      const db = getDatabase(app);
      const recorridosRef = ref(db, "Recorridos");

      get(recorridosRef).then(snapshot => {
        const data = snapshot.val();
        let schedulesArray = [];

        const originID = getCityIdByName(selectedOrig);
        const destinationID = getCityIdByName(selectedDest);

        for (const recorridoKey in data) {
          const recorrido = data[recorridoKey];
          const citiesOrder = recorrido.cities.filter(city => city !== null && city.cityID);

          const originIndex = citiesOrder.findIndex(city => city.cityID === originID);
          const destinationIndex = citiesOrder.findIndex(city => city.cityID === destinationID);

          if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
            schedulesArray.push({
              originTime: citiesOrder[originIndex].hour,
              destinationTime: citiesOrder[destinationIndex].hour
            });
          }
        }
        setSelectSchedule(schedulesArray);
      });
    }
  }, [selectedOrig, selectedDest, cities]);

  const fetchLocation = async () => {
    if (!selectedOrig || !selectedDest || !selectedSchedule) {
      alert("Por favor seleccioná origen, destino y horario.");
      return;
    }

    const fullRoute = await getFullRoute(selectedOrig, selectedDest, selectedSchedule);
    if (!fullRoute) return;

    const queryParams = new URLSearchParams({
      recorridoID: fullRoute.key,
      ciudadObjetivo: selectedOrig
    });

    try {
      const response = await fetch(`http://localhost:3000/distance?${queryParams.toString()}`);
      const data = await response.json();
      setText(data.texto);
      setMapaData(data.mapa);
      setIsOpen(true);
    } catch (err) {
      console.error("Error backend:", err);
    }
  };

  return (
    <Box sx={{ bg: "brand.bg", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: "center", textAlign: 'center', padding: '16px', gap: '16px', h: '100vh', color: 'brand.letters' }}>
      <Heading mb={6} fontSize='2xl'>Consulta de llegada</Heading>

      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={{ w: '80vw', backgroundColor: 'white', color: 'black', border: '1px solid' }}>
          {selectedOrig || 'Selecciona ciudad de origen'}
        </MenuButton>
        <MenuList>
          {cities.map((city) => (
            <MenuItem key={city.id} sx={{ color: "black" }} onClick={() => setSelectedOrig(city.name)}>
              {city.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={{ w: '80vw', backgroundColor: 'white', color: 'black', border: '1px solid' }}>
          {selectedDest || 'Selecciona ciudad de destino'}
        </MenuButton>
        <MenuList>
          {availableDestinations.map((city) => (
            <MenuItem key={city} sx={{ color: "black" }} onClick={() => setSelectedDest(city)}>
              {city}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={{ w: '80vw', backgroundColor: 'white', color: 'black', border: '1px solid' }}>
          {selectedSchedule || (selectSchedule.length > 0 ? 'Selecciona tu horario' : 'No hay horarios')}
        </MenuButton>
        <MenuList>
          {selectSchedule.map((schedule, index) => (
            <MenuItem key={index} sx={{ color: "black" }} onClick={() => setSelectedSchedule(schedule.originTime)}>
              {`Salida: ${schedule.originTime} - Llegada: ${schedule.destinationTime}`}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      <Button colorScheme="orange" width="80vw" onClick={fetchLocation}>
        Consultar ubicación del colectivo
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title='Resultado del cálculo'
        text={<>
          <span dangerouslySetInnerHTML={{ __html: text }} /><br />
          {mapaData && <MapView {...mapaData} />}
          
          <br />
        </>}
        button='Cerrar'
      />
    </Box>
  );
};

export default Time;
