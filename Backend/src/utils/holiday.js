// utils/holidays.js
import axios from 'axios';

export const getHolidays = async (year) => {
  const holidayApiKey = '98Q3lrZB4Ool61ntcraGD4JT2CJROdUv'; // Cambialo si lo necesitás
  const url = `https://calendarific.com/api/v2/holidays?api_key=${holidayApiKey}&country=AR&year=${year}`;

  try {
    const response = await axios.get(url);
    const holidays = response.data.response.holidays;
    return holidays
      .filter(h => h.type.includes('National holiday'))
      .map(h => h.date.iso);
  } catch (error) {
    console.error('Error al obtener feriados:', error.message);
    return [];
  }
};
