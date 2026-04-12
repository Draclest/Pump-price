import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface Coordinates {
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getCurrentPosition(): Observable<Coordinates> {
    return new Observable((observer) => {
      if (!navigator.geolocation) {
        observer.error(new Error('Geolocation non supportée par ce navigateur'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          observer.next({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          observer.complete();
        },
        (err) => {
          observer.error(new Error('Impossible d\'obtenir votre position: ' + err.message));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}
