import { router } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { app } from "../constants/firebaseConfig";
import { COLORS } from '../styles/theme';

const ADMIN_UID = "L9uuCQy1rNh03uFnfCaWt8zyubm2";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const auth = getAuth(app);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.uid === ADMIN_UID) {
        router.replace("/admin");
      } else {
        router.replace("/home");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.card}>
        <Text style={styles.heading}>Iniciar Sesión</Text>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          placeholderTextColor={COLORS.textSecondary}
        />
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          placeholderTextColor={COLORS.textSecondary}
        />
        <TouchableOpacity
          style={[styles.button, loading ? styles.buttonDisabled : styles.buttonEnabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.push("/register")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  heading: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 2,
    alignSelf: "flex-start",
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.white,
    color: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    fontSize: 16,
    marginBottom: 12,
    width: "100%",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonEnabled: {
    backgroundColor: COLORS.orange,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  buttonSecondary: {
    backgroundColor: COLORS.blue,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "bold",
  },
});

export default LoginScreen;