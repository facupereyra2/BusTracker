// services/colectivo.service.js
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config.js';

export const getLocation = async (recorrido) => {
  const locRef = ref(db, `location/${recorrido}`);
  const snapshot = await get(locRef);
  if (!snapshot.exists()) return { error: 'No se encontró información de ubicación.' };
  const data = snapshot.val();
  if (!data.location) return { error: 'No hay datos de ubicación disponibles.' };

  const lastUpdate = new Date(data.date || new Date().toISOString());
  const now = new Date();
  const diffHoras = (now - lastUpdate) / (1000 * 60 * 60);

  if (diffHoras > 2) return { error: 'La ubicación es muy antigua (más de 2 horas).' };

  return {
    lat: data.location.latitude,
    lng: data.location.longitude,
    waypoints: data.waypoints || [],
    date: data.date || new Date().toISOString(),
    schedule: data.schedule || recorrido,
  };
};

export const getCity = async (cityName) => {
  const citiesRef = ref(db, 'Cities');
  const snapshot = await get(citiesRef);
  if (!snapshot.exists()) return null;

  const cities = snapshot.val();
  for (const cityId in cities) {
    if (cities[cityId].name.toLowerCase() === cityName.toLowerCase()) {
      const [latitude, longitude] = cities[cityId].coord.split(',').map(parseFloat);
      return { latitude, longitude };
    }
  }
  return null;
};

export const getFilteredWaypoints = async (recorridoID, currentLatLng, destinoNombre) => {
  const recorridoRef = ref(db, `Recorridos/${recorridoID}`);
  const snapshot = await get(recorridoRef);
  if (!snapshot.exists()) return [];

  const recorrido = snapshot.val();
  const cityOrder = recorrido.cities?.filter(Boolean) || [];

  const citiesSnapshot = await get(ref(db, 'Cities'));
  const citiesData = citiesSnapshot.val();

  const ciudadDestinoID = Object.keys(citiesData).find(
    id => citiesData[id].name.toLowerCase() === destinoNombre.toLowerCase()
  );

  const orderedCities = cityOrder.map(c => ({
    id: c.cityID,
    coord: citiesData[c.cityID]?.coord,
    order: c.order
  }));

  // Determinar ciudad más cercana al colectivo
  let currentIdx = -1;
  let minDistance = Infinity;
  orderedCities.forEach((c, idx) => {
    if (!c.coord) return;
    const [lat, lng] = c.coord.split(',').map(Number);
    const distance = Math.sqrt((lat - currentLatLng.latitude) ** 2 + (lng - currentLatLng.longitude) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      currentIdx = idx;
    }
  });

  const destinoIdx = orderedCities.findIndex(c => c.id === ciudadDestinoID);
  if (currentIdx !== -1 && destinoIdx !== -1 && destinoIdx <= currentIdx) {
    throw new Error('El colectivo ya pasó por tu ciudad.');
  }

  const intermediateCoords = orderedCities
    .slice(currentIdx + 1, destinoIdx)
    .map(c => {
      const [lat, lng] = c.coord.split(',').map(Number);
      return { location: { latLng: { latitude: lat, longitude: lng } } };
    });

  return intermediateCoords;
};
