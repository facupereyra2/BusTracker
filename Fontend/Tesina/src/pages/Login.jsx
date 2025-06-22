import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Heading, useToast } from "@chakra-ui/react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const ADMIN_UID = "L9uuCQy1rNh03uFnfCaWt8zyubm2"; // Reemplazá con el UID del administrador

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.uid === ADMIN_UID) {
        toast({
          title: "Bienvenido, Administrador",
          description: "Has iniciado sesión como administrador.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        navigate("/admin"); // Redirige a la página de administración
      } else {
        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        navigate("/home"); // Redirige al Home normal
      }
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
        <Heading mb={6} textAlign="center" color="white">Iniciar Sesión</Heading>
        
        <FormControl id="email" mb={4}>
          <FormLabel color="gray.300">Email</FormLabel>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" size="lg" bg="gray.700" color="white" />
        </FormControl>

        <FormControl id="password" mb={6}>
          <FormLabel color="gray.300">Contraseña</FormLabel>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" size="lg" bg="gray.700" color="white" />
        </FormControl>

        <Button bg="brand.blue" size="lg" width="full" color='white' isLoading={loading} loadingText="Iniciando..." onClick={handleLogin}>
          Iniciar sesión
        </Button>

        <Button mt={4} bg="brand.orange" size="lg" color='white' width="full" onClick={() => navigate("/register")}>
          Crear cuenta
        </Button>
      </Box>
    </Box>
  );
};

export default Login;
