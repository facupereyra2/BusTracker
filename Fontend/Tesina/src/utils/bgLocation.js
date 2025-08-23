export async function getBackgroundGeolocation() {
  try {
    const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
    return BackgroundGeolocation;
  } catch (error) {
    console.error('Error al cargar background-geolocation:', error);
    return null;
  }
}
