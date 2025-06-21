// Location.jsx
import React, { useEffect, useState } from 'react';
import app from '../firebaseConfig';
import { getDatabase, ref, onValue, get } from 'firebase/database';
import {
    Menu, MenuButton, MenuList, MenuItem,
    Button, Box, Heading
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Modal from './Modal';

const Location = () => {
    const [cities, setCities] = useState([]);
    const [selectedCityOrig, setSelectedCityOrig] = useState('');
    const [selectedCityOrigCoord, setSelectedCityOrigCoord] = useState('');
    const [selectedCityDest, setSelectedCityDest] = useState('');
    const [availableDestinations, setAvailableDestinations] = useState([]);
    const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
    const [schedules, setSchedules] = useState([]);
    const [selectSchedule, setSelectSchedule] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalText, setModalText] = useState('');
    const [buttonText, setButtonText] = useState('');

    const closeModal = () => {
        setIsModalOpen(false);
        setIsTracking(false);
    };

    useEffect(() => {
        const db = getDatabase(app);
        const citiesRef = ref(db, "Cities");

        const getCities = () => {
            onValue(citiesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) setCities(data);
            });
        };
        getCities();
    }, []);

    useEffect(() => {
        if (selectedCityOrig) {
            getAvailableDestinations(selectedCityOrig);
        }
    }, [selectedCityOrig]);

    useEffect(() => {
        if (selectedCityOrig && selectedCityDest) {
            getCitiesOrder(selectedCityOrig, selectedCityDest);
        }
    }, [selectedCityOrig, selectedCityDest]);

    useEffect(() => {
        let intervalId;
        if (isTracking) {
            intervalId = setInterval(() => {
                getLocation();
            }, 30000);
        }
        return () => clearInterval(intervalId);
    }, [isTracking]);

    const getAvailableDestinations = (originName) => {
        const db = getDatabase(app);
        const tableRef = ref(db, "Recorridos");
        const destinationsSet = new Set();

        onValue(tableRef, (snapshot) => {
            const data = snapshot.val();
            for (const recorrido in data) {
                const citiesArray = data[recorrido].cities.filter(Boolean);
                let originIndex = -1;

                citiesArray.forEach((ciudad, index) => {
                    const cityName = cities[ciudad.cityID]?.name;
                    if (cityName === originName) originIndex = index;
                });

                if (originIndex !== -1) {
                    for (let i = originIndex + 1; i < citiesArray.length; i++) {
                        const cityName = cities[citiesArray[i].cityID]?.name;
                        if (cityName) destinationsSet.add(cityName);
                    }
                }
            }

            setAvailableDestinations(Array.from(destinationsSet));
        });
    };

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
                (error) => console.error(error.message)
            );
        } else {
            console.error('Geolocalización no es compatible.');
        }
    };

    const getCitiesOrder = (originName, destinationName) => {
        const db = getDatabase(app);
        const allSchedules = [];
        const tableRef = ref(db, "Recorridos");

        onValue(tableRef, (snapshot) => {
            const data = snapshot.val();
            for (const recorrido in data) {
                const citiesArray = data[recorrido].cities.filter(Boolean);
                let originIndex = -1;
                let destinationIndex = -1;

                citiesArray.forEach((ciudad, index) => {
                    const cityID = ciudad.cityID;
                    const cityName = cities[cityID]?.name;
                    if (cityName === originName) originIndex = index;
                    if (cityName === destinationName) destinationIndex = index;
                });

                if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
                    allSchedules.push({ hour: citiesArray[originIndex].hour, route: recorrido });
                }
            }
            setSchedules(allSchedules);
        });
    };

    const saveLocation = async (origin, preOriginCoord, destination, schedule, location) => {
        try {
            const response = await fetch("https://bustracker-kfkx.onrender.com/location", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin,
                    destination,
                    schedule,
                    currentLocation: location,
                    preOriginCoord
                })
            });

            const result = await response.json();

            if (response.ok) {
                setModalText("Su ubicación actual está siendo compartida de forma exitosa.");
                setButtonText("Dejar de compartir");
                setIsModalOpen(true);
            } else {
                setModalText(result.error || "Hubo un error al guardar la ubicación.");
                setButtonText("Aceptar");
                setIsModalOpen(true);
                setIsTracking(false);
            }
        } catch (error) {
            console.error("Error al contactar backend:", error);
            setModalText("Error de conexión con el servidor.");
            setButtonText("Aceptar");
            setIsModalOpen(true);
            setIsTracking(false);
        }
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
                            {availableDestinations.map((dest, index) => (
                                <MenuItem
                                    sx={menuItemStyles}
                                    key={index}
                                    onClick={() => {
                                        setSelectedCityDest(dest);
                                        getCitiesOrder(selectedCityOrig, dest);
                                    }}
                                >
                                    {dest}
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
};

export default Location;
