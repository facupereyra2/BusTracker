import { NativeBaseProvider } from 'native-base';
import React from 'react';
import Time from '../../components/Time';

export default function TimeScreen() {
  return (
    <NativeBaseProvider>
      <Time />
    </NativeBaseProvider>
  );
}