import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Flex,
  Select,
  VStack,
  Text,
  Heading,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { ArrowUpIcon, ArrowDownIcon, DeleteIcon } from '@chakra-ui/icons';

const AdminRecorrido = () => {
  const [newCity, setNewCity] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [citiesData, setCitiesData] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [routeCities, setRouteCities] = useState([]);
  const toast = useToast();

  const addNewCity = () => {
    const name = newCity.trim();
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);

    if (!name || isNaN(lat) || isNaN(lng)) {
      toast({
        title: 'Datos incompletos',
        description: 'Completá el nombre, latitud y longitud correctamente',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (availableCities.includes(name)) {
      toast({
        title: 'Ciudad existente',
        description: 'Esta ciudad ya fue agregada',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setAvailableCities([...availableCities, name]);
    setCitiesData([...citiesData, { name, latitude: lat, longitude: lng }]);
    setNewCity('');
    setNewLat('');
    setNewLng('');

    toast({
      title: 'Ciudad agregada',
      description: `"${name}" fue agregada con coordenadas`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const addCityToRoute = () => {
    if (selectedCity && !routeCities.includes(selectedCity)) {
      setRouteCities([...routeCities, selectedCity]);
    }
    setSelectedCity('');
  };

  const moveCity = (index, direction) => {
    const newRoute = [...routeCities];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newRoute.length) return;

    [newRoute[index], newRoute[targetIndex]] = [
      newRoute[targetIndex],
      newRoute[index],
    ];
    setRouteCities(newRoute);
  };

  const removeCity = (index) => {
    const newRoute = [...routeCities];
    newRoute.splice(index, 1);
    setRouteCities(newRoute);
  };

  return (
    <Box
      bg="brand.bg"
      p={6}
      minH="100vh"
      maxW="600px"
      mx="auto"
      boxShadow="md"
      color="white"
    >
      <Heading mb={6} textAlign="center">
        Administración de Recorridos y Ciudades
      </Heading>

      {/* Agregar nueva ciudad */}
      <Box mb={6}>
        <FormControl>
          <FormLabel>Agregar nueva ciudad</FormLabel>
          <Flex direction="column" gap={2}>
            <Input
              placeholder="Nombre de la ciudad"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              bg="white"
              color="black"
            />
            <Flex gap={2}>
              <Input
                placeholder="Latitud"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                bg="white"
                color="black"
              />
              <Input
                placeholder="Longitud"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                bg="white"
                color="black"
              />
            </Flex>
            <Button colorScheme="orange" onClick={addNewCity}>
              Añadir
            </Button>
          </Flex>
        </FormControl>
      </Box>

      {/* Agregar ciudad al recorrido */}
      <Box mb={6}>
        <FormControl>
          <FormLabel>Agregar ciudad al recorrido</FormLabel>
          <Flex gap={2}>
            <Select
              placeholder="Seleccioná ciudad"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              bg="white"
              color="black"
              flex="1"
            >
              {availableCities
                .filter((city) => !routeCities.includes(city))
                .map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
            </Select>
            <Button
              colorScheme="orange"
              onClick={addCityToRoute}
              disabled={!selectedCity}
            >
              Agregar
            </Button>
          </Flex>
        </FormControl>
      </Box>

      {/* Lista de ciudades en el recorrido */}
      <VStack
        spacing={3}
        bg="gray.700"
        p={4}
        borderRadius="md"
        maxH="400px"
        overflowY="auto"
      >
        {routeCities.length === 0 && (
          <Text color="gray.300" fontStyle="italic">
            No hay ciudades en el recorrido
          </Text>
        )}

        {routeCities.map((city, index) => (
          <Flex
            key={city}
            align="center"
            justify="space-between"
            w="100%"
            bg="gray.600"
            p={3}
            borderRadius="md"
          >
            <Text fontWeight="bold" w="20px">
              {index + 1}
            </Text>
            <Text flex="1" ml={4}>
              {city}
            </Text>

            <Flex gap={1}>
              <IconButton
                icon={<ArrowUpIcon />}
                aria-label="Subir ciudad"
                size="sm"
                onClick={() => moveCity(index, -1)}
                isDisabled={index === 0}
              />
              <IconButton
                icon={<ArrowDownIcon />}
                aria-label="Bajar ciudad"
                size="sm"
                onClick={() => moveCity(index, 1)}
                isDisabled={index === routeCities.length - 1}
              />
              <IconButton
                icon={<DeleteIcon />}
                aria-label="Eliminar ciudad"
                size="sm"
                onClick={() => removeCity(index)}
                colorScheme="red"
              />
            </Flex>
          </Flex>
        ))}
      </VStack>

      {/* Botón para crear recorrido */}
      <Button
  mt={6}
  colorScheme="blue"
  width="100%"
  onClick={() => {
    if (routeCities.length < 2) {
      toast({
        title: "Recorrido inválido",
        description: "Agregá al menos dos ciudades al recorrido",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const recorridoNombre = `${routeCities[0]} - ${routeCities.at(-1)}`;
    
    toast({
      title: "Recorrido creado",
      description: `Se creó el recorrido: ${recorridoNombre}`,
      status: "success",
      duration: 4000,
      isClosable: true,
    });

    // Limpiar lista de ciudades seleccionadas
    setRouteCities([]);
  }}
>
  Crear recorrido
</Button>

    </Box>
  );
};

export default AdminRecorrido;
