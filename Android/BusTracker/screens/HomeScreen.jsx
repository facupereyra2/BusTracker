import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../styles/theme'; // <-- tu import global

const CARD_HEIGHT = 220;
const CARD_RADIUS = 18;
const SPACING = 16;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>¿Qué desea hacer?</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: COLORS.blue }]}
          onPress={() => router.push('/time')}
          onLongPress={() => {
            Alert.alert("Navegando con navigate (replace)");
            router.navigate('/time');
          }}
          activeOpacity={0.89}
        >
          <FontAwesome5 name="clock" size={40} color={COLORS.text} style={{ marginBottom: 10 }} />
          <Text style={styles.cardText}>Calcular tiempo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: COLORS.orange }]}
          onPress={() => router.push('/location')}
          onLongPress={() => {
            Alert.alert("Navegando con navigate (replace)");
            router.navigate('/location');
          }}
          activeOpacity={0.89}
        >
          <Ionicons name="navigate" size={48} color={COLORS.text} style={{ marginBottom: 10 }} />
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
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heading: {
    color: COLORS.text,
    marginTop: 48,
    marginBottom: 40,
    fontWeight: 'bold',
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: SPACING,
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
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});