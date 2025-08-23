// Location.jsx
import React, { useEffect, useState } from 'react';
import app from '../firebaseConfig';
import { getDatabase, ref, onValue } from 'firebase/database';
import {
    Menu, MenuButton, MenuList, MenuItem,
    Button, Box, Heading
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import Modal from './Modal';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { BackgroundLocationServiceInterface } from './backgroundLocationPlugin';



const Location = () => {
    const [cities, setCities] = useState([]);
    const [selectedCityOrig, setSelectedCityOrig] = useState('');
    const [selectedCityOrigCoord, setSelectedCityOrigCoord] = useState('');
    const [selectedCityDest, setSelectedCityDest] = useState('');
    const [availableDestinations, setAvailableDestinations] = useState([]);
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

    async function requestAllLocationPermissions() {
        try {
            const status = await Geolocation.requestPermissions();
            return status.location === 'granted';
        } catch (error) {
            console.error('Error pidiendo permisos:', error);
            return false;
        }
    }
    console.log('Plugin nativo BackgroundLocationServiceInterface:', BackgroundLocationServiceInterface);



    const startTracking = async () => {
        try {
            const hasPermissions = await requestAllLocationPermissions();

            if (!hasPermissions) {
                setModalText("Por favor habilitá los permisos de ubicación, incluyendo ubicación en segundo plano.");
                setButtonText("Aceptar");
                setIsModalOpen(true);
                return;
            }

            await BackgroundLocationServiceInterface.startService({
                origin: selectedCityOrig,
                destination: selectedCityDest,
                schedule: selectSchedule,
                preOriginCoord: selectedCityOrigCoord
            });

            setIsTracking(true);
            setModalText("Su ubicación actual está siendo compartida de forma exitosa.");
            setButtonText("Dejar de compartir");
            setIsModalOpen(true);
        } catch (error) {
            console.error("Error al iniciar el tracking:", error);
            setModalText("Hubo un error al iniciar el seguimiento. " + (error?.message || ""));
            setButtonText("Aceptar");
            setIsModalOpen(true);
            setIsTracking(false);
        }
    };


    const stopTracking = async () => {
        try {
            await BackgroundLocationServiceInterface.stopService();

            setIsTracking(false);
            setModalText("Has dejado de compartir tu ubicación.");
            setButtonText("Aceptar");
            setIsModalOpen(true);
        } catch (error) {
            console.error("Error al detener el tracking:", error);
        }
    };

    // Lógica para obtener las ciudades, destinos y horarios
    useEffect(() => {
        const db = getDatabase(app);
        const citiesRef = ref(db, "Cities");
        onValue(citiesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setCities(data);
        });
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
                <Heading mb={6} fontSize='2xl' textAlign='center'>Selecciona tu ruta (v1)</Heading>
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
                <Button onClick={() => {
                    if (!selectedCityOrig || !selectedCityDest || !selectSchedule) {
                        setModalText("Por favor seleccioná origen, destino y horario antes de compartir.");
                        setButtonText("Aceptar");
                        setIsModalOpen(true);
                        return;
                    }
                    if (isTracking) {
                        stopTracking();
                    } else {
                        startTracking();
                    }
                }}
                    colorScheme={isTracking ? "red" : "orange"}
                    width="80vw"
                >
                    {isTracking ? "Dejar de compartir ubicación" : "Compartir ubicación"}
                </Button>
                <Modal
                    title={modalText}
                    button={buttonText}
                    isOpen={isModalOpen}
                    onClose={buttonText === "Dejar de compartir" ? stopTracking : closeModal}
                />
            </Box>
        </>
    );
};

export default Location;