import React from 'react';
import {
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
} from '@chakra-ui/react';

const Modal = ({ title, text, button, isOpen, onClose, showMap }) => {
  return (
    <ChakraModal
      isCentered
      onClose={onClose}
      isOpen={isOpen}
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent
        width="95%"
        maxHeight="80vh"  // Ajusta la altura máxima del modal para que se pueda hacer scroll
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        p={4}
      >
        <ModalHeader>{title}</ModalHeader>

        <div style={{ flex: 1, overflowY: 'auto' }}> 
          {/* Esta área se ajusta según el contenido y se puede hacer scroll si es necesario */}
          {showMap ? (
            <div style={{ height: '300px', backgroundColor: '#ccc' }}>
              {/* Aquí podrías renderizar tu mapa */}
              Mapa aquí
            </div>
          ) : (
            <Text fontSize="18px" textAlign="center">
              {text}
            </Text>
          )}
        </div>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose} width="100%" bg="brand.blue">
            {button}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ChakraModal>
  );
};

export default Modal;
