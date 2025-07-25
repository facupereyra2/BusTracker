// controllers/colectivo.controller.js
import {
  getLocation,
  getCity,
  getFilteredWaypoints
} from '../services/busServices.js'
import { getHolidays } from '../utils/holiday.js';
import axios from 'axios';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase/config.js';
import { distanceCalc } from '../utils/distance.js';


export const obtenerTiempoEstimado = async (req, res) => {
  console.log('entro al backend')
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

  try {
    await getFilteredWaypoints(location.schedule, { latitude: location.lat, longitude: location.lng }, ciudadObjetivo);
  } catch (err) {
    if (err.message === 'El colectivo ya pasó por tu ciudad.') {
      return res.status(400).json({ error: err.message });
    } else {
      return res.status(500).json({ error: 'Error al verificar el recorrido.' });
    }
  }

  const intermediates = await getFilteredWaypoints(location.schedule, { latitude: location.lat, longitude: location.lng }, ciudadObjetivo);
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

export const guardarUbicacion = async (req, res) => {
  try {
    const { origin, destination, schedule, currentLocation } = req.body;

    const originCoord = await getCity(origin);
    if (!originCoord) {
      return res.status(400).json({ error: 'Ciudad origen no encontrada.' });
    }
    const alreadyExists = await get(ref(db, `location/${schedule}`));
    if (!alreadyExists.exists()) {
      // solo si es la primera vez se valida la distancia
      const distanciaMetros = await distanceCalc(
        `${currentLocation.latitude},${currentLocation.longitude}`,
        `${originCoord.latitude},${originCoord.longitude}`
      );

      if (distanciaMetros > 15000) {
        return res.status(400).json({
          error: 'Estás demasiado lejos del punto de origen del colectivo. No se puede compartir ubicación.'
        });
      }
    }


    const date = new Date().toISOString();
    const uniqueId = `${schedule}`.replace(/\s+/g, '');
    const locRef = ref(db, `location/${uniqueId}`);

    await set(locRef, {
      origin,
      destination,
      location: currentLocation,
      date,
      schedule,
      waypoints: []
    });

    res.json({ success: true, mensaje: 'Ubicación guardada correctamente.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno al guardar ubicación' });
  }
};
