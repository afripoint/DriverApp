import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'DriverApp',
  slug: config.slug ?? 'driverapp',
  plugins: [...(config.plugins ?? []), ['react-native-maps', {
    androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    ...(process.env.GOOGLE_MAPS_IOS_API_KEY ? { iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY } : {}),
  }]],
});
