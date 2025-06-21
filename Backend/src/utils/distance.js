import axios from 'axios';

export const distanceCalc = async (coordA, coordB) => {
  const apiKey = 'AIzaSyCimtoa9B9Bj_Op1IiIST2vseAsVbt5vEQ';
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${coordA}&destinations=${coordB}&key=${apiKey}`;

  const res = await axios.get(url);
  return res.data.rows[0].elements[0].distance.value; // en metros
};