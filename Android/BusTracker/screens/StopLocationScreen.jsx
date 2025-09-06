import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Button, Text, View } from 'react-native';
import { useLocationTracking } from '../context/LocationContext';

export default function StopLocationScreen() {
  const { setIsTracking } = useLocationTracking();
  const router = useRouter();

  const stopSharing = async () => {
    await Location.stopLocationUpdatesAsync('background-location-task');
    setIsTracking(false);
    router.back();
  };
  return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
      <Text>¿Querés dejar de compartir ubicación?</Text>
      <Button title="Dejar de compartir" onPress={stopSharing} />
    </View>
  );
}