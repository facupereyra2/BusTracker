import React, { useState, useEffect } from "react";
import { database } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";

const AdminPage = () => {
  const [cities, setCities] = useState([]);
  const [recorridos, setRecorridos] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [newRecorrido, setNewRecorrido] = useState("");

  useEffect(() => {
    fetchCities();
    fetchRecorridos();
  }, []);

  const fetchCities = async () => {
    const citiesSnapshot = await getDocs(collection(database, "Cities"));
    const citiesList = citiesSnapshot.docs.map((doc) => doc.data());
    setCities(citiesList);
  };

  const fetchRecorridos = async () => {
    const recorridosSnapshot = await getDocs(collection(database, "Recorridos"));
    const recorridosList = recorridosSnapshot.docs.map((doc) => doc.data());
    setRecorridos(recorridosList);
  };

  const handleAddCity = async () => {
    if (newCity) {
      await addDoc(collection(database, "Cities"), {
        name: newCity,
        coordinates: { lat: 0, lng: 0 }, // Puedes agregar las coordenadas si las tienes
      });
      setNewCity("");
      fetchCities(); // Refresca la lista de ciudades
    }
  };

  const handleDeleteCity = async (cityId) => {
    await deleteDoc(doc(database, "Cities", cityId));
    fetchCities(); // Refresca la lista de ciudades
  };

  const handleAddRecorrido = async () => {
    if (newRecorrido) {
      await addDoc(collection(database, "Recorridos"), {
        name: newRecorrido,
        cities: [], // Aquí puedes agregar las ciudades en el recorrido
      });
      setNewRecorrido("");
      fetchRecorridos(); // Refresca la lista de recorridos
    }
  };

  const handleDeleteRecorrido = async (recorridoId) => {
    await deleteDoc(doc(database, "Recorridos", recorridoId));
    fetchRecorridos(); // Refresca la lista de recorridos
  };

  return (
    <div>
      <h1>Admin Page</h1>
      <div>
        <h2>Cities</h2>
        <input
          type="text"
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          placeholder="Add new city"
        />
        <button onClick={handleAddCity}>Add City</button>
        <ul>
          {cities.map((city, index) => (
            <li key={index}>
              {city.name}{" "}
              <button onClick={() => handleDeleteCity(city.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Recorridos</h2>
        <input
          type="text"
          value={newRecorrido}
          onChange={(e) => setNewRecorrido(e.target.value)}
          placeholder="Add new recorrido"
        />
        <button onClick={handleAddRecorrido}>Add Recorrido</button>
        <ul>
          {recorridos.map((recorrido, index) => (
            <li key={index}>
              {recorrido.name}{" "}
              <button onClick={() => handleDeleteRecorrido(recorrido.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminPage;
