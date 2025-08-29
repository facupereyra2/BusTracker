import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function AdminScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Admin Screen</Text>
      <Button title="Ir a Home" onPress={() => router.replace('/(tabs)/home')} />
    </View>
  );
}