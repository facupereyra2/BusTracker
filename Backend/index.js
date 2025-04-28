// ✅ BACKEND COMPLETO - index.js MODIFICADO CON VALIDACIÓN DE UBICACIÓN

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getDatabase, ref, get } = require('firebase/database');
const { db } = require('./firebase/config');
const { Client } = require('@googlemaps/google-maps-services-js');
const routesClient = new Client({});

const app = express();
app.use(cors());

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

  const orderedCities = cityOrder.map(c => ({
    id: c.cityID,
    coord: citiesData[c.cityID]?.coord,
    order: c.order
  }));

  const currentIdx = orderedCities.findIndex(c => {
    const [lat, lng] = c.coord.split(',').map(Number);
    const distance = Math.sqrt((lat - currentLatLng.latitude) ** 2 + (lng - currentLatLng.longitude) ** 2);
    return distance < 0.1;
  });

  const destinoIdx = orderedCities.findIndex(c => c.id === ciudadDestinoID);
  if (currentIdx === -1 || destinoIdx === -1 || destinoIdx <= currentIdx) return [];

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

app.get('/distance', async (req, res) => {
  const { recorridoID, ciudadObjetivo } = req.query;
  const location = await getLocation(recorridoID);

  if (!location || location.error) {
    return res.json({
      error: true,
      texto: location?.error || "No hay información de ubicación."
    });
  }

  const destino = await getCity(ciudadObjetivo);
  if (!destino) return res.status(404).send("No se encontró la ciudad de destino.");

  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);

  const requestBody = {
    origin: { location: { latLng: { latitude: location.lat, longitude: location.lng } } },
    destination: { location: { latLng: { latitude: destino.latitude, longitude: destino.longitude } } },
    intermediates: await getFilteredWaypoints(location.schedule, { latitude: location.lat, longitude: location.lng }, ciudadObjetivo),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: date.toISOString(),
  };

  try {
    const routeRes = await axios.post("https://routes.googleapis.com/directions/v2:computeRoutes", requestBody, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": "AIzaSyCimtoa9B9Bj_Op1IiIST2vseAsVbt5vEQ",
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters"
      }
    });

    const clima = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=d3918607c24dc94a2dd83e3a36f7bd3c&units=metric&lang=es`);
    const weather = clima.data.weather[0].main;
    const visibility = clima.data.visibility;

    let factorClima = 1;
    if (weather === 'Rain') factorClima = visibility < 500 ? 1.2 : 1.1;
    else if (weather === 'Fog') factorClima = 1.3;
    else if (weather === 'Snow') factorClima = 1.5;

    const now = new Date();
    const holidays = await getHolidays(now.getFullYear());
    const isWeekend = [0, 6].includes(now.getDay());
    const isHoliday = holidays.includes(now.toISOString().split('T')[0]);

    let dayAdjustmentFactor = 1;
    if (isHoliday && isWeekend) {
      dayAdjustmentFactor += 0.1;
    } else if (isHoliday) {
      dayAdjustmentFactor += 0.15;
    } else if (isWeekend) {
      dayAdjustmentFactor += 0.1;
    }

    const busDelayFactor = 1.15;
    const duracionSeg = parseInt(routeRes.data.routes[0].duration.replace('s', ''));
    const totalMin = Math.floor((duracionSeg / 60) * factorClima * dayAdjustmentFactor * busDelayFactor);
    const horas = Math.floor(totalMin / 60);
    const min = totalMin % 60;

    const estimatedArrival = new Date();
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + totalMin);

    const horaEstimada = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit', minute: '2-digit'
    }).format(estimatedArrival);

    const formattedDate = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date(location.date));

    res.json({
      texto: `🚌 Tiempo estimado hasta ${ciudadObjetivo}: ${horas}h ${min}m.<br>
      🕓 Hora estimada de llegada: ${horaEstimada} hs<br>
      🌦️ Clima: ${weather}, visibilidad ${visibility}m.<br>
      📅 Día: ${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.<br>
      ⏱️ Ajustes aplicados: clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.<br>
      📍 Última ubicación recibida: ${formattedDate}`,
      mapa: {
        currentLocation: { lat: location.lat, lng: location.lng },
        destinationCoord: destino,
        waypoints: requestBody.intermediates.map(i => i.location.latLng)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error al calcular la ruta");
  }
});

app.listen(3000, () => console.log('Servidor en puerto 3000'));
