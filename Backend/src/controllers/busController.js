import { getLocation, getCity } from '../services/busServices.js'
import { getHolidays } from '../utils/holiday.js'
import axios from 'axios'
import { get, ref } from 'firebase/database'
import { db } from '../firebase/config.js'

// Helper para parsear coord string -> { lat, lng }
function parseCoord(coordStr) {
  if (!coordStr) return null
  let [lat, lng] = coordStr.split(',').map(s => Number(s.trim()))
  return { lat, lng }
}

// Helper para normalizar nombres
function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

// Para buscar cityID by name en Cities
function getCityIDByName(name, cities) {
  if (!name) return null
  const entry = Object.entries(cities).find(
    ([_, val]) =>
      val &&
      val.name &&
      typeof val.name === "string" &&
      normalize(val.name) === normalize(name)
  )
  return entry ? entry[0] : null
}

// Distancia en metros entre dos coordenadas
function haversineDistance(coordA, coordB) {
  if (!coordA || !coordB) return Infinity
  const R = 6371e3
  const φ1 = coordA.lat * Math.PI / 180
  const φ2 = coordB.lat * Math.PI / 180
  const Δφ = (coordB.lat - coordA.lat) * Math.PI / 180
  const Δλ = (coordB.lng - coordA.lng) * Math.PI / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const obtenerTiempoEstimado = async (req, res) => {
  const { recorridoID, ciudadObjetivo } = req.query

  // --- Debug de entrada ---
  console.log(">>> [REQ DEBUG] recorridoID:", recorridoID, "ciudadObjetivo:", ciudadObjetivo)

  // 1. Traer Cities y Recorridos de la DB
  const citiesRef = ref(db, 'Cities')
  const recorridosRef = ref(db, 'Recorridos')
  const [citiesSnap, recorridosSnap] = await Promise.all([get(citiesRef), get(recorridosRef)])
  if (!citiesSnap.exists() || !recorridosSnap.exists()) {
    return res.status(500).json({ error: true, texto: "Error accediendo a la base de datos." })
  }
  const cities = citiesSnap.val()
  const recorridos = recorridosSnap.val()

  // 2. Traer la ubicación actual del colectivo
  const locationObj = await getLocation(recorridoID)
  if (!locationObj || locationObj.error) {
    return res.json({
      error: true,
      texto: locationObj?.error || "No hay información de ubicación."
    })
  }

  // Debug: mostrar la ubicación recibida
  console.log(">>> [LOCATION DEBUG] locationObj:", JSON.stringify(locationObj))

  // 3. Buscar el recorrido y array de ciudades
  const recorridoObj = recorridos[recorridoID]
  const citiesArray = recorridoObj ? recorridoObj.cities.filter(Boolean) : []
  const cityIDsArray = citiesArray.map(c => c.cityID)

  // Debug: mostrar citiesArray
  console.log(">>> [CITIES DEBUG] citiesArray:", citiesArray.map((c, i) => ({ i, cityID: c.cityID, name: cities[c.cityID]?.name })))

  // 4. Detectar ciudad actual robustamente
  const DIST_THRESHOLD = 700 // metros

  const busCoord =
    locationObj.location && !isNaN(locationObj.location.latitude) && !isNaN(locationObj.location.longitude)
      ? { lat: Number(locationObj.location.latitude), lng: Number(locationObj.location.longitude) }
      : (typeof locationObj.lat === "number" && typeof locationObj.lng === "number")
        ? { lat: Number(locationObj.lat), lng: Number(locationObj.lng) }
        : null;

  console.log(">>> [BUSCOORD DEBUG] busCoord:", busCoord);

  // Buscar ciudad más cercana del recorrido
  let closestIdx = -1, closestID = null, minDist = Infinity
  for (let i = 0; i < citiesArray.length; i++) {
    const cityID = citiesArray[i].cityID
    const cityData = cities[cityID]
    if (!cityData || !cityData.coord) continue
    const cityCoord = parseCoord(cityData.coord)
    const dist = haversineDistance(busCoord, cityCoord)
    console.log(`>>> Comparando con ciudad ${cityData.name} (${cityID}): dist = ${dist} m, busCoord = ${JSON.stringify(busCoord)}, cityCoord = ${JSON.stringify(cityCoord)}`)
    if (dist < minDist) {
      minDist = dist
      closestIdx = i
      closestID = cityID
    }
  }

  let currentIdx = closestIdx
  let currentID = closestID
  // Si está lejos de cualquier ciudad (> threshold), consideramos la ciudad anterior
  if (minDist > DIST_THRESHOLD && closestIdx > 0) {
    currentIdx = closestIdx - 1
    currentID = citiesArray[currentIdx].cityID
  }

  // Si la ubicación está antes de la primera ciudad, error
  if (closestIdx === 0 && minDist > DIST_THRESHOLD) {
    return res.json({ error: true, texto: "No se pudo determinar la ciudad actual del colectivo." })
  }

  // Validación extra: si busCoord es inválido, error
  if (!busCoord || isNaN(busCoord.lat) || isNaN(busCoord.lng)) {
    return res.json({ error: true, texto: "No se pudo obtener las coordenadas actuales del colectivo." })
  }

  // 5. Determinar ciudad objetivo
  const targetID = getCityIDByName(ciudadObjetivo, cities)
  const targetIdx = cityIDsArray.indexOf(targetID)

  // LOGS para debug
  console.log(`[BUS] currentIdx=${currentIdx} (${cities[currentID]?.name}), targetIdx=${targetIdx} (${cities[targetID]?.name}), minDist=${minDist}`)

  // 6. Validaciones robustas
  if (targetIdx === -1) {
    return res.json({ error: true, texto: `🚏 ${ciudadObjetivo} no forma parte del recorrido.` })
  }
  if (targetIdx < currentIdx) {
    return res.json({ error: true, texto: `El colectivo ya pasó por ${ciudadObjetivo}.` })
  }
  if (targetIdx === currentIdx) {
    return res.json({ info: true, texto: `El colectivo está actualmente en ${ciudadObjetivo}.` })
  }

  // 7. Paradas intermedias (solo entre actual y objetivo)
  const stops = Array.isArray(locationObj.stops) ? locationObj.stops : []
  const stopsInTramo = stops.filter(stop => {
    const stopID = getCityIDByName(stop.name, cities)
    const stopIdx = cityIDsArray.indexOf(stopID)
    return stopIdx > currentIdx && stopIdx < targetIdx
  })
  const intermediates = stopsInTramo.map(stop => ({
    location: {
      latLng: {
        latitude: parseCoord(stop.coord)?.lat,
        longitude: parseCoord(stop.coord)?.lng
      }
    }
  }))
  const cantidadParadas = intermediates.length
  const minutosExtraPorParadas = cantidadParadas * 5

  // 8. Datos de destino
  const destino = cities[targetID]
  if (!destino || !destino.coord) return res.status(404).send("No se encontró la ciudad de destino.")

  // 9. Preparar request para Google Routes API
  const date = new Date()
  date.setMinutes(date.getMinutes() + 5)
  const destCoord = parseCoord(destino.coord)
  const requestBody = {
    origin: { location: { latLng: { latitude: busCoord.lat, longitude: busCoord.lng } } },
    destination: { location: { latLng: { latitude: destCoord.lat, longitude: destCoord.lng } } },
    intermediates,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: date.toISOString()
  }

  // 10. Lógica de ETA y clima
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
    )

    const clima = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${busCoord.lat}&lon=${busCoord.lng}&appid=d3918607c24dc94a2dd83e3a36f7bd3c&units=metric&lang=es`)
    const weather = clima.data.weather[0].main
    const visibility = clima.data.visibility

    let factorClima = 1
    if (weather === 'Rain') factorClima = visibility < 500 ? 1.2 : 1.1
    else if (weather === 'Fog') factorClima = 1.3
    else if (weather === 'Snow') factorClima = 1.5

    const now = new Date()
    const holidays = await getHolidays(now.getFullYear())
    const isWeekend = [0, 6].includes(now.getDay())
    const isHoliday = holidays.includes(now.toISOString().split('T')[0])

    let dayAdjustmentFactor = 1
    if (isHoliday && isWeekend) {
      dayAdjustmentFactor += 0.1
    } else if (isHoliday) {
      dayAdjustmentFactor += 0.15
    } else if (isWeekend) {
      dayAdjustmentFactor += 0.1
    }

    const busDelayFactor = 1.15
    const duracionSeg = parseInt(routeRes.data.routes[0].duration.replace('s', ''))
    const totalMin = Math.floor((duracionSeg / 60) * factorClima * dayAdjustmentFactor * busDelayFactor) + minutosExtraPorParadas
    const horas = Math.floor(totalMin / 60)
    const min = totalMin % 60

    const estimatedArrival = new Date()
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + totalMin)

    const horaEstimada = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit', minute: '2-digit'
    }).format(estimatedArrival)

    const formattedDate = new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date(locationObj.date))

    res.json({
      tiempo: `${horas}h ${min}m`,
      hora: `${horaEstimada} hs`,
      clima: `${weather}, visibilidad ${visibility}m.`,
      dia: `${isWeekend ? 'Fin de semana' : 'Laboral'}${isHoliday ? ' y feriado' : ''}.`,
      ajustes: `clima +${Math.round((factorClima - 1) * 100)}%, día +${Math.round((dayAdjustmentFactor - 1) * 100)}%.`,
      paradas: `${cantidadParadas} (+${minutosExtraPorParadas} min)`,
      ubicacion: formattedDate,
      mapa: {
        currentLocation: { latitude: busCoord.lat, longitude: busCoord.lng },
        destinationCoord: { latitude: destCoord.lat, longitude: destCoord.lng },
        waypoints: intermediates.map(i => ({
          latitude: i.location.latLng.latitude,
          longitude: i.location.latLng.longitude
        }))
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: true,
      msg: "Error al calcular la ruta",
      detalle: error.message
    })
  }
}