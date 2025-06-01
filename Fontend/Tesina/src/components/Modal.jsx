import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button
} from '@chakra-ui/react';

const Modal = ({ isOpen, onClose, title, children, buttonText }) => (
  <Drawer
  isOpen={isOpen}
  placement="bottom"
  onClose={onClose}
  size="md" // tamaño mediano o ajustá a lo que quieras
  motionPreset="slideInBottom"
>
  <DrawerOverlay />
  <DrawerContent
    borderTopLeftRadius="16px"
    borderTopRightRadius="16px"
    maxHeight="70vh" // limita altura, para que no ocupe toda la pantalla
    margin="0 auto 0 auto" // para que quede pegado abajo
  >
    <DrawerHeader borderBottomWidth="1px" textAlign="center">
      {title}
    </DrawerHeader>
    <DrawerBody overflowY="auto" p={4}>
      {children}
    </DrawerBody>
    <DrawerFooter borderTopWidth="1px">
      <Button w="full" colorScheme="blue" onClick={onClose}>
        {buttonText || 'Cerrar'}
      </Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>

);

export default Modal;
