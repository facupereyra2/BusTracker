import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

function getRegionForCoordinates(points) {
  let minLat, maxLat, minLng, maxLng;
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }
  points.forEach(point => {
    if (minLat == null || point.latitude < minLat) minLat = point.latitude;
    if (maxLat == null || point.latitude > maxLat) maxLat = point.latitude;
    if (minLng == null || point.longitude < minLng) minLng = point.longitude;
    if (maxLng == null || point.longitude > maxLng) maxLng = point.longitude;
  });
  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  let latitudeDelta = (maxLat - minLat) * 2 || 0.01;
  let longitudeDelta = (maxLng - minLng) * 2 || 0.01;
  if (latitudeDelta < 0.005) latitudeDelta = 0.01;
  if (longitudeDelta < 0.005) longitudeDelta = 0.01;
  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

const MapPreview = ({ currentLocation, destinationCoord, waypoints = [] }) => {
  if (
    !currentLocation ||
    !destinationCoord ||
    typeof currentLocation.lat !== 'number' ||
    typeof currentLocation.lng !== 'number' ||
    typeof destinationCoord.latitude !== 'number' ||
    typeof destinationCoord.longitude !== 'number'
  ) {
    return <View><Text>Datos de ubicación inválidos</Text></View>;
  }

  const routePoints = [
    { latitude: currentLocation.lat, longitude: currentLocation.lng },
    ...waypoints.map(coord =>
      'latitude' in coord && 'longitude' in coord
        ? { latitude: coord.latitude, longitude: coord.longitude }
        : 'lat' in coord && 'lng' in coord
        ? { latitude: coord.lat, longitude: coord.lng }
        : null
    ).filter(Boolean),
    { latitude: destinationCoord.latitude, longitude: destinationCoord.longitude }
  ];

  // Debug
  useEffect(() => {
    console.log('routePoints:', JSON.stringify(routePoints, null, 2));
  }, [JSON.stringify(routePoints)]);

  // Solo usamos region, NO initialRegion
  const [region, setRegion] = useState(getRegionForCoordinates(routePoints));
  useEffect(() => {
    setRegion(getRegionForCoordinates(routePoints));
  }, [JSON.stringify(routePoints)]);

  // Forzamos rerender usando key único
  const mapKey = routePoints.map(p => `${p.latitude},${p.longitude}`).join('|');

  return (
    <View style={{ width: '100%', height: 220, marginTop: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eaeaea' }}>
      <MapView
        key={mapKey}
        style={{ flex: 1 }}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude: -34.6037, longitude: -58.3816 }} title="Test Buenos Aires" />
        <Marker
          coordinate={routePoints[0]}
          title="Colectivo (origen)"
          pinColor="blue"
        />
        <Marker
          coordinate={routePoints[routePoints.length - 1]}
          title="Destino"
          pinColor="red"
        />
        {routePoints.slice(1, -1).map((point, idx) => (
          <Marker
            key={idx}
            coordinate={point}
            title={`Parada ${idx + 1}`}
            pinColor="orange"
          />
        ))}
        <Polyline coordinates={routePoints} strokeWidth={6} strokeColor="#ee7b18" />
      </MapView>
    </View>
  );
};

export default MapPreview;