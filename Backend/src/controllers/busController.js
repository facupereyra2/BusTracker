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
  const location = await getLocation(recorridoID);

  if (!location || location.error) {
    return res.json({
      error: true,
      texto: location?.error || "No hay información de ubicación."
    });
  }

  // 1. Traer ciudades y recorridos de la DB
  const citiesRef = ref(db, 'Cities');
  const recorridosRef = ref(db, 'Recorridos');
  const [citiesSnap, recorridosSnap] = await Promise.all([get(citiesRef), get(recorridosRef)]);
  if (!citiesSnap.exists() || !recorridosSnap.exists()) {
    return res.status(500).json({ error: true, texto: "Error accediendo a la base de datos." });
  }
  const cities = citiesSnap.val();
  const recorridos = recorridosSnap.val();

  console.log("location.origin:", location.origin);
  console.log("location.destination:", location.destination);

  // 2. Buscar el recorrido y la lista de cityIDs
  const recorridoObj = recorridos[recorridoID]; // <<--- LA CLAVE!
  const citiesArray = recorridoObj ? recorridoObj.cities.filter(Boolean) : [];

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

  const originID = getCityIDByName(location.origin);
  const destinationID = getCityIDByName(location.destination);
  const targetID = getCityIDByName(ciudadObjetivo);

  const cityIDsArray = citiesArray.map(c => c.cityID);

  const originIdx = cityIDsArray.indexOf(originID);
  const destinationIdx = cityIDsArray.indexOf(destinationID);
  const targetIdx = cityIDsArray.indexOf(targetID);

  console.log("Recorrido:", recorridoObj.name);
  console.log("ciudadObjetivo:", ciudadObjetivo);
  console.log("targetID:", targetID);
  console.log("cityIDsArray:", cityIDsArray);
  console.log("targetIdx:", targetIdx);
  console.log("originID:", originID, "originIdx:", originIdx);
  console.log("destinationID:", destinationID, "destinationIdx:", destinationIdx);
  console.log("Stops:", (location.stops || []).map(s => s.name));

  // 4. Lógica de validación de ciudad objetivo
  if (targetIdx === -1) {
    return res.json({ error: true, texto: `🚏 ${ciudadObjetivo} no forma parte del recorrido.` });
  }
  if (targetIdx < originIdx) {
    return res.json({ error: true, texto: `El colectivo ya pasó por ${ciudadObjetivo}.` });
  }
  if (targetIdx > destinationIdx) {
    return res.json({ error: true, texto: `El colectivo no llega a ${ciudadObjetivo} en este viaje.` });
  }
  // Si está en el tramo, pero no en stops, ya pasó
  if (
    targetIdx !== destinationIdx &&
    !((location.stops || []).some(stop => normalize(stop.name) === normalize(ciudadObjetivo)))
  ) {
    return res.json({ error: true, texto: `El colectivo ya pasó por ${ciudadObjetivo}.` });
  }

  // ---- Lógica original a partir de acá: ----

  const destino = await getCity(ciudadObjetivo);
  if (!destino) return res.status(404).send("No se encontró la ciudad de destino.");

  // Usar los stops guardados en la DB como intermediates
  const intermediates = (location.stops || []).map(stop => ({
    location: {
      latLng: {
        latitude: parseFloat(stop.coord.split(',')[0]),
        longitude: parseFloat(stop.coord.split(',')[1])
      }
    }
  }));

  const cantidadParadas = intermediates.length;
  const minutosExtraPorParadas = cantidadParadas * 5;

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
      texto: `🚌 Tiempo estimado hasta ${ciudadObjetivo}: ${horas}h ${min}m.<br>
      🕓 Hora estimada de llegada: ${horaEstimada} hs<br>
      🌦️ Clima: ${weather}, visibilidad ${visibility}m.<br>
      📅 Día: ${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.<br>
      ⏱️ Ajustes aplicados: clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.<br>
      🚏 Paradas intermedias: ${cantidadParadas} (+${minutosExtraPorParadas} min)<br>
      📍 Última ubicación recibida: ${formattedDate}`,

      mapa: {
        currentLocation: { lat: location.lat, lng: location.lng },
        destinationCoord: destino,
        waypoints: intermediates.map(i => i.location.latLng)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error al calcular la ruta");
  }
};