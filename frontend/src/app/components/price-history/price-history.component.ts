import { Component, Input, Output, EventEmitter, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Station, FUEL_LABELS } from '../../models/station.model';
import { environment } from '../../../environments/environment';

interface PriceRecord {
  fuel_type: string;
  price: number;
  recorded_at: string;
}

interface FuelHistory {
  type: string;
  label: string;
  records: PriceRecord[];
  min: number;
  max: number;
  latest: number;
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-price-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" aria-hidden="true"></div>

    <div class="modal" role="dialog" aria-modal="true"
         [attr.aria-label]="'Historique des prix — ' + (station.name || station.brand || 'Station')">

      <div class="modal-handle"></div>

      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-wrap">
          <div class="modal-station-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="modal-title-text">
            <h2 class="modal-name">{{ station.name || station.brand || 'Station' }}</h2>
            <p class="modal-address">{{ station.address }}, {{ station.city }}</p>
          </div>
        </div>
        <button class="modal-close" (click)="close.emit()" aria-label="Fermer l'historique">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">

        <!-- Loading skeleton -->
        <ng-container *ngIf="loading">
          <div class="skeleton-history" *ngFor="let i of [1,2]">
            <div class="sk-row">
              <div class="sk-label"></div>
              <div class="sk-range"></div>
            </div>
            <div class="sk-chart"></div>
          </div>
        </ng-container>

        <!-- Error -->
        <div class="state-card state-card--error" *ngIf="!loading && error" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Erreur de chargement</strong>
            <p>{{ error }}</p>
          </div>
        </div>

        <!-- Empty state -->
        <div class="state-card" *ngIf="!loading && !error && fuelHistories.length === 0">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
               style="color: var(--color-text-muted)" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <div>
            <strong>Pas encore de données</strong>
            <p>L'historique s'accumule au fil des ingestions quotidiennes.</p>
          </div>
        </div>

        <!-- Fuel histories -->
        <div *ngFor="let fh of fuelHistories" class="fuel-section">

          <div class="fuel-section-header">
            <div class="fsh-left">
              <span class="fsh-label">{{ fh.label }}</span>
              <span class="fsh-trend" [class]="'fsh-trend--' + fh.trend" [attr.aria-label]="trendLabel(fh.trend)">
                <svg *ngIf="fh.trend === 'up'" width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                <svg *ngIf="fh.trend === 'down'" width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <svg *ngIf="fh.trend === 'stable'" width="11" height="11" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
            </div>
            <div class="fsh-right">
              <span class="fsh-current">{{ fh.latest.toFixed(3) }} €/L</span>
              <span class="fsh-range">{{ fh.min.toFixed(3) }} – {{ fh.max.toFixed(3) }} €</span>
            </div>
          </div>

          <!-- Bar chart -->
          <div class="chart-wrap" role="img" [attr.aria-label]="chartAriaLabel(fh)">
            <div class="chart-y-axis">
              <span>{{ fh.max.toFixed(2) }}</span>
              <span>{{ midPrice(fh).toFixed(2) }}</span>
              <span>{{ fh.min.toFixed(2) }}</span>
            </div>

            <div class="chart-bars">
              <div class="chart-grid">
                <div class="grid-line"></div>
                <div class="grid-line"></div>
                <div class="grid-line"></div>
              </div>

              <div
                *ngFor="let r of fh.records; let last = last"
                class="bar-col"
                [class.bar-col--latest]="last"
                [title]="r.price.toFixed(3) + ' € — ' + formatDate(r.recorded_at)"
              >
                <div
                  class="bar"
                  [class.bar--latest]="last"
                  [style.height.%]="barHeight(r.price, fh.min, fh.max)"
                ></div>
                <span class="bar-label">{{ formatShortDate(r.recorded_at) }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 1000;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .modal {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      z-index: 1001;
      animation: modal-up 0.28s cubic-bezier(0.34, 1.3, 0.64, 1);
    }

    @keyframes modal-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    .modal-handle {
      width: 36px;
      height: 4px;
      background: var(--color-border);
      border-radius: var(--radius-pill);
      margin: 10px auto 0;
      flex-shrink: 0;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
      gap: var(--space-2);
    }

    .modal-title-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      overflow: hidden;
    }

