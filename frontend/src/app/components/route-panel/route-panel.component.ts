import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeocodingService } from '../../services/geocoding.service';

export interface RouteRequest {
  origin: string;
  originLat?: number;
  originLon?: number;
  destination: string;
  destLat?: number;
  destLon?: number;
  maxDetourKm: number;
}

@Component({
  selector: 'app-route-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="route-panel">
      <!-- Origin -->
      <div class="route-field">
        <div class="route-input-wrap">
          <svg class="route-icon route-icon--origin" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <input
            class="route-input"
            type="text"
            placeholder="Point de départ"
            [(ngModel)]="originText"
            (ngModelChange)="originGeocoded.set(null)"
            (keydown.enter)="geocodeOrigin()"
            aria-label="Point de départ"
          />
          <div class="spinner" *ngIf="geocodingOrigin()" aria-hidden="true"></div>
        </div>
        <div class="geocode-badge" *ngIf="originGeocoded()">
          <span>📍 {{ originGeocoded()!.label }}</span>
        </div>
      </div>

      <!-- Swap button -->
      <div class="swap-row">
        <button class="swap-btn" (click)="swapFields()" type="button" aria-label="Inverser départ et destination">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
      </div>

      <!-- Destination -->
      <div class="route-field">
        <div class="route-input-wrap">
          <svg class="route-icon route-icon--dest" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          <input
            class="route-input"
            type="text"
            placeholder="Destination"
            [(ngModel)]="destText"
            (ngModelChange)="destGeocoded.set(null)"
            (keydown.enter)="geocodeDest()"
            aria-label="Destination"
          />
          <div class="spinner" *ngIf="geocodingDest()" aria-hidden="true"></div>
        </div>
        <div class="geocode-badge" *ngIf="destGeocoded()">
          <span>📍 {{ destGeocoded()!.label }}</span>
        </div>
      </div>

      <!-- Detour slider -->
      <div class="detour-row">
        <label class="detour-label" for="detour-slider">
          Détour max : <strong>{{ maxDetourKm }}km</strong>
        </label>
        <input
          id="detour-slider"
          class="detour-slider"
          type="range"
          min="1"
          max="20"
          step="1"
          [(ngModel)]="maxDetourKm"
          aria-label="Détour maximum en kilomètres"
        />
      </div>

      <!-- Actions -->
      <div class="route-actions">
        <button
          class="btn-route"
          [disabled]="!originText || !destText"
          (click)="submit()"
          type="button"
        >
          Calculer l'itinéraire
        </button>
        <button
          class="btn-clear"
          *ngIf="isActive()"
          (click)="clear()"
          type="button"
        >
          Effacer
        </button>
      </div>
    </div>
  `,
  styles: [`
    .route-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .route-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .route-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .route-icon {
      position: absolute;
      left: 10px;
      flex-shrink: 0;
      pointer-events: none;
    }

    .route-icon--origin { color: #16a34a; }
    .route-icon--dest   { color: #dc2626; }

    .route-input {
      width: 100%;
      padding: 9px 36px 9px 34px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--color-text-primary);
      background: var(--color-bg);
      outline: none;
      box-sizing: border-box;
      transition: border-color var(--transition-fast);
    }
    .route-input:focus {
      border-color: var(--color-primary);
    }
    .route-input::placeholder {
      color: var(--color-text-muted);
    }

    .spinner {
      position: absolute;
      right: 10px;
      width: 14px;
      height: 14px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .geocode-badge {
      font-size: 11px;
      color: #15803d;
      background: #dcfce7;
      border-radius: var(--radius-sm);
      padding: 3px 8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .swap-row {
      display: flex;
      justify-content: flex-end;
      margin: -4px 0;
    }

    .swap-btn {
      background: var(--color-bg);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      width: 32px;
      height: 32px;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .swap-btn:active { transform: scale(0.9); }

    .detour-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: var(--space-1);
    }

    .detour-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }

    .detour-slider {
      width: 100%;
      accent-color: var(--color-primary);
    }

    .route-actions {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-1);
      align-items: center;
    }

    .btn-route {
      flex: 1;
      padding: 10px;
      background: var(--color-primary);
      color: var(--color-text-on-primary);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn-route:disabled {
      background: var(--color-text-muted);
      cursor: not-allowed;
    }
    .btn-route:not(:disabled):active { background: var(--color-primary-dark); }

    .btn-clear {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      cursor: pointer;
      text-decoration: underline;
      padding: 4px 0;
    }
  `]
})
export class RoutePanelComponent {
  @Output() routeRequested = new EventEmitter<RouteRequest>();
  @Output() routeCleared = new EventEmitter<void>();

  private geocodingService = inject(GeocodingService);

  originText = '';
  destText = '';
  maxDetourKm = 5;

  originGeocoded = signal<{ label: string; lat: number; lon: number } | null>(null);
  destGeocoded   = signal<{ label: string; lat: number; lon: number } | null>(null);
  geocodingOrigin = signal(false);
  geocodingDest   = signal(false);

  private _routeActive = signal(false);
  isActive = this._routeActive.asReadonly();

  geocodeOrigin(): void {
    if (!this.originText.trim()) return;
    this.geocodingOrigin.set(true);
    this.geocodingService.search(this.originText).subscribe({
      next: (results) => {
        this.geocodingOrigin.set(false);
        if (results.length > 0) this.originGeocoded.set(results[0]);
      },
      error: () => this.geocodingOrigin.set(false),
    });
  }

  geocodeDest(): void {
    if (!this.destText.trim()) return;
    this.geocodingDest.set(true);
    this.geocodingService.search(this.destText).subscribe({
      next: (results) => {
        this.geocodingDest.set(false);
        if (results.length > 0) this.destGeocoded.set(results[0]);
      },
      error: () => this.geocodingDest.set(false),
    });
  }

  swapFields(): void {
    [this.originText, this.destText] = [this.destText, this.originText];
    const origGeo = this.originGeocoded();
    this.originGeocoded.set(this.destGeocoded());
    this.destGeocoded.set(origGeo);
  }

  submit(): void {
    if (!this.originText || !this.destText) return;
    const orig = this.originGeocoded();
    const dest = this.destGeocoded();
    // If not yet geocoded, trigger geocoding then emit
    if (!orig) {
      this.geocodingOrigin.set(true);
      this.geocodingService.search(this.originText).subscribe({
        next: (res) => {
          this.geocodingOrigin.set(false);
          if (res.length > 0) {
            this.originGeocoded.set(res[0]);
            this._tryEmit();
          }
        },
        error: () => this.geocodingOrigin.set(false),
      });
      return;
    }
    if (!dest) {
      this.geocodingDest.set(true);
      this.geocodingService.search(this.destText).subscribe({
        next: (res) => {
          this.geocodingDest.set(false);
          if (res.length > 0) {
            this.destGeocoded.set(res[0]);
            this._tryEmit();
          }
        },
        error: () => this.geocodingDest.set(false),
      });
      return;
    }
    this._tryEmit();
  }

  private _tryEmit(): void {
    const orig = this.originGeocoded();
    const dest = this.destGeocoded();
    if (!orig || !dest) return;
    this._routeActive.set(true);
    this.routeRequested.emit({
      origin: this.originText,
      originLat: orig.lat,
      originLon: orig.lon,
      destination: this.destText,
      destLat: dest.lat,
      destLon: dest.lon,
      maxDetourKm: this.maxDetourKm,
    });
  }

  clear(): void {
    this.originText = '';
    this.destText = '';
    this.originGeocoded.set(null);
    this.destGeocoded.set(null);
    this._routeActive.set(false);
    this.routeCleared.emit();
  }
}
