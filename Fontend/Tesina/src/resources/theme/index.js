import { extendTheme } from '@chakra-ui/react'
import * as ReactDOM from 'react-dom/client'
import "@fontsource/roboto";


// 2. Extend the theme to include custom colors, fonts, etc
const colors = {
  brand: {
    blue: '#3652AD',
    orange: '#F35E3E',
    bg:'#212121',
    letters: '#F4F4F4'
  },
}

const font = {
  fonts: {
    heading: "Roboto, sans-serif", // Para títulos
    body: "Roboto, sans-serif", // Para textos normales
  },
};

export const theme = extendTheme({colors,font})