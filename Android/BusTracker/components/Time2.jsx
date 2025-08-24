import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SimpleText = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hola, este es un texto simple.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});

export default SimpleText;