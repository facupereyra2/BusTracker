import { useNavigation } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import { Box, Button, Heading, Text, VStack, useToast } from "native-base";
import { app } from "../constants/firebaseConfig"; // Ajusta el path según tu estructura

const ProfileScreen = () => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  const toast = useToast();
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      toast.show({ title: "Error", description: error.message, status: "error" });
    }
  };

  return (
    <Box flex={1} alignItems="center" justifyContent="center" bg="white" p={6}>
      <VStack space={5} alignItems="center">
        <Heading size="lg">Perfil</Heading>
        <Box bg="gray.100" p={6} borderRadius="xl" alignItems="center" width="100%">
          <Text fontSize="md" color="gray.600">Email:</Text>
          <Text fontSize="lg" bold color="black">{user?.email}</Text>
          <Text fontSize="md" color="gray.600" mt={4}>UID:</Text>
          <Text fontSize="sm" color="gray.500">{user?.uid}</Text>
        </Box>
        <Button colorScheme="red" onPress={handleLogout} width="100%">
          Cerrar sesión
        </Button>
      </VStack>
    </Box>
  );
};

export default ProfileScreen;