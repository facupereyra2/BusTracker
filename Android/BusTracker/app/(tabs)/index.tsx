import { NativeBaseProvider } from 'native-base';
import HomeScreen from '../../screens/HomeScreen';

export default function Index() {
  return (
    <NativeBaseProvider>
      <HomeScreen />
    </NativeBaseProvider>
  );
}