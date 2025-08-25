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
    waypoints: data.waypoints || [], // Las paradas ya están filtradas por el frontend
    date: data.date || new Date().toISOString(),
    schedule: data.schedule || recorrido,
    stops: data.stops || [],
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


