import { router } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { app } from "../constants/firebaseConfig"; // importa tu inicialización de Firebase

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
        Alert.alert("Bienvenido, Administrador");
        router.replace("/admin");
      } else {
        Alert.alert("Bienvenido");
        router.replace("/(tabs)/home"); // o tu tab principal
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  };

   return (
    <View style={commonStyles.container}>
      <View style={commonStyles.card}>
        <Text style={commonStyles.heading}>Iniciar Sesión</Text>
        <Text style={commonStyles.label}>Email</Text>
        <TextInput
          style={commonStyles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          placeholderTextColor="#bdbdbd"
        />
        <Text style={commonStyles.label}>Contraseña</Text>
        <TextInput
          style={commonStyles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          placeholderTextColor="#bdbdbd"
        />
        <TouchableOpacity style={commonStyles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={commonStyles.buttonText}>Iniciar sesión</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[commonStyles.button, commonStyles.buttonSecondary]} onPress={() => router.push("/register")}>
          <Text style={commonStyles.buttonText}>Crear cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default LoginScreen;