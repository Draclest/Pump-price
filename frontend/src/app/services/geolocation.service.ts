import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Coordinates {
  lat: number;
  lon: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  /** True when the browser will block geolocation (HTTP + non-localhost). */
  readonly isInsecureContext =
    window.location.protocol === 'http:' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  getCurrentPosition(): Observable<Coordinates> {
    return new Observable((observer) => {
      if (this.isInsecureContext) {
        observer.error(new Error(
          'La géolocalisation nécessite HTTPS. ' +
          'Entrez votre adresse manuellement ou accédez au site via HTTPS.'
        ));
        return;
      }

      if (!navigator.geolocation) {
        observer.error(new Error('Géolocalisation non supportée par ce navigateur.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          observer.next({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          observer.complete();
        },
        (err) => {
          const msg = err.code === 1
            ? 'Accès à la position refusé. Autorisez la géolocalisation dans votre navigateur.'
            : 'Impossible d\'obtenir votre position : ' + err.message;
          observer.error(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}
