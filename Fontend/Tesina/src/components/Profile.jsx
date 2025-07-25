import React from "react";
import { Box, Heading, Button, VStack } from "@chakra-ui/react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <Box 
      height="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      bg="brand.bg"
    >
      <VStack spacing={6} bg="gray.800" p={8} borderRadius="lg" boxShadow="lg" width="400px">
        <Heading color="white">Perfil</Heading>
        
        <Button 
          color="white" 
          bg="brand.blue" 
          size="lg" 
          width="full"
          _hover={{ bg: "blue.600" }}
          onClick={() => navigate("/edit-profile")}
        >
          Editar Perfil
        </Button>

        <Button 
          color="white" 
          bg="red.600" 
          size="lg" 
          width="full"
          _hover={{ bg: "red.700" }}
          onClick={handleLogout}
        >
          Cerrar Sesión
        </Button>
      </VStack>
    </Box>
  );
};

export default Profile;
