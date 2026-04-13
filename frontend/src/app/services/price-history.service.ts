import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FUEL_LABELS } from '../models/station.model';
import { environment } from '../../environments/environment';

export interface PriceRecord {
  fuel_type:   string;
  price:       number;
  recorded_at: string;
}

export interface FuelHistory {
  type:    string;
  label:   string;
  records: PriceRecord[];
  min:     number;
  max:     number;
  latest:  number;
  trend:   'up' | 'down' | 'stable';
}

@Injectable({ providedIn: 'root' })
export class PriceHistoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Fetch and aggregate price history for all fuel types of a station. */
  getHistory(stationId: string, fuelTypes: string[]): Observable<FuelHistory[]> {
    if (fuelTypes.length === 0) return of([]);

    const requests = fuelTypes.map(fuel =>
      this.http
        .get<PriceRecord[]>(`${this.apiUrl}/stations/${stationId}/history/${fuel}`)
        .pipe(
          map(records => ({ fuel, records })),
          catchError(() => of({ fuel, records: [] as PriceRecord[] })),
        )
    );

    return forkJoin(requests).pipe(
      map(results =>
        results
          .filter(r => r.records.length > 0)
          .map(r => this._buildFuelHistory(r.fuel, r.records))
          .sort((a, b) => a.type.localeCompare(b.type))
      )
    );
  }

  private _buildFuelHistory(fuel: string, records: PriceRecord[]): FuelHistory {
    const prices = records.map(r => r.price);
    const latest = prices[prices.length - 1];
    const prev   = prices.length >= 2 ? prices[prices.length - 2] : latest;
    const diff   = latest - prev;
    const trend: FuelHistory['trend'] =
      Math.abs(diff) < 0.002 ? 'stable' : diff > 0 ? 'up' : 'down';

    return {
      type:    fuel,
      label:   FUEL_LABELS[fuel] ?? fuel,
      records,
      min:     Math.min(...prices),
      max:     Math.max(...prices),
      latest,
      trend,
    };
  }
}
