import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { app } from "../constants/firebaseConfig";
import { COLORS } from "../styles/theme"; // Ajusta el path si tu archivo se llama diferente

const ProfileScreen = () => {
  const router = useRouter();
  const auth = getAuth(app);
  const user = auth.currentUser;
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace("login");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Perfil</Text>
      <View style={styles.profileBox}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={[styles.label, { marginTop: 16 }]}>UID:</Text>
        <Text style={styles.uid}>{user?.uid}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 32,
  },
  profileBox: {
    backgroundColor: COLORS.inputBg || "#F3F4F6",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 40,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: {
    fontSize: 16,
    color: COLORS.textSecondary || "#6B7280",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  uid: {
    fontSize: 13,
    color: COLORS.textSecondary || "#6B7280",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: COLORS.danger || "#E53935",
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default ProfileScreen;