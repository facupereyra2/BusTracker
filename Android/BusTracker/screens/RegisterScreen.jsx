import { router } from "expo-router";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { app } from "../constants/firebaseConfig";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const auth = getAuth(app);
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert(
        "Cuenta creada",
        "Tu cuenta ha sido registrada correctamente.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/home"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Crear Cuenta</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="********"
        />
        <Button title="Registrarse" onPress={handleRegister} disabled={loading} />
        <View style={{ height: 8 }} />
        <Button title="Volver al Login" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff"
  },
  card: {
    width: "90%", maxWidth: 300, padding: 20, borderRadius: 16, backgroundColor: "#f3f4f6"
  },
  heading: {
    fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center"
  },
  input: {
    backgroundColor: "#fff", borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: "#d1d5db", fontSize: 16, marginBottom: 12
  },
});