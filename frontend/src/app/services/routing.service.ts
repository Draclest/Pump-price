import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Station } from '../models/station.model';
import { environment } from '../../environments/environment';

export interface RouteGeometry {
  coordinates: [number, number][];  // [lon, lat] pairs
  distance_m: number;
  duration_s: number;
}

@Injectable({ providedIn: 'root' })
export class RoutingService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getRouteRecommendations(params: {
    originLat: number;
    originLon: number;
    destLat: number;
    destLon: number;
    fuelType?: string;
    maxPrice?: number | null;
    maxDetourKm: number;
    services?: string[];
  }): Observable<{ route: RouteGeometry; stations: Station[] }> {
    let httpParams = new HttpParams()
      .set('origin_lat', params.originLat.toString())
      .set('origin_lon', params.originLon.toString())
      .set('dest_lat', params.destLat.toString())
      .set('dest_lon', params.destLon.toString())
      .set('max_detour_km', params.maxDetourKm.toString())
      .set('limit', '20');

    if (params.fuelType && params.fuelType !== 'Tous') {
      httpParams = httpParams.set('fuel_type', params.fuelType);
    }
    if (params.maxPrice != null) {
      httpParams = httpParams.set('max_price', params.maxPrice.toString());
    }
    if (params.services && params.services.length > 0) {
      for (const svc of params.services) {
        httpParams = httpParams.append('services', svc);
      }
    }

    return this.http.post<{ route: RouteGeometry; stations: Station[] }>(
      `${this.apiUrl}/stations/route-recommend`,
      null,
      { params: httpParams }
    );
  }

  exportToGoogleMaps(params: {
    originLat: number; originLon: number;
    destLat: number; destLon: number;
    waypointLat: number; waypointLon: number;
  }): string {
    const origin      = `${params.originLat},${params.originLon}`;
    const destination = `${params.destLat},${params.destLon}`;
    const waypoint    = `${params.waypointLat},${params.waypointLon}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoint)}&travelmode=driving`;
  }
}
