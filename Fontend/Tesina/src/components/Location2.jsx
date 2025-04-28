import React, { useEffect, useState } from 'react'
import firebase from 'firebase/compat/app';
import app from '../firebaseConfig';
import { getDatabase, ref, set, push, onValue, update, get } from 'firebase/database';
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    Box,
    Heading
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Modal from './Modal';

const Location = () => {
    const [cities, setCities] = useState([]);
    const [selectedCityOrig, setSelectedCityOrig] = useState(''); // State para la ciudad seleccionada de origen
    const [selectedCityOrigCoord, setSelectedCityOrigCoord] = useState(''); // State para la ciudad seleccionada de origen
    const [selectedCityDest, setSelectedCityDest] = useState(''); // State para la ciudad seleccionada de destino
    const [location, setLocation] = useState({
        latitude: 0,
        longitude: 0
    });
    const [schedules, setSchedules] = useState([]); // State para los horarios de la ciudad seleccionada
    const [selectSchedule, setSelectSchedule] = useState(null); // State para el recorrido seleccionado
    const [isTracking, setIsTracking] = useState(false); // State para controlar el seguimiento
    const [isModalOpen, setIsModalOpen] = useState(false); //State para controlar el estado de la ventana modal

    const closeModal = () => {
        setIsModalOpen(false);
        setIsTracking(false)
    };
    useEffect(() => {
        if (selectedCityOrig && selectedCityDest) {
          getCitiesOrder(selectedCityOrig, selectedCityDest);
        }
      }, [selectedCityOrig, selectedCityDest]);

    useEffect(() => {
        const db = getDatabase(app);
        const citiesRef = ref(db, "Cities");

        const getCities = () => { //Trae de la DB todas las cities ni bien carga la pagina
            onValue(citiesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setCities(data);
                } else {
                    console.log("No se encontraron datos");
                }
            });
        };
        getCities();
    }, []);

    useEffect(() => { //Continua guardando la ubicacion del user en la db mientras isTracking sea verdadero, es decir, que el modal este abierto
        let intervalId;
        if (isTracking) {
            intervalId = setInterval(() => {
                getLocation();
            }, 30000); // 60000 ms = 1 minuto
        }
        return () => clearInterval(intervalId);
    }, [isTracking]);



    const getLocation = () => { //Obtiene la ubicacion mediante el navegador
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("Posicion actual:")
                    if (position.coords.latitude !== location.latitude && position.coords.longitude !== location.longitude) {
                        console.log('Location changed')
                        setLocation({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                        console.log(location)
                    }
                },
                (error) => {
                    setError(error.message);
                }
            );
        } else {
            setError('Geolocalización no es compatible en este navegador.');
        }

        saveLocation(selectedCityOrig, selectedCityOrigCoord, selectedCityDest, selectSchedule, location);
    };

    const getCitiesOrder = (origin, destination) => { //Devuelve los horarios disponibles para el origen y destino seleccionados
        const db = getDatabase(app);
        const allSchedules = [];
        const tableRef = ref(db, "Recorridos");
        onValue(tableRef, (snapshot) => {
            const data = snapshot.val();
            console.log('aa',data);
            for (const i in data) {
                if (data[i][origin] && data[i][destination]) {
                    if (data[i][origin].orden < data[i][destination].orden) {
                        allSchedules.push({
                            hour: data[i][origin].hora,
                            route: i
                        });
                    }
                }
            }
            setSchedules(allSchedules);
            console.log('allschedules',allSchedules)
        });
    };

    const getSchedules = async (recorrido) => { //Obtiene de la db el recorrido completo que le pasemos
        const db = getDatabase(app)
        try {
            const locRef = ref(db, Recorridos/${recorrido});
            const snapshot = await get(locRef);

            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                console.log("No se encontraron datos");
                return null;
            }
        } catch (error) {
            console.error('Error al obtener la ubicación:', error);
            throw error;
        }
    };

    const waypointsCalc = async (origin, paradas) => { //Calcula si ya paso por los puntos intermedios
        for (const i in paradas) {
            console.log("paradas", paradas[i])
            const distance = await distanceCalc(origin, paradas[i]);
            console.log(i,distance)
            if (distance < 800) { //Si la distancia actual es menor a 800 metros de alguno de los puntos intermedios restantes, lo elimina del array
                paradas.splice(0, parseInt(i) + 1)
            }
            
        }
        return paradas
    }

    const distanceCalc = async (origin, destination) => { //Calcula la distancia entre un punto y otro mediante la API, se uitliza en la funcion wayPointsCalc
        console.log("distance calc origin", origin);
        console.log("distance calc dest", destination)
        const apiKey = 'AIzaSyAfqRJA_z_ok5kPftimf-GL3yh7NUUJKdU';
        const url = /api/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey};
        console.log(url)
        const response = await fetch(url);
        const data = await response.json();
        //console.log(data.rows[0].elements[0].distance.value)
        return data.rows[0].elements[0].distance.value;
    };




    const saveLocation = async (origin, preOriginCoord, destination, schedule, location) => { //Guarda la ubicacion actual del user (colectivo) en la db
        const db = getDatabase(app);
        const date = new Date().toISOString();
        const newDocRef = ref(db, location/${schedule});
        const allWaypoints = await getSchedules(schedule);
        const entries = Object.entries(allWaypoints);
        const sortedEntries = entries.sort((a, b) => a[1].orden - b[1].orden);
        const allWaypointsSorted = sortedEntries.map(entry => entry[1].coord);
        const prePendWaypoints = await waypointsCalc(preOriginCoord, allWaypointsSorted)
        const originCoord = ${location.latitude},${location.longitude}
        const pendWaypoints = await waypointsCalc(originCoord, prePendWaypoints)
        console.log('pending waypoints ', pendWaypoints)
        setIsModalOpen(true);
        set(newDocRef, {
            origin: origin,
            destination: destination,
            location: location,
            date: date,
            schedule: schedule,
            waypoints: pendWaypoints,
        })
            .then(() => {
                console.log('Ubicación guardada exitosamente');
            })
            .catch((error) => {
                console.error('Error al guardar la ubicación:', error);
            });
    };

    const containerStyles = {
        bg: "brand.bg",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: "center",
        textAlign: 'center',
        padding: '16px',
        gap: '16px',
        h: '100vh',
        color: 'brand.letters'
    };

    const menuButtonStyles = {
        w: '80vw',
        margin: '1px',
        backgroundColor: 'white',
        color: 'black',
        border: '1px solid',
        _hover: { bg: 'gray.200' }
    };

    const menuItemStyles = {
        color: "black"
    };


    return (
        <>

            <Box sx={containerStyles}>
                <Heading mb={6} fontSize='2xl' textAlign='center'>Selecciona tu ruta</Heading>
                <Box sx={{ width: '100%' }}>
                    <Menu width='500px'>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={menuButtonStyles}>
                            {selectedCityOrig || 'Selecciona su ciudad de origen'}
                        </MenuButton>
                        <MenuList>
                            {Object.keys(cities).map((city) => (
                                <MenuItem sx={menuItemStyles}
                                    key={city}
                                    onClick={() => {
                                        setSelectedCityOrig(cities[city].name)
                                        setSelectedCityOrigCoord(cities[city].coord)
                                    }}
                                >
                                    {cities[city].name}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>
                <Box sx={{ width: '100%' }}>
                    <Menu width='500px'>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={menuButtonStyles}>
                            {selectedCityDest || 'Selecciona su ciudad de destino'}
                        </MenuButton>
                        <MenuList>
                            {Object.keys(cities).map((city) => (
                                <MenuItem
                                    sx={menuItemStyles}
                                    key={city}
                                    onClick={() => {
                                        setSelectedCityDest(cities[city].name);
                                        getCitiesOrder(selectedCityOrig, selectedCityDest)

                                    }}
                                >
                                    {cities[city].name}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>

                <Box sx={{ width: '100%' }}>
                    <Menu>
                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} sx={menuButtonStyles}>
                            {selectSchedule ? schedules.find(s => s.route === selectSchedule)?.hour : 'Seleccione el horario de salida'}
                        </MenuButton>
                        <MenuList>
                            {schedules.map((schedule, index) => (
                                <MenuItem
                                    sx={menuItemStyles}
                                    key={index}
                                    onClick={() => setSelectSchedule(schedule.route)}
                                >
                                    {schedule.hour}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>

                <Button onClick={() => { getLocation(); setIsTracking(true); }} colorScheme="orange" width='80vw'>
                    Compartir ubicación
                </Button>
                <Modal title='Ubicacion compartida' text='Su ubicación actual esta siendo compartida de forma exitosa' button='Dejar de compartir' isOpen={isModalOpen} onClose={closeModal} />
            </Box>
        </>
    );
}

export default Location;