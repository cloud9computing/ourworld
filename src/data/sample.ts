// A made-up couple's places, used for the landing loop and the link preview image. Not anyone's data.
import type { Place } from '../lib/shape/polygon';

const P = (id: number, name: string, lat: number, lon: number, cc: string): Place => ({ id, name, lat, lon, cc, admin: '' });

export const SAMPLE_A: Place[] = [P(1, 'Goa', 15.5, 73.83, 'IN'), P(2, 'Vienna', 48.21, 16.37, 'AT'), P(3, 'Seville', 37.39, -5.99, 'ES'), P(4, 'Portland', 45.52, -122.68, 'US'), P(5, 'Langkawi', 6.35, 99.8, 'MY')];
export const SAMPLE_B: Place[] = [P(1, 'Goa', 15.5, 73.83, 'IN'), P(6, 'Wayanad', 11.69, 76.08, 'IN'), P(7, 'Barcelona', 41.39, 2.17, 'ES'), P(8, 'Yellowstone', 44.46, -110.83, 'US'), P(9, 'Colombo', 6.93, 79.85, 'LK')];
