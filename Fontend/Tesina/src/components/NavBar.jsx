import React from 'react';
import { Link } from 'react-router-dom';
import { Box, IconButton, Flex } from '@chakra-ui/react';
import { IoHome, IoTime, IoLocationSharp } from "react-icons/io5";
import { FaCircleUser } from "react-icons/fa6";
import { GoHomeFill } from "react-icons/go";

const navbarStyles = {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    bg: '#F8EDED',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '10px 0',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    borderRadius: '30px',
};

const iconButtonStyles = {
  color: 'brand.bg',
  fontSize: '35px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const Navbar = () => {
  return (
    <Box sx={navbarStyles}>
      <Link to="/home">
        <IconButton
          icon={<GoHomeFill />}
          variant="ghost"
          aria-label="Home"
          sx={iconButtonStyles}
        />
      </Link>
      <Link to="/time">
        <IconButton
          icon={<IoTime />}
          variant="ghost"
          aria-label="Time"
          sx={iconButtonStyles}
        />
      </Link>
      <Link to="/profile">
        <IconButton
          icon={<FaCircleUser />}
          variant="ghost"
          aria-label="Location"
          sx={iconButtonStyles}
        />
      </Link>
    </Box>
  );
};

export default Navbar;
