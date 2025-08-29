import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CARD_HEIGHT = 150;
const CARD_RADIUS = 16;
const SPACING = 12;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>¿Qué desea hacer?</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#3B82F6' }]}
          onPress={() => router.push('/time')}
          onLongPress={() => {
            Alert.alert("Navegando con navigate (replace)");
            router.navigate('/time');
          }}
          activeOpacity={0.85}
        >
          <FontAwesome5 name="clock" size={40} color="#fff" style={{ marginBottom: 10 }} />
          <Text style={styles.cardText}>Calcular tiempo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#F35E3E' }]}
          onPress={() => router.push('/location')}
          onLongPress={() => {
            Alert.alert("Navegando con navigate (replace)");
            router.navigate('/location');
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={48} color="#fff" style={{ marginBottom: 10 }} />
          <Text style={styles.cardText}>Compartir ubicación</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - SPACING * 3) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heading: {
    color: '#fff',
    marginTop: 48,
    marginBottom: 32,
    fontWeight: 'bold',
    fontSize: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    flex: 1,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginBottom: 0,
    elevation: 2,
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});