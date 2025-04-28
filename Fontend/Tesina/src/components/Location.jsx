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
    const [modalText, setModalText] = useState(''); // Mensaje dinámico
    const [buttonText, setButtonText] = useState('')


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



    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    if (newLocation.latitude !== location.latitude || newLocation.longitude !== location.longitude) {
                        setLocation(newLocation);
                        saveLocation(selectedCityOrig, selectedCityOrigCoord, selectedCityDest, selectSchedule, newLocation);
                    }
                },
                (error) => {
                    console.error(error.message);
                }
            );
        } else {
            console.error('Geolocalización no es compatible en este navegador.');
        }
    };



    const getCitiesOrder = (originName, destinationName) => {
        const db = getDatabase(app);
        const allSchedules = [];
        const tableRef = ref(db, "Recorridos");

        onValue(tableRef, (snapshot) => {
            const data = snapshot.val();
            for (const recorrido in data) {
                const citiesArray = data[recorrido].cities.filter(Boolean); // Quitamos el null del principio

                let originIndex = -1;
                let destinationIndex = -1;

                citiesArray.forEach((ciudad, index) => {
                    const cityID = ciudad.cityID;
                    const cityName = cities[cityID]?.name;
                    if (cityName === originName) originIndex = index;
                    if (cityName === destinationName) destinationIndex = index;
                });

                if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
                    allSchedules.push({
                        hour: citiesArray[originIndex].hour,
                        route: recorrido
                    });
                }
            }

            setSchedules(allSchedules);
        });
    };


    const getSchedules = async (recorrido) => { //Obtiene de la db el recorrido completo que le pasemos
        const db = getDatabase(app)
        try {
            const locRef = ref(db, `Recorridos/${recorrido}`);
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
            console.log(i, distance)
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
        const url = `/api/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
        console.log(url)
        const response = await fetch(url);
        const data = await response.json();
        //console.log(data.rows[0].elements[0].distance.value)
        return data.rows[0].elements[0].distance.value;
    };

    const getCityCoordsByName = async (cityName) => {
        const db = getDatabase(app);
        const citiesRef = ref(db, 'Cities');
    
        try {
            const snapshot = await get(citiesRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
    
                for (const cityID in data) {
                    if (data[cityID].name === cityName) {
                        return data[cityID].coord;
                    }
                }
    
                console.warn('Ciudad no encontrada:', cityName);
                return null;
            } else {
                console.warn('No se encontraron ciudades en la base de datos.');
                return null;
            }
        } catch (error) {
            console.error('Error al obtener coordenadas:', error);
            return null;
        }
    };



    const saveLocation = async (origin, preOriginCoord, destination, schedule, location) => {
        const db = getDatabase(app);
        const date = new Date().toISOString();

        const allWaypoints = await getSchedules(schedule);
        const citiesArray = allWaypoints.cities.filter(Boolean); // saca el null inicial
        const sortedWaypoints = citiesArray.sort((a, b) => a.order - b.order);

        const allWaypointsSorted = sortedWaypoints.map(entry => {
            const cityData = cities[entry.cityID];
            return cityData?.coord || null;
        }).filter(Boolean); // elimina coordenadas nulas

        // Validar que esté cerca de alguna ciudad
        let isNearAnyCity = false;
        const destinationCoord = await getCityCoordsByName(origin)

        const distance = parseInt(await distanceCalc(`${location.latitude},${location.longitude}`,destinationCoord));
        console.log("first", distance)
        if (distance < 15000) {
            isNearAnyCity = true;
        }



        if (!isNearAnyCity) {
            console.warn("Ubicación inválida: demasiado lejos de la ruta.");
            setModalText("No se puede compartir ubicación porque estás demasiado lejos del recorrido.");
            setButtonText("Aceptar")
            setIsModalOpen(true);
            setIsTracking(false);
            return;
        }

        // Calcular waypoints pendientes
        const prePendWaypoints = await waypointsCalc(preOriginCoord, allWaypointsSorted);
        const pendWaypoints = await waypointsCalc(`${location.latitude},${location.longitude}`, prePendWaypoints);

        console.log('Waypoints pendientes:', pendWaypoints);

        // Crear ID único para todo el recorrido (sin espacios)
        const uniqueId = `${schedule}`.replace(/\s+/g, '');
        const newDocRef = ref(db, `location/${uniqueId}`);

        // Guardar en Firebase
        set(newDocRef, {
            origin,
            destination,
            location,
            date,
            schedule,
            waypoints: pendWaypoints,
        })
            .then(() => {
                console.log('Ubicación guardada exitosamente');
                setModalText("Su ubicación actual está siendo compartida de forma exitosa.");
                setButtonText("Dejar de compartir")
                setIsModalOpen(true);
            })
            .catch((error) => {
                console.error('Error al guardar la ubicación:', error);
                setModalText("Hubo un error al guardar la ubicación. Intente nuevamente.");
                setButtonText("Aceptar")
                setIsModalOpen(true);
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
                <Modal title={modalText} button={buttonText} isOpen={isModalOpen} onClose={closeModal} />
            </Box>
        </>
    );
}

export default Location;