    .modal-station-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--color-primary-light);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .modal-title-text {
      overflow: hidden;
    }

    .modal-name {
      font-size: var(--font-size-md);
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }

    .modal-address {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: none;
      background: var(--color-bg);
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .modal-close:active { background: var(--color-border); }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    /* Skeleton */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-history {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .sk-row {
      display: flex;
      justify-content: space-between;
    }

    .sk-label,
    .sk-range,
    .sk-chart {
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .sk-label { height: 14px; width: 60px; }
    .sk-range  { height: 14px; width: 110px; }
    .sk-chart  { height: 90px; margin-top: var(--space-1); }

    /* State cards */
    .state-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-4);
      text-align: center;
      color: var(--color-text-muted);
    }

    .state-card strong {
      display: block;
      font-size: var(--font-size-md);
      color: var(--color-text-secondary);
      margin-bottom: 4px;
    }

    .state-card p {
      margin: 0;
      font-size: var(--font-size-sm);
      line-height: 1.5;
    }

    .state-card--error {
      flex-direction: row;
      align-items: flex-start;
      text-align: left;
      color: var(--color-error);
      background: var(--color-error-bg);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      gap: var(--space-3);
    }

    .state-card--error strong { color: var(--color-error); }

    /* Fuel section */
    .fuel-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .fuel-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .fsh-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .fsh-label {
      font-size: var(--font-size-md);
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.2px;
    }

    .fsh-trend {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fsh-trend--up     { background: #fef2f2; color: #ef4444; }
    .fsh-trend--down   { background: var(--color-primary-light); color: var(--color-primary); }
    .fsh-trend--stable { background: var(--color-bg); color: var(--color-text-muted); }

    .fsh-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
    }

    .fsh-current {
      font-size: var(--font-size-md);
      font-weight: 800;
      color: var(--color-primary-dark);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.5px;
    }

    .fsh-range {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    /* Chart */
    .chart-wrap {
      display: flex;
      gap: var(--space-2);
      height: 104px;
    }

    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 18px;
      flex-shrink: 0;
    }

    .chart-y-axis span {
      font-size: 9px;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .chart-bars {
      flex: 1;
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: 3px;
      overflow-x: auto;
      padding-bottom: 18px;
    }

    .chart-grid {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }

    .grid-line {
      width: 100%;
      height: 1px;
      background: var(--color-border-subtle);
    }

    .bar-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
      width: 20px;
      height: 100%;
      gap: 3px;
    }

    .bar {
      width: 12px;
      background: var(--color-primary-muted);
      border-radius: 3px 3px 0 0;
      min-height: 3px;
      flex-shrink: 0;
    }

    .bar--latest {
      background: var(--color-primary);
    }

    .bar-col--latest .bar-label {
      color: var(--color-primary);
      font-weight: 700;
    }

    .bar-label {
      font-size: 8px;
      color: var(--color-text-muted);
      white-space: nowrap;
      text-align: center;
      line-height: 1;
      height: 14px;
    }
  `]
})
export class PriceHistoryComponent implements OnInit {
  @Input() station!: Station;
  @Output() close = new EventEmitter<void>();

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  loading = true;
  error: string | null = null;
  fuelHistories: FuelHistory[] = [];

  ngOnInit(): void {
    const fuelTypes = this.station.fuels.map(f => f.type);
    if (fuelTypes.length === 0) {
      this.loading = false;
      return;
    }

    const requests = fuelTypes.map(fuel =>
      this.http.get<PriceRecord[]>(
        `${environment.apiUrl}/stations/${this.station.id}/history/${fuel}`
      ).pipe(
        map(records => ({ fuel, records })),
        catchError(() => of({ fuel, records: [] as PriceRecord[] })),
      )
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.fuelHistories = results
            .filter(r => r.records.length > 0)
            .map(r => {
              const prices  = r.records.map(rec => rec.price);
              const latest  = prices[prices.length - 1];
              const prev    = prices.length >= 2 ? prices[prices.length - 2] : latest;
              const diff    = latest - prev;
              const trend: FuelHistory['trend'] =
                Math.abs(diff) < 0.002 ? 'stable' : diff > 0 ? 'up' : 'down';
              return {
                type: r.fuel,
                label: FUEL_LABELS[r.fuel] || r.fuel,
                records: r.records,
                min: Math.min(...prices),
                max: Math.max(...prices),
                latest,
                trend,
              };
            })
            .sort((a, b) => a.type.localeCompare(b.type));
          this.loading = false;
        },
        error: () => {
          this.error = 'Impossible de charger l\'historique. Veuillez réessayer.';
          this.loading = false;
        },
      });
  }

  barHeight(price: number, min: number, max: number): number {
    if (max === min) return 60;
    return 10 + ((price - min) / (max - min)) * 90;
  }

  midPrice(fh: FuelHistory): number {
    return (fh.min + fh.max) / 2;
  }

  trendLabel(trend: FuelHistory['trend']): string {
    return trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable';
  }

  chartAriaLabel(fh: FuelHistory): string {
    return `Historique ${fh.label} : de ${fh.min.toFixed(3)} € à ${fh.max.toFixed(3)} €, actuellement ${fh.latest.toFixed(3)} €`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit'
    });
  }
}
