import React from 'react';
import { Navigate } from 'react-router-dom';  // Importa Navigate para redirigir
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebaseConfig';  // Asegúrate de que importes correctamente tu configuración de Firebase

const ProtectedRoutes = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <p>Cargando...</p>;  // Puedes mostrar un loading mientras se verifica el estado de autenticación
  }

  if (!user) {
    // Si no hay un usuario autenticado, redirige al login
    return <Navigate to="/login" replace />;
  }

  return children;  // Si el usuario está autenticado, renderiza los hijos (la ruta)
};

export default ProtectedRoutes;
