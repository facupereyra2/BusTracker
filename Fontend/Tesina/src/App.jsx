import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Time from "./components/Time";
import Location from "./components/Location";
import Navbar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./components/Profile";
import ProtectedRoutes from "./components/protectedRoutes";  // Importar ProtectedRoute correctamente
import Admin from "./pages/Admin";

const AppLayout = () => {
  const location = useLocation();
  const hideNavbarRoutes = ["/login", "/register", " "];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/home" element={<ProtectedRoutes><Home /></ProtectedRoutes>} />  {/* Asegúrate de envolver Home con ProtectedRoute */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/location" element={<Location />} />
        <Route path="/time" element={<Time />} />
        <Route path="/profile" element={<ProtectedRoutes><Profile /></ProtectedRoutes>} />  {/* Asegúrate de envolver Profile con ProtectedRoute */}
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
