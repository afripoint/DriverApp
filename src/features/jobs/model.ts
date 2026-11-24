import type { Bid } from '../marketplace/model';
import { marketplaceLoads, trucks as fleetTrucks } from '../marketplace/model';
import type { MapCoordinate } from '../../components/maps/types';
import type { TrackingState } from './DeliveryTracking';

export type JobDetailsData = {
  originCity: string; destinationCity: string; pickupWindow: string; deliveryTime: string;
  distance: number; requiredTrucks: number; submittedAt: string;
  submittedTrucks: { id: string; type: string; registration: string }[];
  pickupCoordinate: MapCoordinate;
  deliveryCoordinate: MapCoordinate;
};

export type JobStatus = 'Bidding' | 'Assigned' | 'In Transit' | 'Completed';
export const jobStatuses: JobStatus[] = ['Bidding', 'Assigned', 'In Transit', 'Completed'];
export type Job = {
  id: string; status: JobStatus; origin: string; destination: string; vehicle: string;
  weight: number; cargo: string; trucks: number; bid: number; minimum: number; maximum: number;
  pickup: string; nearMe: boolean; pickupToday: boolean;
  details?: JobDetailsData;
  demoFunding?: 'Pending' | 'Secured';
  trackingState?: TrackingState;
  deliveredOn?: string;
};

// Screen reference fixtures, pending connection to the driver's jobs endpoint.
export const assignedJobs: Job[] = Array.from({ length: 3 }, (_, index) => ({
  id: `LAQ-${6201 + index}`, status: 'Assigned',
  demoFunding: 'Secured',
  origin: '123 Maple Street, Kaduna, Kaduna State', destination: '456 Sapphire Avenue, Uyo, Akwa Ibom',
  vehicle: 'Dry van', weight: 18000, cargo: 'Agricultural', trucks: 1, bid: 195000,
  minimum: 215000, maximum: 265000, pickup: 'May 10 · 9AM–12PM', nearMe: true, pickupToday: index === 0,
  details: {
    originCity: 'Kaduna, Kaduna State', destinationCity: 'Uyo, Akwa Ibom',
    pickupWindow: 'May 10 · 9AM–12PM', deliveryTime: 'May 11 · 4:30PM',
    distance: 850, requiredTrucks: 1, submittedAt: 'May 8 · 4:30PM',
    pickupCoordinate: { latitude: 10.52, longitude: 7.44 },
    deliveryCoordinate: { latitude: 5.04, longitude: 7.93 },
    submittedTrucks: [{ id: 'truck-2', type: 'Dry van', registration: 'VXY-498-W' }],
  },
}));

export const referenceBiddingJob: Job = {
  id: 'LAQ-5400', status: 'Bidding', origin: '24 Obafemi Awolowo Way, Ikeja, Lagos State',
  destination: '15 Crescent Avenue, Gwarimpa District, Abuja, FCT', vehicle: 'Dry van', weight: 1200,
  cargo: 'General goods', trucks: 5, bid: 300000, minimum: 250000, maximum: 320000,
  pickup: 'Oct. 25, 08:00am–04:00pm', nearMe: true, pickupToday: false,
  details: {
    originCity: 'Ikeja, Lagos', destinationCity: 'Gwarimpa, Abuja', pickupWindow: 'Oct. 25, 08:00am–04:00pm',
    deliveryTime: 'Oct. 26, 04:30pm', distance: 800, requiredTrucks: 5, submittedAt: 'Oct. 26, 04:30pm',
    pickupCoordinate: { latitude: 6.60, longitude: 3.35 },
    deliveryCoordinate: { latitude: 9.11, longitude: 7.40 },
    submittedTrucks: [
      { id: 'reference-1', type: 'Tanker', registration: 'TAN-123-JH' },
      { id: 'reference-2', type: 'Flatbed', registration: 'FLA-891-KT' },
      { id: 'reference-3', type: 'Dry van', registration: 'LAG-234-XY' },
      { id: 'reference-4', type: 'Dry van', registration: 'LAG-234-XY' },
      { id: 'reference-5', type: 'Reefer', registration: 'REE-567-ZW' },
    ],
  },
};

