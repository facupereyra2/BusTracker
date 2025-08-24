// services/colectivo.service.js
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config.js';
import { distanceCalc } from '../utils/distance.js';

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

  const orderedCities = cityOrder.map(c => ({
    id: c.cityID,
    coord: citiesData[c.cityID]?.coord,
    order: c.order
  }));

  // Función para calcular la distancia usando Haversine
  const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const toRad = angle => (angle * Math.PI) / 180;
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en metros
  };

  // 1. Detectar en qué tramo está el colectivo
  let currentIdx = -1;
  for (let i = 0; i < orderedCities.length - 1; i++) {
    const [lat1, lng1] = orderedCities[i].coord.split(',').map(Number);
    const [lat2, lng2] = orderedCities[i + 1].coord.split(',').map(Number);
    const dist1 = haversineDistance(lat1, lng1, currentLatLng.latitude, currentLatLng.longitude);
    const dist2 = haversineDistance(lat2, lng2, currentLatLng.latitude, currentLatLng.longitude);
    const distTotal = haversineDistance(lat1, lng1, lat2, lng2);

    if (Math.abs((dist1 + dist2) - distTotal) < 100) { // Menor a 100 metros
      currentIdx = i;
      break;
    }
  }

  // Fallback si no se detectó el tramo exacto
  if (currentIdx === -1) {
    let minDistance = Infinity;
    orderedCities.forEach((c, idx) => {
      if (!c.coord) return;
      const [lat, lng] = c.coord.split(',').map(Number);
      const distance = haversineDistance(lat, lng, currentLatLng.latitude, currentLatLng.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        currentIdx = idx;
      }
    });
  }

  // Retornar los waypoints filtrados
  const remainingStops = orderedCities.slice(currentIdx);
  console.log('Paradas restantes:', remainingStops);
  return remainingStops;
};
