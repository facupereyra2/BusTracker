import { getLocation, getCity } from '../services/busServices.js'
import { getHolidays } from '../utils/holiday.js'
import axios from 'axios'
import { get, ref } from 'firebase/database'
import { db } from '../firebase/config.js'

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

export const obtenerTiempoEstimado = async (req, res) => {
  const { recorridoID, ciudadObjetivo } = req.query;

  // --- DB fetch ---
  const citiesRef = ref(db, 'Cities');
  const recorridosRef = ref(db, 'Recorridos');
  const locationRef = ref(db, `location/${recorridoID}`);

  const [citiesSnap, recorridosSnap, locationSnap] = await Promise.all([
    get(citiesRef), get(recorridosRef), get(locationRef)
  ]);

  if (!citiesSnap.exists() || !recorridosSnap.exists() || !locationSnap.exists()) {
    return res.status(500).json({ error: true, texto: "Error accediendo a la base de datos." });
  }

  const cities = citiesSnap.val();
  const recorridos = recorridosSnap.val();
  const locationObj = locationSnap.val();

  // --- Recorrido completo ---
  const recorridoObj = recorridos[recorridoID];
  if (!recorridoObj) return res.json({ error: true, texto: "Recorrido no encontrado." });
  const citiesArray = recorridoObj.cities.filter(Boolean); // [{cityID, ...}]
  const cityIDsArray = citiesArray.map(c => c.cityID);

  // --- Ciudad objetivo ---
  const objetivoID = getCityIDByName(ciudadObjetivo, cities);
  if (!objetivoID) {
    return res.json({ error: true, texto: `La ciudad ${ciudadObjetivo} no existe en el sistema.` });
  }
  const objetivoIdx = cityIDsArray.indexOf(objetivoID);
  if (objetivoIdx === -1) {
    return res.json({ error: true, texto: `La ciudad ${ciudadObjetivo} no está en el recorrido.` });
  }

  // --- Ciudad actual: origen del viaje actual ---
  const originCityID = getCityIDByName(locationObj.origin, cities);
  const currentCityIdx = cityIDsArray.indexOf(originCityID);
  if (currentCityIdx === -1) {
    return res.json({ error: true, texto: "No se pudo determinar la ciudad de origen del colectivo." });
  }

  // --- Ubicación actual del colectivo ---
  const busCoord = locationObj.location
    ? { lat: Number(locationObj.location.latitude), lng: Number(locationObj.location.longitude) }
    : null;
  if (!busCoord || isNaN(busCoord.lat) || isNaN(busCoord.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener la ubicación actual del colectivo." });
  }

  // --- Paradas intermedias restantes en este viaje ---
  const stops = Array.isArray(locationObj.stops) ? locationObj.stops : [];
  const stopsNamesNorm = stops.map(s => normalize(s.name));
  const objetivoNorm = normalize(ciudadObjetivo);

  // --- Lógica principal ---
  if (objetivoIdx < currentCityIdx) {
    // Ya pasó
    return res.json({ error: true, texto: `El colectivo ya pasó por ${ciudadObjetivo}.` });
  } else if (objetivoIdx === currentCityIdx) {
    // Es la ciudad actual
    return res.json({ info: true, texto: `El colectivo está actualmente en ${ciudadObjetivo}.` });
  }
  // Si está adelante en el recorrido (sea parada o no, se calcula tiempo)

  // --- Paradas a incluir en el tramo ---
  // Solo incluir las stops que estén entre la ciudad actual y la ciudad objetivo
  let intermediates = [];
  intermediates = stops
    .filter(stop => {
      const stopID = getCityIDByName(stop.name, cities);
      const stopIdx = cityIDsArray.indexOf(stopID);
      return stopIdx > currentCityIdx && stopIdx < objetivoIdx;
    })
    .map(stop => ({
      location: {
        latLng: {
          latitude: parseCoord(stop.coord)?.lat,
          longitude: parseCoord(stop.coord)?.lng
        }
      }
    }));

  const numInterStops = intermediates.length;
  const minutosExtraPorParadas = numInterStops * 5;

  // --- Coordenadas destino ---
  const destinoObj = cities[objetivoID];
  if (!destinoObj || !destinoObj.coord) {
    return res.status(404).json({ error: true, texto: "No se encontró la ciudad objetivo en la base." });
  }
  const destinoCoord = parseCoord(destinoObj.coord);

  // --- Google Maps API ---
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5);

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

    const clima = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${busCoord.lat}&lon=${busCoord.lng}&appid=d3918607c24dc94a2dd83e3a36f7bd3c&units=metric&lang=es`);
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
    }).format(new Date(locationObj.date));

    return res.json({
      tiempo: `${horas}h ${min}m`,
      hora: `${horaEstimada} hs`,
      clima: `${weather}, visibilidad ${visibility}m.`,
      dia: `${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.`,
      ajustes: `clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.`,
      paradas: `${numInterStops} (+${minutosExtraPorParadas} min)`,
      ubicacion: formattedDate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      msg: "Error al calcular la ruta",
      detalle: error.message
    });
  }
};