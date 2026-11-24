export type Truck = { id: string; type: string; registration: string; available: boolean; matches: boolean };
export type MarketplaceLoad = {
  id: string; origin: string; destination: string; pickupAddress: string; deliveryAddress: string;
  date: string; pickupWindow: string; deliveryTime: string; vehicle: string; cargo: string;
  distance: number; weight: number; requiredTrucks: number; listedPrice: number; minimum: number;
  maximum: number; offers: number; nearMe: boolean; pickupToday: boolean;
};
export type Bid = { loadId: string; truckIds: string[]; offer: number; total: number; submittedAt?: string };
export const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

export function validateBid(load: MarketplaceLoad, trucks: Truck[], selected: string[], amount: number): string | null {
  if (!selected.length) return 'Select at least one matching truck.';
  if (new Set(selected).size !== selected.length || selected.length > load.requiredTrucks) return `Select up to ${load.requiredTrucks} truck${load.requiredTrucks === 1 ? '' : 's'}.`;
  if (selected.some(id => !trucks.some(truck => truck.id === id && truck.available && truck.matches))) return 'Only available matching trucks can be selected.';
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < load.minimum || amount > load.maximum) return `Bid must be within ${naira(load.minimum)} – ${naira(load.maximum)}.`;
  return null;
}

export function createBid(load: MarketplaceLoad, trucks: Truck[], selected: string[], amount: number): Bid {
  const error = validateBid(load, trucks, selected, amount);
  if (error) throw new Error(error);
  return { loadId: load.id, truckIds: [...selected], offer: amount, total: selected.length * amount, submittedAt: new Date().toISOString() };
}

// Local fixtures. Matching flags will come from the fleet/eligibility endpoint.
export const trucks: Truck[] = [
  { id: 'truck-1', type: 'Flatbed', registration: 'KJA-204-A', available: true, matches: true },
  { id: 'truck-2', type: 'Dryvan', registration: 'VXY-498-W', available: true, matches: true },
  { id: 'truck-3', type: 'Reefer', registration: 'LND-306-T', available: false, matches: false },
];

export const marketplaceLoads: MarketplaceLoad[] = Array.from({ length: 18 }, (_, index) => ({
  id: `LAQ-${5400 + index}`, origin: 'Ikeja, Lagos', destination: 'Gwarimpa, Abuja',
  pickupAddress: '24 Obafemi Awolowo Way, Ikeja, Lagos State',
  deliveryAddress: '15 Crescent Avenue, Gwarimpa District, Abuja, FCT',
  date: '01-04-2026', pickupWindow: 'Oct. 25, 08:00am–04:00pm', deliveryTime: 'Oct. 26, 04:30pm',
  vehicle: index % 3 === 2 ? 'Flatbed' : 'Dry van', cargo: 'General goods', distance: 600,
  weight: 1200, requiredTrucks: index % 3 === 2 ? 2 : 1,
  listedPrice: 300000 - (index % 4) * 10000, minimum: 250000, maximum: 320000,
  offers: 5, nearMe: true, pickupToday: index % 3 === 0,
}));
