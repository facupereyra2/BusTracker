import { createContext, useContext, useState } from "react";

const LocationTrackingContext = createContext();

export function LocationProvider({ children }) {
  const [isTracking, setIsTracking] = useState(false);
  return (
    <LocationTrackingContext.Provider value={{ isTracking, setIsTracking }}>
      {children}
    </LocationTrackingContext.Provider>
  );
}

export const useLocationTracking = () => useContext(LocationTrackingContext);