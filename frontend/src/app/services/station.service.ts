import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Station, SearchParams } from '../models/station.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StationService {
  private http    = inject(HttpClient);
  private apiUrl  = environment.apiUrl;

  searchStations(params: SearchParams): Observable<Station[]> {
    let httpParams = new HttpParams()
      .set('lat', params.lat.toString())
      .set('lon', params.lon.toString())
      .set('radius_km', (params.radius_km ?? 10).toString())
      .set('limit',     (params.limit ?? 20).toString());

    if (params.fuel_type) {
      httpParams = httpParams.set('fuel_type', params.fuel_type);
    }
    if (params.max_price != null) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }

    return this.http.get<Station[]>(`${this.apiUrl}/stations/search`, { params: httpParams });
  }

  recommendStations(params: {
    lat: number;
    lon: number;
    radiusKm: number;
    fuelType?: string;
    maxPrice?: number | null;
    services?: string[];
    limit?: number;
  }): Observable<Station[]> {
    let httpParams = new HttpParams()
      .set('lat', params.lat.toString())
      .set('lon', params.lon.toString())
      .set('radius_km', params.radiusKm.toString())
      .set('limit', (params.limit ?? 50).toString());

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

    return this.http.get<Station[]>(`${this.apiUrl}/stations/recommend`, { params: httpParams });
  }

  getStation(id: string): Observable<Station> {
    return this.http.get<Station>(`${this.apiUrl}/stations/${id}`);
  }
}
