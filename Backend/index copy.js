const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getDatabase, ref, set, get } = require('firebase/database');
const { db } = require('./src/firebase/config');
const app = express();

app.use(cors());
app.use(express.json());

const getLocation = async (recorrido) => {
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

const getCity = async (cityName) => {
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

const getFilteredWaypoints = async (recorridoID, currentLatLng, destinoNombre) => {
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

  // ✅ Lógica agregada: el colectivo ya pasó por la ciudad objetivo
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

const getHolidays = async (year) => {
  const holidayApiKey = '98Q3lrZB4Ool61ntcraGD4JT2CJROdUv';
  const url = `https://calendarific.com/api/v2/holidays?api_key=${holidayApiKey}&country=AR&year=${year}`;

  try {
    const response = await axios.get(url);
    const holidays = response.data.response.holidays;
    return holidays.filter(h => h.type.includes("National holiday")).map(h => h.date.iso);
  } catch (error) {
    console.error('Error al obtener feriados:', error.message);
    return [];
  }
};

const distanceCalc = async (origin, destination) => {
  const apiKey = 'AIzaSyAfqRJA_z_ok5kPftimf-GL3yh7NUUJKdU'; // Reemplazar por la real y protegerla
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
  const response = await axios.get(url);
  return response.data.rows[0].elements[0].distance.value;
};

const getCityCoordByName = async (name) => {
  const citiesRef = ref(db, 'Cities');
  const snapshot = await get(citiesRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  for (const id in data) {
    if (data[id].name === name) return data[id].coord;
  }
  return null;
};

const getWaypoints = async (recorrido, cities, actualCoord) => {
  const recorridoRef = ref(db, `Recorridos/${recorrido}`);
  const snapshot = await get(recorridoRef);
  if (!snapshot.exists()) return [];
  const allCities = snapshot.val().cities.filter(Boolean);
  const coords = allCities
    .sort((a, b) => a.order - b.order)
    .map(c => cities[c.cityID]?.coord)
    .filter(Boolean);

  const remaining = [];
  for (let i = 0; i < coords.length; i++) {
    const dist = await distanceCalc(actualCoord, coords[i]);
    if (dist >= 800) remaining.push(coords[i]);
  }
  return remaining;
};


app.get('/distance', async (req, res) => {
  try {
    const { recorridoID, ciudadObjetivo } = req.query;

    const ubicacion = await getLocation(recorridoID);
    if (ubicacion.error) return res.status(400).json({ error: ubicacion.error });

    const destinoCoord = await getCity(ciudadObjetivo);
    if (!destinoCoord) return res.status(400).json({ error: 'Ciudad destino no encontrada.' });

    // Validar si ya pasó por la ciudad
    try {
      await getFilteredWaypoints(recorridoID, { latitude: ubicacion.lat, longitude: ubicacion.lng }, ciudadObjetivo);
    } catch (err) {
      if (err.message === 'El colectivo ya pasó por tu ciudad.') {
        return res.status(400).json({ error: err.message });
      } else {
        throw err;
      }
    }

    const distanciaMetros = await distanceCalc(
      `${ubicacion.lat},${ubicacion.lng}`,
      `${destinoCoord.latitude},${destinoCoord.longitude}`
    );

    const velocidadMediaKmH = 60;
    const tiempoHoras = distanciaMetros / 1000 / velocidadMediaKmH;
    const horas = Math.floor(tiempoHoras);
    const minutos = Math.round((tiempoHoras - horas) * 60);

    res.json({
      texto: `El colectivo llegará aproximadamente en <strong>${horas}h ${minutos}m</strong>.`,
      mapa: {
        origin: { latitude: ubicacion.lat, longitude: ubicacion.lng },
        destination: destinoCoord
      }
    });
  } catch (error) {
    console.error('Error en /distance:', error);
    res.status(500).json({ error: 'Error interno al calcular distancia.' });
  }
});


app.post('/location', async (req, res) => {
  try {
    const { origin, destination, schedule, currentLocation, preOriginCoord } = req.body;
    const date = new Date().toISOString();
    const citiesRef = ref(db, 'Cities');
    const snapshot = await get(citiesRef);
    const cities = snapshot.exists() ? snapshot.val() : {};

    const originCoord = await getCityCoordByName(origin);
    if (!originCoord) return res.status(400).json({ error: 'Ciudad origen no encontrada' });

    const dist = await distanceCalc(`${currentLocation.latitude},${currentLocation.longitude}`, originCoord);
    if (dist > 15000) {
      return res.status(400).json({ error: 'Demasiado lejos del recorrido. No se puede compartir ubicación.' });
    }

    const preWaypoints = await getWaypoints(schedule, cities, preOriginCoord);
    const waypoints = await getWaypoints(schedule, cities, `${currentLocation.latitude},${currentLocation.longitude}`);

    const uniqueId = `${schedule}`.replace(/\s+/g, '');
    const locRef = ref(db, `location/${uniqueId}`);

    await set(locRef, {
      origin,
      destination,
      location: currentLocation,
      date,
      schedule,
      waypoints
    });

    res.json({ success: true, mensaje: 'Ubicación guardada correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al guardar ubicación' });
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
