import { getDatabase, ref, get } from 'firebase/database';
import app from './firebaseConfig';

const db = getDatabase(app);

export const fetchCities = async () => {
  const citiesRef = ref(db, "Cities");
  const snapshot = await get(citiesRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const fetchRecorridos = async () => {
  const recorridosRef = ref(db, "Recorridos");
  const snapshot = await get(recorridosRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const fetchBusLocation = async (recorridoID, ciudadObjetivo) => {
  const queryParams = new URLSearchParams({
    recorridoID,
    ciudadObjetivo
  });

  const response = await fetch(`https://bustracker-kfkx.onrender.com/distance?${queryParams.toString()}`);
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error inesperado');
  }

  return await response.json();
};