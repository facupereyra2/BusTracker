import * as TaskManager from 'expo-task-manager';
import { push, ref } from 'firebase/database';
import { db } from '../constants/firebaseConfig'; // ajusta el path según tu estructura

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log('TaskManager error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      await push(ref(db, 'location'), {
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        date: Date.now(),
      });
      console.log('Ubicación guardada:', location.coords);
    }
  }
});