export const inTransitJobs: Job[] = Array.from({ length: 5 }, (_, index) => ({
  ...referenceBiddingJob,
  id: `LAQ-${7101 + index}`,
  status: 'In Transit',
  trackingState: (['normal', 'offline', 'eta', 'deviation', 'range'] as const)[index],
  demoFunding: 'Secured',
  vehicle: 'Dry van', weight: 18000, cargo: 'Agricultural', trucks: 1,
  bid: 180000, minimum: 200000, maximum: 250000,
  details: {
    ...referenceBiddingJob.details!,
    requiredTrucks: 1,
    submittedTrucks: [{ id: 'truck-2', type: 'Dry van', registration: 'VXY-498-W' }],
  },
}));

export const completedJobs: Job[] = inTransitJobs.map((job, index) => ({
  ...job, id: `LAQ-${8101 + index}`, status: 'Completed', bid: 250000, deliveredOn: 'May 12',
  details: { ...job.details!, submittedTrucks: [{ id: 'completed-truck', type: 'Dry van', registration: 'KJA-204-AA' }] },
}));

export function jobsWithProgress(jobs: Job[], progress: Record<string, { started?: boolean; completedAt?: string }>): Job[] {
  return jobs.map(job => {
    const state = progress[job.id];
    if (state?.completedAt) return { ...job, status: 'Completed', deliveredOn: new Date(state.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Africa/Lagos' }) };
    return state?.started ? { ...job, status: 'In Transit' } : job;
  });
}

export function jobsFromBids(bids: Bid[]): Job[] {
  return bids.flatMap(bid => {
    const load = marketplaceLoads.find(item => item.id === bid.loadId);
    return load ? [{ id: load.id, status: 'Bidding' as const, origin: load.pickupAddress,
      destination: load.deliveryAddress, vehicle: load.vehicle, weight: load.weight, cargo: load.cargo,
      trucks: bid.truckIds.length, bid: bid.offer, minimum: load.minimum, maximum: load.maximum,
      pickup: load.pickupWindow, nearMe: load.nearMe, pickupToday: load.pickupToday,
      details: { originCity: load.origin, destinationCity: load.destination, pickupWindow: load.pickupWindow,
        pickupCoordinate: { latitude: 6.60, longitude: 3.35 }, deliveryCoordinate: { latitude: 9.11, longitude: 7.40 },
        deliveryTime: load.deliveryTime, distance: load.distance, requiredTrucks: load.requiredTrucks,
        submittedAt: bid.submittedAt ? new Date(bid.submittedAt).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Not recorded',
        submittedTrucks: bid.truckIds.map(id => { const truck = fleetTrucks.find(item => item.id === id); return { id, type: truck?.type ?? 'Truck', registration: truck?.registration ?? id }; }),
      } }] : [];
  });
}

export function allJobs(bids: Bid[], withdrawnIds: string[]): Job[] {
  const pending = jobsFromBids(bids);
  return [...assignedJobs, ...inTransitJobs, ...completedJobs, ...(!pending.some(job => job.id === referenceBiddingJob.id) ? [referenceBiddingJob] : []), ...pending]
    .filter(job => job.status !== 'Bidding' || !withdrawnIds.includes(job.id));
}

export type JobFilters = { query: string; nearMe: boolean; pickupToday: boolean; dryVan: boolean; bestRate: boolean };
export const initialJobFilters: JobFilters = { query: '', nearMe: true, pickupToday: false, dryVan: false, bestRate: false };
export type JobSort = 'Recommended' | 'Highest bid' | 'Lowest bid';
export function filterJobs(jobs: Job[], status: JobStatus, filters: JobFilters, sort: JobSort): Job[] {
  const query = filters.query.trim().toLowerCase();
  const result = jobs.filter(job => job.status === status && (!filters.nearMe || job.nearMe)
    && (!filters.pickupToday || job.pickupToday) && (!filters.dryVan || job.vehicle === 'Dry van')
    && `${job.id} ${job.origin} ${job.destination}`.toLowerCase().includes(query));
  if (filters.bestRate || sort === 'Highest bid') result.sort((a, b) => b.bid - a.bid);
  else if (sort === 'Lowest bid') result.sort((a, b) => a.bid - b.bid);
  return result;
}
