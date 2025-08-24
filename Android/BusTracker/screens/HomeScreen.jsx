import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Box, HStack, Heading, Icon, Pressable, Text, VStack } from 'native-base';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Box flex={1} bg="#212121" alignItems="center" justifyContent="center" px={4}>
      <Heading color="#fff" mt={12} mb={8} fontWeight="bold" fontSize="2xl">
        ¿Qué desea hacer?
      </Heading>
      <HStack space={6} w="100%" justifyContent="center">
        <Pressable
          flex={1}
          bg="#3B82F6"
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          h={150}
          mx={1}
          onPress={() => router.push('/time')}
        >
          <VStack space={3} alignItems="center">
            <Icon as={FontAwesome5} name="clock" size="2xl" color="#fff" />
            <Text color="#fff" fontSize="lg" fontWeight="bold">
              Calcular tiempo
            </Text>
          </VStack>
        </Pressable>
        <Pressable
          flex={1}
          bg="#F35E3E"
          borderRadius={16}
          alignItems="center"
          justifyContent="center"
          h={150}
          mx={1}
          onPress={() => router.push('/sharelocation')}
        >
          <VStack space={3} alignItems="center">
            <Icon as={Ionicons} name="navigate" size="4xl" color="#fff" />
            <Text color="#fff" fontSize="lg" fontWeight="bold">
              Compartir ubicación
            </Text>
          </VStack>
        </Pressable>
      </HStack>
    </Box>
  );
}