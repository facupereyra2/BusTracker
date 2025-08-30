import {
  getLocation,
  getCity,
} from '../services/busServices.js'
import { getHolidays } from '../utils/holiday.js';
import axios from 'axios';
import { get, ref } from 'firebase/database';
import { db } from '../firebase/config.js';

export const obtenerTiempoEstimado = async (req, res) => {
  const { recorridoID, ciudadObjetivo } = req.query;

  console.log('[REQ]', { recorridoID, ciudadObjetivo });

  // 1. Traer ciudades y recorridos de la DB
  const citiesRef = ref(db, 'Cities');
  const recorridosRef = ref(db, 'Recorridos');
  const [citiesSnap, recorridosSnap] = await Promise.all([get(citiesRef), get(recorridosRef)]);
  if (!citiesSnap.exists() || !recorridosSnap.exists()) {
    return res.status(500).json({ error: true, texto: "Error accediendo a la base de datos." });
  }
  const cities = citiesSnap.val();
  const recorridos = recorridosSnap.val();

  function normalize(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  const getCityIDByName = (name) => {
    if (!name) return null;
    const entry = Object.entries(cities).find(
      ([_, val]) =>
        val &&
        val.name &&
        typeof val.name === "string" &&
        normalize(val.name) === normalize(name)
    );
    return entry ? entry[0] : null;
  };

  // Traer la ubicación y stops actuales desde Firebase
  const location = await getLocation(recorridoID);
  if (!location || location.error) {
    return res.json({
      error: true,
      texto: location?.error || "No hay información de ubicación."
    });
  }

  // 2. Buscar el recorrido y la lista de cityIDs
  const recorridoObj = recorridos[recorridoID];
  const citiesArray = recorridoObj ? recorridoObj.cities.filter(Boolean) : [];
  const cityIDsArray = citiesArray.map(c => c.cityID);

  // Determinar la ciudad más cercana a la ubicación actual del colectivo
  let currentCityIdx = -1;
  let currentCityID = null;
  let minDist = Infinity;

  // Matchear por coordenada: encontrar la ciudad más cercana a location.lat, location.lng
  for (let i = 0; i < citiesArray.length; i++) {
    const city = citiesArray[i];
    if (!city.latitude || !city.longitude) continue;
    const dLat = city.latitude - location.lat;
    const dLng = city.longitude - location.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      currentCityIdx = i;
      currentCityID = city.cityID;
    }
  }

  // Si tu estructura de location tiene el nombre de la ciudad actual, podés usar:
  // const currentCityID = getCityIDByName(location.currentCity);

  const targetID = getCityIDByName(ciudadObjetivo);
  const targetIdx = cityIDsArray.indexOf(targetID);

  console.log('[CURRENT CITY]', { currentCityID, currentCityIdx });
  console.log('[TARGET ID]', { targetID, targetIdx });
  console.log('[cityIDsArray]', cityIDsArray);
  if (Array.isArray(location.stops)) {
    console.log('[STOPS NAMES]', location.stops.map(s => s.name));
  } else {
    console.log('[STOPS] No stops in location');
  }

  // Validaciones
  if (targetIdx === -1) {
    return res.json({ error: true, texto: `🚏 ${ciudadObjetivo} no forma parte del recorrido.` });
  }
  if (targetIdx < currentCityIdx) {
    return res.json({ error: true, texto: `El colectivo ya pasó por ${ciudadObjetivo}.` });
  }

  // --- Lógica de paradas intermedias ---
  // Solo las paradas entre la ubicación actual y el objetivo
  const stopsInTramo = (location.stops || []).filter(stop => {
    const stopID = getCityIDByName(stop.name);
    const stopIdx = cityIDsArray.indexOf(stopID);
    console.log(`[TRAMO FILTER] stop="${stop.name}" id="${stopID}" idx=${stopIdx} | currentCityIdx=${currentCityIdx}, targetIdx=${targetIdx}`);
    return stopIdx > currentCityIdx && stopIdx < targetIdx;
  });

  console.log('[STOPS IN TRAMO]', stopsInTramo.map(s => s.name));

  const intermediates = stopsInTramo.map(stop => ({
    location: {
      latLng: {
        latitude: parseFloat(stop.coord.split(',')[0]),
        longitude: parseFloat(stop.coord.split(',')[1])
      }
    }
  }));

  const cantidadParadas = intermediates.length;
  const minutosExtraPorParadas = cantidadParadas * 5;

  const destino = await getCity(ciudadObjetivo);
  if (!destino) return res.status(404).send("No se encontró la ciudad de destino.");

  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);

  const requestBody = {
    origin: { location: { latLng: { latitude: location.lat, longitude: location.lng } } },
    destination: { location: { latLng: { latitude: destino.latitude, longitude: destino.longitude } } },
    intermediates,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: date.toISOString(),
  };

  try {
    const routeRes = await axios.post(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": "AIzaSyCimtoa9B9Bj_Op1IiIST2vseAsVbt5vEQ",
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters"
        }
      }
    );

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
    const totalMin = Math.floor((duracionSeg / 60) * factorClima * dayAdjustmentFactor * busDelayFactor) + minutosExtraPorParadas;
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
    tiempo: `${horas}h ${min}m`,
    hora: `${horaEstimada} hs`,
    clima: `${weather}, visibilidad ${visibility}m.`,
    dia: `${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.`,
    ajustes: `clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.`,
    paradas: `${cantidadParadas} (+${minutosExtraPorParadas} min)`,
    ubicacion: formattedDate,
    mapa: {
      currentLocation: { lat: location.lat, lng: location.lng },
      destinationCoord: destino,
      waypoints: intermediates.map(i => i.location.latLng)
    }
  });
} catch (error) {
  console.error(error);
  res.status(500).json({
    error: true,
    msg: "Error al calcular la ruta",
    detalle: error.message
  });
}};