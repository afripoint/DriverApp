/// <reference types="google.maps" />
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import type { RouteMapProps } from './types';

let mapsPromise: Promise<void> | null = null;
const authorizationFailures = new Set<() => void>();
const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadMaps(): Promise<void> {
  if (typeof google !== 'undefined' && google.maps?.Map) return Promise.resolve();
  if (!key) return Promise.reject(new Error('Google Maps key is not configured.'));
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const callback = '__driverAppGoogleMapsReady';
    const callbacks = window as unknown as Record<string, unknown>;
    callbacks.gm_authFailure = () => authorizationFailures.forEach(handler => handler());
    const timer = setTimeout(() => { delete callbacks[callback]; reject(new Error('Google Maps could not load. Check your connection and retry.')); }, 20000);
    callbacks[callback] = () => { clearTimeout(timer); delete callbacks[callback]; resolve(); };
    script.id = 'driverapp-google-maps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key!)}&libraries=places&loading=async&callback=${callback}`;
    script.async = true;
    script.onerror = () => { clearTimeout(timer); delete callbacks[callback]; script.remove(); reject(new Error('Unable to connect to Google Maps.')); };
    document.head.appendChild(script);
  }).catch(error => { mapsPromise = null; throw error; });
  return mapsPromise;
}

export function RouteMap({ origin, destination, pickup, delivery }: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    let markers: google.maps.Marker[] = [];
    let observer: ResizeObserver | undefined;
    let listener: google.maps.MapsEventListener | undefined;
    const authorizationFailed = () => { if (!cancelled) { setLoading(false); setError('Google Maps could not authorize this key. Check API activation, billing, and website restrictions in Google Cloud.'); } };
    authorizationFailures.add(authorizationFailed);
    let pickupLocation = { lat: pickup.latitude, lng: pickup.longitude };
    let deliveryLocation = { lat: delivery.latitude, lng: delivery.longitude };
    const fit = () => {
      if (!map || cancelled) return;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupLocation); bounds.extend(deliveryLocation);
      map.fitBounds(bounds, { top: 80, bottom: 25, left: 25, right: 25 });
    };
    loadMaps().then(async () => {
      if (cancelled || !container.current) return;
      map = new google.maps.Map(container.current, { center: pickupLocation, zoom: 7, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false });
      listener = map.addListener('tilesloaded', () => { if (!cancelled) setLoading(false); });
      markers = [new google.maps.Marker({ map, position: pickupLocation, label: 'A', title: origin }), new google.maps.Marker({ map, position: deliveryLocation, label: 'B', title: destination })];
      fit();
      observer = new ResizeObserver(fit); observer.observe(container.current);
      // Resolve the actual job addresses when Geocoding is enabled; retain area pins otherwise.
      const geocoder = new google.maps.Geocoder();
      const locations = await Promise.allSettled([geocoder.geocode({ address: origin, region: 'NG' }), geocoder.geocode({ address: destination, region: 'NG' })]);
      if (cancelled) return;
      if (locations[0].status === 'fulfilled' && locations[0].value.results[0]) pickupLocation = locations[0].value.results[0].geometry.location.toJSON();
      if (locations[1].status === 'fulfilled' && locations[1].value.results[0]) deliveryLocation = locations[1].value.results[0].geometry.location.toJSON();
      markers[0].setPosition(pickupLocation); markers[1].setPosition(deliveryLocation); fit();
    }).catch(cause => { if (!cancelled) { setLoading(false); setError(cause instanceof Error ? cause.message : 'Google Maps is unavailable.'); } });
    return () => { cancelled = true; authorizationFailures.delete(authorizationFailed); observer?.disconnect(); listener?.remove(); markers.forEach(marker => marker.setMap(null)); if (map) google.maps.event.clearInstanceListeners(map); };
  }, [origin, destination, pickup.latitude, pickup.longitude, delivery.latitude, delivery.longitude]);

  return <View style={StyleSheet.absoluteFill}>
    <div ref={container} aria-label="Interactive Google map for the pickup and delivery route" style={{ width: '100%', height: '100%' }} />
    {loading && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.message}>Loading Google Maps…</Text></View>}
    {!!error && <View style={styles.loading}><Text accessibilityRole="alert" style={styles.message}>{error}</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  loading: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#EEF4F0', padding: 20 },
  message: { color: colors.muted, textAlign: 'center', fontSize: 13 },
});
