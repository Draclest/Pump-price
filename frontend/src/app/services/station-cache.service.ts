import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { StationService } from './station.service';
import { Station } from '../models/station.model';

interface CacheEntry {
  lat: number;
  lon: number;
  stations: Station[];
  fetchedAt: number;
}

const CACHE_TTL_MS         = 5 * 60 * 1000;  // 5 min
const FETCH_RADIUS_KM      = 100;             // fetch wide, filter narrow client-side
const REFETCH_THRESHOLD_KM = 5;              // re-fetch only if user moved > 5 km

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable({ providedIn: 'root' })
export class StationCacheService {
  private stationService = inject(StationService);
  private cache: CacheEntry | null = null;

  /**
   * Fetch stations from the backend geo-search endpoint.
   * Results are cached per position and re-used if the user
   * hasn't moved more than REFETCH_THRESHOLD_KM within TTL.
   */
  getStations(lat: number, lon: number): Observable<Station[]> {
    const now = Date.now();

    if (this.cache) {
      const moved = haversineKm(lat, lon, this.cache.lat, this.cache.lon);
      const fresh = now - this.cache.fetchedAt < CACHE_TTL_MS;
      if (fresh && moved < REFETCH_THRESHOLD_KM) {
        return of(this.cache.stations);
      }
    }

    return this.stationService
      .searchStations({ lat, lon, radius_km: FETCH_RADIUS_KM, limit: 500 })
      .pipe(
        tap(stations => {
          this.cache = { lat, lon, stations, fetchedAt: Date.now() };
        })
      );
  }

  invalidate(): void {
    this.cache = null;
  }

  /**
   * Filter cached stations client-side by radius, fuel type, and price.
   * Distance is already computed by the backend but we re-apply the
   * user-selected radius for responsive filter changes without a round-trip.
   */
  filterStations(
    stations: Station[],
    lat: number,
    lon: number,
    radiusKm: number,
    fuelType?: string,
    maxPrice?: number | null,
  ): Station[] {
    const radiusM = radiusKm * 1000;

    const distanceM = new Map<string, number>(
      stations.map(s => [
        s.id,
        haversineKm(lat, lon, s.location.lat, s.location.lon) * 1000,
      ])
    );

    return stations
      .filter(s => distanceM.get(s.id)! <= radiusM)
      .filter(s => !fuelType || s.fuels.some(f => f.type === fuelType))
      .filter(s =>
        !fuelType || maxPrice == null ||
        s.fuels.some(f => f.type === fuelType && f.price <= maxPrice)
      )
      .sort((a, b) => distanceM.get(a.id)! - distanceM.get(b.id)!)
      .map(s => ({ ...s, distance_meters: distanceM.get(s.id) }));
  }
}
