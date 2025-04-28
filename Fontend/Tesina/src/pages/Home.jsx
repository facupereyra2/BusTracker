import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardBody, Text, Box, Icon, Heading } from '@chakra-ui/react'
import { IoNavigate } from "react-icons/io5"
import { FaSearch } from "react-icons/fa"
import { FaRegClock } from "react-icons/fa6";
import { Fade, ScaleFade, Slide, SlideFade, Collapse } from '@chakra-ui/react'
import Navbar from '../components/NavBar'

const containerStyles = {
  bg: "brand.bg",
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center', // Centrar el contenido horizontalmente
  justifyContent: "center",
  gap: '16px',
  h: '100vh',
  color: 'brand.letters',
  width: '100vw',
  fontFamily: 'Roboto',
  textAlign: 'center'
};

const containerCardStyles = {
  display: "flex",
  flexDirection: "row",
  alignItems: 'center',
  margin: 'auto',
  gap: '15px'
}

const cardStyles = {
  width: "45vw",
  height: "28vh",
}

const cardBodyStyles = {
  display: 'flex',
  flexDirection: 'column',
  margin: 'auto',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  gap: '10px',
  fontSize: '22px',
}

const Home = () => {
  return (
    <>
      <Box sx={containerStyles}>
        <Heading as='h1' mt="120px"mb="-80px" fontWeight="10" >¿Qué desea hacer?</Heading> {/* Ajuste del margen superior */}
        <Box sx={containerCardStyles}>
          <Link to="/time">
            <Card sx={{ ...cardStyles, bg: "brand.blue", color: "brand.letters" }}>
              <CardBody sx={cardBodyStyles}>
                <Icon as={FaRegClock} boxSize={20} />
                <Text >Calcular tiempo</Text>
              </CardBody>
            </Card>
          </Link>
          <Link to="/location">
            <Card sx={{ ...cardStyles, bg: "brand.orange", color: "brand.letters" }} >
              <CardBody sx={cardBodyStyles}>
                <Icon as={IoNavigate} boxSize={20} />
                <Text>Compartir ubicación</Text>
              </CardBody>
            </Card>
          </Link>
        </Box>
      </Box>
    </>
  )
}

export default Home
