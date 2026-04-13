import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api-adresse.data.gouv.fr/search/';

  search(query: string): Observable<AddressSuggestion[]> {
    const params = new HttpParams().set('q', query).set('limit', '5').set('autocomplete', '1');
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map((res) =>
        (res.features ?? []).map((f: any) => ({
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }))
      )
    );
  }

  reverseGeocode(lat: number, lon: number): Observable<AddressSuggestion | null> {
    const params = new HttpParams().set('lat', String(lat)).set('lon', String(lon));
    return this.http.get<any>('https://api-adresse.data.gouv.fr/reverse/', { params }).pipe(
      map((res) => {
        const f = (res.features ?? [])[0];
        if (!f) return null;
        return {
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        };
      })
    );
  }
}
