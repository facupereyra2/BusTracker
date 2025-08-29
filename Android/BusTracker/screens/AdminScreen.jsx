import { MaterialIcons } from "@expo/vector-icons";
import { Box, Button, FormControl, Heading, HStack, IconButton, Input, ScrollView, Select, Text, useToast, VStack } from "native-base";
import { useState } from "react";

const AdminRecorridoScreen = () => {
  const [newCity, setNewCity] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [citiesData, setCitiesData] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [routeCities, setRouteCities] = useState([]);
  const toast = useToast();

  const addNewCity = () => {
    const name = newCity.trim();
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);

    if (!name || isNaN(lat) || isNaN(lng)) {
      toast.show({
        title: "Datos incompletos",
        description: "Completá el nombre, latitud y longitud correctamente",
        status: "warning",
      });
      return;
    }

    if (availableCities.includes(name)) {
      toast.show({
        title: "Ciudad existente",
        description: "Esta ciudad ya fue agregada",
        status: "error",
      });
      return;
    }

    setAvailableCities([...availableCities, name]);
    setCitiesData([...citiesData, { name, latitude: lat, longitude: lng }]);
    setNewCity("");
    setNewLat("");
    setNewLng("");
    toast.show({
      title: "Ciudad agregada",
      description: `"${name}" fue agregada con coordenadas`,
      status: "success",
    });
  };

  const addCityToRoute = () => {
    if (selectedCity && !routeCities.includes(selectedCity)) {
      setRouteCities([...routeCities, selectedCity]);
    }
    setSelectedCity("");
  };

  const moveCity = (index, direction) => {
    const newRoute = [...routeCities];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newRoute.length) return;
    [newRoute[index], newRoute[targetIndex]] = [newRoute[targetIndex], newRoute[index]];
    setRouteCities(newRoute);
  };

  const removeCity = (index) => {
    const newRoute = [...routeCities];
    newRoute.splice(index, 1);
    setRouteCities(newRoute);
  };

  const handleCreateRoute = () => {
    if (routeCities.length < 2) {
      toast.show({
        title: "Recorrido inválido",
        description: "Agregá al menos dos ciudades al recorrido",
        status: "warning",
      });
      return;
    }
    const recorridoNombre = `${routeCities[0]} - ${routeCities.at(-1)}`;
    toast.show({
      title: "Recorrido creado",
      description: `Se creó el recorrido: ${recorridoNombre}`,
      status: "success",
    });
    setRouteCities([]);
  };

  return (
    <ScrollView bg="white" flex={1} p={4}>
      <Box alignItems="center" mb={4}>
        <Heading color="black" fontSize="xl" mb={3}>Administración de Recorridos y Ciudades</Heading>
      </Box>
      <VStack space={6}>
        {/* Agregar nueva ciudad */}
        <Box bg="gray.100" p={4} rounded="lg">
          <FormControl mb={2}>
            <FormControl.Label>Nombre de la ciudad</FormControl.Label>
            <Input value={newCity} onChangeText={setNewCity} placeholder="Nombre de la ciudad" bg="white" />
          </FormControl>
          <HStack space={2}>
            <FormControl flex={1}>
              <FormControl.Label>Latitud</FormControl.Label>
              <Input value={newLat} onChangeText={setNewLat} placeholder="Latitud" bg="white" />
            </FormControl>
            <FormControl flex={1}>
              <FormControl.Label>Longitud</FormControl.Label>
              <Input value={newLng} onChangeText={setNewLng} placeholder="Longitud" bg="white" />
            </FormControl>
          </HStack>
          <Button mt={3} colorScheme="orange" onPress={addNewCity}>Añadir Ciudad</Button>
        </Box>

        {/* Agregar ciudad al recorrido */}
        <Box bg="gray.100" p={4} rounded="lg">
          <FormControl mb={2}>
            <FormControl.Label>Agregar ciudad al recorrido</FormControl.Label>
            <Select
              selectedValue={selectedCity}
              minWidth="200"
              accessibilityLabel="Seleccioná ciudad"
              placeholder="Seleccioná ciudad"
              onValueChange={setSelectedCity}
              bg="white"
            >
              {availableCities.filter(city => !routeCities.includes(city)).map(city => (
                <Select.Item key={city} label={city} value={city} />
              ))}
            </Select>
            <Button mt={3} colorScheme="orange" onPress={addCityToRoute} isDisabled={!selectedCity}>Agregar</Button>
          </FormControl>
        </Box>

        {/* Lista de ciudades en el recorrido */}
        <Box bg="gray.200" p={4} rounded="lg">
          <Heading size="sm" color="black" mb={2}>Ciudades en el recorrido</Heading>
          {routeCities.length === 0 ? (
            <Text color="gray.500" fontStyle="italic">No hay ciudades en el recorrido</Text>
          ) : (
            <VStack space={2}>
              {routeCities.map((city, index) => (
                <HStack key={city} alignItems="center" bg="gray.300" p={2} rounded="md">
                  <Text fontWeight="bold" w={7} textAlign="center">{index + 1}</Text>
                  <Text flex={1} ml={2}>{city}</Text>
                  <IconButton
                    icon={<MaterialIcons name="keyboard-arrow-up" size={24} color={index === 0 ? "#ccc" : "#333"} />}
                    onPress={() => moveCity(index, -1)}
                    isDisabled={index === 0}
                  />
                  <IconButton
                    icon={<MaterialIcons name="keyboard-arrow-down" size={24} color={index === routeCities.length - 1 ? "#ccc" : "#333"} />}
                    onPress={() => moveCity(index, 1)}
                    isDisabled={index === routeCities.length - 1}
                  />
                  <IconButton
                    icon={<MaterialIcons name="delete" size={24} color="red" />}
                    onPress={() => removeCity(index)}
                  />
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

        {/* Botón para crear recorrido */}
        <Button colorScheme="blue" size="lg" onPress={handleCreateRoute}>
          Crear recorrido
        </Button>
      </VStack>
    </ScrollView>
  );
};

export default AdminRecorridoScreen;