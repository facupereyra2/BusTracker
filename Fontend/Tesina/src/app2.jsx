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
  const hideNavbarRoutes = ["/login", "/register"];
  const showNavbar = !hideNavbarRoutes.some(route => location.pathname.startsWith(route));


  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<ProtectedRoutes><Home /></ProtectedRoutes>} />
        <Route path="/time" element={<ProtectedRoutes><Time /></ProtectedRoutes>} />
        <Route path="/location" element={<ProtectedRoutes><Location /></ProtectedRoutes>} />
        <Route path="/profile" element={<ProtectedRoutes><Profile /></ProtectedRoutes>} />
        <Route path="/admin" element={<ProtectedRoutes><Admin /></ProtectedRoutes>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
