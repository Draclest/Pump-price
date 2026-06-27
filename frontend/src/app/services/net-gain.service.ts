/**
 * NetGainService — appelle le moteur de gain net (POST /api/v2/net-gain/search).
 *
 * La réponse renvoie déjà des stations au format complet (enrichies backend) +
 * les champs net-gain (net_gain_eur, verdict, breakdown…), donc les `results`
 * sont directement des `Station` consommables par la carte/liste existantes.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Station, VehicleProfile } from '../models/station.model';
import { RouteGeometry } from './routing.service';
import { environment } from '../../environments/environment';

export type NetGainMode = 'nearby' | 'route' | 'habitual';

export interface NetGainBaseline {
  station_id: string | null;
  fuel: string;
  price: number;
  source: string;
}

export interface NetGainResponse {
  baseline: NetGainBaseline | null;
  fill_liters: number;
  route?: RouteGeometry | null;
  results: Station[];
}

export interface NetGainOptions {
  radiusKm?: number;
  maxDetourMin?: number;
  maxPriceAgeH?: number;
  timeValueEurH?: number;
}

@Injectable({ providedIn: 'root' })
export class NetGainService {
  private readonly http = inject(HttpClient);
  // apiUrl = '/api/v1' → endpoint v2
  private readonly url = `${environment.apiUrl.replace('/v1', '/v2')}/net-gain/search`;

  search(
    mode: NetGainMode,
    vehicle: VehicleProfile,
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number } | null,
    opts: NetGainOptions = {},
  ): Observable<NetGainResponse> {
    const body = {
      mode,
      origin,
      destination: destination ?? undefined,
      radius_km: opts.radiusKm,
      vehicle: {
        fuel: vehicle.fuel,
        consumption_l_100km: vehicle.consumptionL100km,
        tank_capacity_l: vehicle.tankCapacityL,
        current_level_l: vehicle.currentLevelL ?? undefined,
      },
      preferences: {
        max_detour_min: opts.maxDetourMin ?? 10,
        max_price_age_h: opts.maxPriceAgeH ?? 72,
        time_value_eur_h: opts.timeValueEurH ?? 10,
      },
    };
    return this.http.post<NetGainResponse>(this.url, body);
  }
}
