import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Ícono personalizado para el colectivo
const busIcon = new L.Icon({
  iconUrl: 'https://images.vexels.com/media/users/3/128933/isolated/preview/b54944f7322722034cfda55e601b4f8d-icono-redondo-de-autobus-de-viaje.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const ResizeMap = () => {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100); // pequeño delay para asegurar que el modal ya se mostró
  }, [map]);

  return null;
};

const MapView = ({ currentLocation, destinationCoord, waypoints }) => {
  if (!currentLocation || !destinationCoord) return <p>No hay datos de ubicación</p>;

  const routePoints = [
    [currentLocation.lat, currentLocation.lng],
    ...waypoints.map(coord => {
      if (typeof coord === 'string') {
        return coord.split(',').map(Number);
      } else if ('latitude' in coord && 'longitude' in coord) {
        return [coord.latitude, coord.longitude];
      } else if ('lat' in coord && 'lng' in coord) {
        return [coord.lat, coord.lng];
      } else {
        return [0, 0];
      }
    }),
    [destinationCoord.latitude, destinationCoord.longitude]
  ];

  return (
    <div style={{ height: '280px', width: '100%', margin: 'auto' }}>
      <MapContainer
        center={[currentLocation.lat, currentLocation.lng]}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ResizeMap />
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={busIcon} />
        <Polyline positions={routePoints} color="blue" />
      </MapContainer>
    </div>
  );
};

export default MapView;
