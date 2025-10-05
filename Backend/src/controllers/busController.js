import { getLocation, getCity } from '../services/busServices.js'
import { getHolidays } from '../utils/holiday.js'
import axios from 'axios'
import { get, ref } from 'firebase/database'
import { db } from '../firebase/config.js'
import { DateTime } from 'luxon';

// Helpers
function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function getCityIDByName(name, cities) {
  if (!name) return null;
  const entry = Object.entries(cities).find(
    ([_, val]) => val && val.name && typeof val.name === "string" && normalize(val.name) === normalize(name)
  );
  return entry ? entry[0] : null;
}
function parseCoord(coordStr) {
  if (!coordStr) return null;
  let [lat, lng] = coordStr.split(',').map(s => Number(s.trim()));
  return { lat, lng };
}
function coordsAreEqual(coordA, coordB) {
  if (!coordA || !coordB) return false;
  return (
    Math.abs(coordA.lat - coordB.lat) < 0.0001 &&
    Math.abs(coordA.lng - coordB.lng) < 0.0001
  );
}

export const obtenerTiempoEstimado = async (req, res) => {
  const { recorridoID, ciudadObjetivo } = req.query;

  // --- DB fetch ---
  const citiesRef = ref(db, 'Cities');
  const recorridosRef = ref(db, 'Recorridos');
  const locationRef = ref(db, `location/${recorridoID}`);

  const [citiesSnap, recorridosSnap, locationSnap] = await Promise.all([
    get(citiesRef), get(recorridosRef), get(locationRef)
  ]);

  // --- Validaciones básicas ---
  if (!recorridosSnap.exists()) {
    return res.json({ error: true, texto: "No se encontró información para el recorrido solicitado." });
  }
  if (!citiesSnap.exists()) {
    return res.json({ error: true, texto: "No se encontró información de ciudades." });
  }
  if (!locationSnap.exists()) {
    return res.json({ error: true, texto: "No se encontró información de ubicación para este recorrido." });
  }

  const cities = citiesSnap.val();
  const recorridos = recorridosSnap.val();
  const locationObj = locationSnap.val();

  // --- Validar formato y existencia de date ---
  if (!locationObj.date || isNaN(Number(locationObj.date))) {
    return res.json({ error: true, texto: "La fecha de la última ubicación compartida es inválida." });
  }

  // --- Chequeo de antigüedad de la ubicación compartida ---
  const ubicationDate = DateTime.fromMillis(Number(locationObj.date));
  const now = DateTime.utc();
  const hoursDiff = now.diff(ubicationDate, 'hours').hours;

  if (hoursDiff >= 3) {
    return res.json({ error: true, texto: "No es posible informar el tiempo porque la última ubicación compartida es muy vieja (más de 3 horas)." });
  }
  if (hoursDiff < 0) {
    return res.json({ error: true, texto: "La fecha de la ubicación compartida parece ser del futuro. Verifica el reloj del dispositivo." });
  }

  // --- Recorrido completo ---
  const recorridoObj = recorridos[recorridoID];
  if (!recorridoObj) {
    return res.json({ error: true, texto: "El recorrido solicitado no existe en el sistema." });
  }
  const citiesArray = recorridoObj.cities.filter(Boolean); // [{cityID, ...}]
  const cityIDsArray = citiesArray.map(c => c.cityID);

  // --- Validación de recorrido suficiente ---
  if (cityIDsArray.length < 2) {
    return res.json({ error: true, texto: "El recorrido seleccionado no tiene suficientes ciudades para calcular." });
  }

  // --- IDs e índices relevantes ---
  const objetivoID = getCityIDByName(ciudadObjetivo, cities);
  if (!objetivoID) {
    return res.json({ error: true, texto: `La ciudad "${ciudadObjetivo}" no existe en el sistema.` });
  }
  const objetivoIdx = cityIDsArray.indexOf(objetivoID);
  if (objetivoIdx === -1) {
    return res.json({ error: true, texto: `La ciudad "${ciudadObjetivo}" no está en el recorrido seleccionado.` });
  }

  const originCityID = getCityIDByName(locationObj.origin, cities);
  const originIdx = cityIDsArray.indexOf(originCityID);

  // --- Validación de índices consistentes ---
  if (originIdx === -1) {
    return res.json({ error: true, texto: "La ciudad de origen actual no se encuentra en el recorrido." });
  }
  if (originIdx > objetivoIdx) {
    return res.json({ error: true, texto: "La ciudad objetivo está antes que el origen actual. Verifica los datos del recorrido y la ubicación compartida." });
  }

  const destinationCityID = getCityIDByName(locationObj.destination, cities);
  const destinationIdx = cityIDsArray.indexOf(destinationCityID);

  // --- Paradas intermedias relevantes (solo stops reales entre origen actual y objetivo) ---
  const stops = Array.isArray(locationObj.stops) ? locationObj.stops : [];
  const relevantStops = stops.filter(stop => {
    const stopID = getCityIDByName(stop.name, cities);
    const stopIdx = cityIDsArray.indexOf(stopID);
    // Solo los que están después del origen y antes del objetivo
    return stopIdx > originIdx && stopIdx < objetivoIdx;
  });
  const numInterStops = relevantStops.length;
  const minutosExtraPorParadas = numInterStops * 5;
  const paradasIntermedias = relevantStops.map(s => s.name);

  // Si necesitas las coords para Google Maps intermediates:
  const intermediates = relevantStops.map(stop => {
    const stopID = getCityIDByName(stop.name, cities);
    const coord = cities[stopID]?.coord;
    const parsed = parseCoord(coord);
    return {
      location: {
        latLng: {
          latitude: parsed?.lat,
          longitude: parsed?.lng
        }
      }
    };
  });

  // --- Ubicación actual del colectivo ---
  const busCoord = locationObj.location
    ? { lat: Number(locationObj.location.latitude), lng: Number(locationObj.location.longitude) }
    : null;
  if (!busCoord || isNaN(busCoord.lat) || isNaN(busCoord.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener la ubicación actual del colectivo." });
  }

  // --- Validar coordenadas de origen y destino ---
  const originObj = cities[originCityID];
  const originCoord = originObj ? parseCoord(originObj.coord) : null;
  if (!originCoord || isNaN(originCoord.lat) || isNaN(originCoord.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener las coordenadas de la ciudad de origen." });
  }

  // --- Determinar índice del próximo stop (o destination si no hay stops) ---
  let nextStopIdx = destinationIdx;
  if (stops.length > 0) {
    const nextStopID = getCityIDByName(stops[0].name, cities);
    nextStopIdx = cityIDsArray.indexOf(nextStopID);
  }

  // --- Lógica robusta: ¿ya pasó por la ciudad objetivo? ---
  const stopsNamesNorm = stops.map(s => normalize(s.name));
  const objetivoNorm = normalize(ciudadObjetivo);

  if (
    objetivoIdx > originIdx &&
    objetivoIdx < nextStopIdx &&
    !stopsNamesNorm.includes(objetivoNorm)
  ) {
    return res.json({ error: true, texto: `El colectivo ya pasó por "${ciudadObjetivo}".` });
  }

  if (objetivoIdx < originIdx) {
    return res.json({ error: true, texto: `El colectivo ya pasó por "${ciudadObjetivo}".` });
  }
  if (objetivoIdx === originIdx) {
    return res.json({ error: true, texto: `El colectivo ya pasó por "${ciudadObjetivo}".` });
  }

  // --- Si llegó a destination ---
  const destinoObjCompartido = cities[destinationCityID];
  const destinoCoordCompartido = destinoObjCompartido ? parseCoord(destinoObjCompartido.coord) : null;
  if (!destinoCoordCompartido || isNaN(destinoCoordCompartido.lat) || isNaN(destinoCoordCompartido.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener las coordenadas de la ciudad destino compartida." });
  }

  if (
    stops.length === 0 &&
    coordsAreEqual(busCoord, destinoCoordCompartido)
  ) {
    if (objetivoIdx === destinationIdx) {
      return res.json({ info: true, texto: `El colectivo está actualmente en "${ciudadObjetivo}".` });
    } else {
      return res.json({ error: true, texto: `El colectivo ya pasó por "${ciudadObjetivo}".` });
    }
  }

  // --- Coordenadas destino ---
  const destinoObj = cities[objetivoID];
  if (!destinoObj || !destinoObj.coord) {
    return res.status(404).json({ error: true, texto: "No se encontró la ciudad objetivo en la base." });
  }
  const destinoCoord = parseCoord(destinoObj.coord);
  if (!destinoCoord || isNaN(destinoCoord.lat) || isNaN(destinoCoord.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener las coordenadas de la ciudad objetivo." });
  }

  // --- Google Maps API ---
  const date = new Date();

  const requestBody = {
    origin: { location: { latLng: { latitude: busCoord.lat, longitude: busCoord.lng } } },
    destination: { location: { latLng: { latitude: destinoCoord.lat, longitude: destinoCoord.lng } } },
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

    // --- Validar respuesta de Google Maps ---
    if (
      !routeRes.data ||
      !routeRes.data.routes ||
      !routeRes.data.routes[0] ||
      !routeRes.data.routes[0].duration
    ) {
      return res.json({ error: true, texto: "No fue posible obtener una ruta válida desde Google Maps. Intenta nuevamente más tarde." });
    }

    // --- Clima ---
    const apiKeyWeather = 'd3918607c24dc94a2dd83e3a36f7bd3c'; // API Key de OpenWeatherMap
    let weather = 'Sin datos';
    let visibility = '-';
    try {
      const clima = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${busCoord.lat}&lon=${busCoord.lng}&appid=${apiKeyWeather}&units=metric&lang=es`);
      weather = clima.data?.weather?.[0]?.main || 'Sin datos';
      visibility = clima.data?.visibility || '-';
    } catch (climaErr) {
      // Si falla, no bloquea la respuesta principal
      weather = 'No disponible';
      visibility = '-';
    }

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
    if (isNaN(duracionSeg) || duracionSeg <= 0) {
      return res.json({ error: true, texto: "No fue posible calcular la duración de la ruta. Intenta nuevamente más tarde." });
    }
    const totalMin = Math.floor((duracionSeg / 60) * factorClima * dayAdjustmentFactor * busDelayFactor) + minutosExtraPorParadas;
    const horas = Math.floor(totalMin / 60);
    const min = totalMin % 60;

    // ---- AJUSTE DE HORA ARGENTINA ----
    const estimatedArrival = DateTime.utc().plus({ minutes: totalMin }).setZone('America/Argentina/Buenos_Aires');
    const horaEstimada = estimatedArrival.toFormat('HH:mm') + " hs";

    const formattedDate = ubicacionDate.setZone('America/Argentina/Buenos_Aires').toLocaleString(DateTime.DATETIME_FULL, { locale: 'es' });

    return res.json({
      tiempo: `${horas}h ${min}m`,
      hora: `${horaEstimada}`,
      clima: `${weather}, visibilidad ${visibility}m.`,
      dia: `${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.`,
      ajustes: `clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.`,
      paradas: `${numInterStops} (+${minutosExtraPorParadas} min)`,
      paradasIntermedias: paradasIntermedias.join(', '),
      ubicacion: formattedDate,
    });
  } catch (error) {
    // Manejo de error más amigable
    return res.status(500).json({
      error: true,
      texto: "No hay información disponible de este recorrido. Por favor intenta más tarde.",
      detalle: error.message
    });
  }
};