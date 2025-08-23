import { NativeBaseProvider } from 'native-base';
import ShareLocation from '../../components/ShareLocation';

export default function ShareLocationScreen() {
  return (
    <NativeBaseProvider>
      <ShareLocation />
    </NativeBaseProvider>
  );
}