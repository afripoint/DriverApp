export type MapCoordinate = { latitude: number; longitude: number };
export type RouteMapProps = {
  origin: string;
  destination: string;
  pickup: MapCoordinate;
  delivery: MapCoordinate;
};
