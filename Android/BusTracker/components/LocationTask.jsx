import * as TaskManager from 'expo-task-manager';
import { push, ref } from 'firebase/database';
import { db } from '../../../constants/firebaseConfig';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    // Aquí puedes guardar la ubicación en Firebase
    await push(ref(db, 'location'), {
      location:{
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      date: Date.now(),
    });
  }
});

export { LOCATION_TASK_NAME };

