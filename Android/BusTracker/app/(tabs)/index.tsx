import { NativeBaseProvider } from 'native-base';
import React from 'react';
import HomeScreen from '../../screens/HomeScreen';

export default function Index() {
  return (
    <NativeBaseProvider>
      <HomeScreen />
    </NativeBaseProvider>
  );
}