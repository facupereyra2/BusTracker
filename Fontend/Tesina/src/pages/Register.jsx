import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Heading, useToast } from "@chakra-ui/react";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleRegister = async () => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Cuenta creada",
        description: "Tu cuenta ha sido registrada correctamente.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      navigate("/home"); // Redirigir al Home después de registrarse
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="brand.bg">
      <Box maxW="400px" w="full" bg="gray.800" p={8} borderRadius="xl" boxShadow="lg">
        <Heading mb={6} textAlign="center" color="white">Crear Cuenta</Heading>

        <FormControl id="email" mb={4}>
          <FormLabel color="gray.300">Email</FormLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" size="lg" bg="gray.700" color="white" />
        </FormControl>

        <FormControl id="password" mb={6}>
          <FormLabel color="gray.300">Contraseña</FormLabel>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" size="lg" bg="gray.700" color="white" />
        </FormControl>

        <Button colorScheme="green" size="lg" width="full" isLoading={loading} loadingText="Creando cuenta..." onClick={handleRegister}>
          Registrarse
        </Button>

        <Button mt={4} colorScheme="gray" size="lg" width="full" onClick={() => navigate("/login")}>
          Volver al Login
        </Button>
      </Box>
    </Box>
  );
};

export default Register;
