import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../../theme';
import type { RouteMapProps } from './types';

export function RouteMap({ origin, destination, pickup, delivery }: RouteMapProps) {
  const map = useRef<MapView>(null);
  const fit = () => map.current?.fitToCoordinates([pickup, delivery], { edgePadding: { top: 80, right: 30, bottom: 30, left: 30 }, animated: false });
  return <MapView ref={map} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} onMapReady={fit} onLayout={fit} initialRegion={{ latitude: (pickup.latitude + delivery.latitude) / 2, longitude: (pickup.longitude + delivery.longitude) / 2, latitudeDelta: Math.abs(delivery.latitude - pickup.latitude) + 1, longitudeDelta: Math.abs(delivery.longitude - pickup.longitude) + 1 }} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}>
    <Marker coordinate={pickup} title="Pickup area" description={origin} pinColor={colors.green} />
    <Marker coordinate={delivery} title="Delivery area" description={destination} pinColor={colors.orange} />
  </MapView>;
}
