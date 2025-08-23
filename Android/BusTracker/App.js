import { NativeBaseProvider } from 'native-base';
import ShareLocation from './components/ShareLocation';

export default function App() {
  return (
    <NativeBaseProvider>
      <ShareLocation/>
    </NativeBaseProvider>
  );
}