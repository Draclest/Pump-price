import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent, FilterValues } from './components/filters/filters.component';
import { StationCardComponent } from './components/station-card/station-card.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { StationCacheService } from './services/station-cache.service';
import { GeolocationService } from './services/geolocation.service';
import { Station } from './models/station.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent, FiltersComponent, StationCardComponent,
    AddressSearchComponent, PriceHistoryComponent,
  ],
  template: `
    <div class="app-shell">

      <!-- Header -->
      <header class="app-header">
        <div class="header-inner">
          <div class="header-brand">
            <svg class="brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 22V8l9-4 9 4v14"/>
              <path d="M10 14h4"/>
              <path d="M12 14v4"/>
              <circle cx="18" cy="9" r="1"/>
              <path d="M18 10v5a1 1 0 0 0 2 0v-3l-2-2"/>
            </svg>
            <h1 class="brand-title">Prix à la pompe</h1>
          </div>

          <div class="header-actions">
            <button
              class="btn-icon"
              (click)="filtersOpen.set(true)"
              [class.btn-icon--active]="hasActiveFilters()"
              title="Filtres"
              aria-label="Ouvrir les filtres"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              <span class="filter-dot" *ngIf="hasActiveFilters()"></span>
            </button>

            <button
              class="btn-icon btn-icon--primary"
              (click)="locateUser()"
              [disabled]="locating()"
              title="Me localiser"
              aria-label="Me localiser"
            >
              <svg *ngIf="!locating()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
              </svg>
              <svg *ngIf="locating()" class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </button>
          </div>
        </div>

        <app-address-search (locationSelected)="onAddressSelected($event)"></app-address-search>
      </header>

      <!-- Map -->
      <div class="map-area">
        <app-map
          [stations]="displayedStations()"
          [userLocation]="userLocation()"
          [selectedStation]="selectedStation()"
          [highlightFuel]="filters().fuelType"
          (stationSelected)="onStationSelected($event)"
          (historyRequested)="historyStation.set($event)"
        ></app-map>

        <!-- Active filters chip -->
        <div class="active-filter-chip" *ngIf="userLocation() && !loading()">
          <span class="chip-fuel">{{ filters().fuelType }}</span>
          <span class="chip-sep">·</span>
          <span class="chip-radius">{{ filters().radiusKm }} km</span>
          <span *ngIf="filters().maxPrice" class="chip-sep">·</span>
          <span *ngIf="filters().maxPrice" class="chip-price">≤ {{ filters().maxPrice!.toFixed(2) }} €</span>
        </div>
      </div>

      <!-- Error banner -->
      <div class="error-banner" role="alert" *ngIf="error()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ error() }}
      </div>

      <!-- Bottom sheet -->
      <div class="bottom-sheet" [class.expanded]="sheetExpanded()">
        <div
          class="sheet-handle-wrap"
          (click)="toggleSheet()"
          role="button"
          [attr.aria-expanded]="sheetExpanded()"
          aria-label="Afficher ou masquer la liste des stations"
        >
          <div class="sheet-handle"></div>
        </div>

        <!-- Collapsed summary -->
        <div class="sheet-summary" *ngIf="!sheetExpanded()" (click)="toggleSheet()">
          <ng-container *ngIf="loading()">
            <div class="summary-skeleton"></div>
          </ng-container>
          <ng-container *ngIf="!loading() && !userLocation()">
            <span class="summary-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              Localisez-vous ou entrez une adresse
            </span>
          </ng-container>
          <ng-container *ngIf="!loading() && userLocation() && displayedStations().length === 0">
            <span class="summary-empty">Aucune station trouvée</span>
          </ng-container>
          <ng-container *ngIf="!loading() && displayedStations().length > 0">
            <div class="summary-stats">
              <span class="summary-count">{{ displayedStations().length }} stations</span>
              <span class="summary-sep">•</span>
              <span class="summary-best" *ngIf="bestPrice() !== null">
                Meilleur prix
                <strong>{{ bestPrice()! | number:'1.3-3' }} €/L</strong>
              </span>
            </div>
            <svg class="summary-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </ng-container>
        </div>

        <!-- Expanded list -->
        <div class="station-list" *ngIf="sheetExpanded()">
          <div class="list-header">
            <span *ngIf="loading()" class="list-loading">Chargement…</span>
            <ng-container *ngIf="!loading()">
              <span class="list-count">
                {{ displayedStations().length }} station{{ displayedStations().length !== 1 ? 's' : '' }}
              </span>
              <span class="list-location" *ngIf="locationLabel()">— {{ locationLabel() }}</span>
            </ng-container>
          </div>

          <!-- Skeleton cards while loading -->
          <ng-container *ngIf="loading()">
            <div class="skeleton-card" *ngFor="let i of [1,2,3]">
              <div class="sk-line sk-line--title"></div>
              <div class="sk-line sk-line--sub"></div>
              <div class="sk-badges">
                <div class="sk-badge" *ngFor="let j of [1,2,3]"></div>
              </div>
            </div>
          </ng-container>

          <app-station-card
            *ngFor="let s of displayedStations(); trackBy: trackById"
            [station]="s"
            [selected]="selectedStation()?.id === s.id"
            [highlightFuel]="filters().fuelType"
            (select)="onStationSelected($event)"
            (historyRequested)="historyStation.set($event)"
          ></app-station-card>
        </div>
      </div>

      <!-- Filters drawer -->
      <app-filters
        *ngIf="filtersOpen()"
        [values]="filters()"
        (changed)="onFiltersChanged($event)"
        (closed)="filtersOpen.set(false)"
      ></app-filters>

      <!-- History modal -->
      <app-price-history
        *ngIf="historyStation()"
        [station]="historyStation()!"
        (close)="historyStation.set(null)"
      ></app-price-history>

    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--color-bg);
      overflow: hidden;
    }

    /* ── Header ── */
    .app-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: 10px var(--space-3) var(--space-3);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
      z-index: 10;
    }

    .header-inner {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 7px;
      flex: 1;
      min-width: 0;
    }

    .brand-icon {
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .brand-title {
      font-size: var(--font-size-md);
      font-weight: 800;
      color: var(--color-text-primary);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.3px;
    }

    .header-actions {
      display: flex;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .btn-icon {
      position: relative;
      width: 38px;
      height: 38px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-icon:active { transform: scale(0.93); }
    .btn-icon--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-light);
    }
    .btn-icon--primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-text-on-primary);
    }
    .btn-icon--primary:disabled {
      background: var(--color-text-muted);
      border-color: var(--color-text-muted);
      cursor: not-allowed;
    }
    .btn-icon--primary:not(:disabled):active {
      background: var(--color-primary-dark);
    }

    .filter-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-primary);
      border: 1.5px solid var(--color-surface);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 0.8s linear infinite; }

    /* ── Map ── */
    .map-area {
      flex: 1;
      min-height: 0;
      position: relative;
      z-index: 1;
    }

    .active-filter-chip {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-surface);
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-md);
      padding: 5px 12px;
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--color-text-secondary);
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      z-index: 5;
      pointer-events: none;
    }
    .chip-fuel { color: var(--color-primary); font-weight: 700; }
    .chip-sep { color: var(--color-text-muted); }
    .chip-price { color: var(--color-warning); font-weight: 700; }

    /* ── Error banner ── */
    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-error-bg);
      color: var(--color-error);
      padding: 8px var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: 500;
    }

    /* ── Bottom Sheet ── */
    .bottom-sheet {
      background: var(--color-surface);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      box-shadow: var(--shadow-sheet);
      z-index: 20;
      transition: max-height var(--transition-slow);
      max-height: 64px;
      overflow: hidden;
    }
    .bottom-sheet.expanded {
      max-height: 58vh;
      overflow-y: auto;
    }

    .sheet-handle-wrap {
      display: flex;
      justify-content: center;
      padding: 10px 0 4px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .sheet-handle {
      width: 36px;
      height: 4px;
      background: var(--color-border);
      border-radius: var(--radius-pill);
    }

    .sheet-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px var(--space-4) 14px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      min-height: 36px;
    }

    .summary-skeleton {
      height: 14px;
      width: 180px;
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }

    .summary-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .summary-empty {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .summary-stats {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: var(--font-size-sm);
    }
    .summary-count {
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .summary-sep { color: var(--color-text-muted); }
    .summary-best {
      color: var(--color-text-secondary);
    }
    .summary-best strong {
      color: var(--color-primary);
      font-weight: 700;
    }

    .summary-chevron {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    /* ── Station list ── */
    .station-list {
      padding-bottom: var(--space-4);
    }

    .list-header {
      padding: var(--space-2) var(--space-4) var(--space-1);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .list-count {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .list-location {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .list-loading {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-weight: 500;
    }

    /* ── Skeleton cards ── */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-card {
      margin: 0 var(--space-3) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      box-shadow: var(--shadow-sm);
    }

    .sk-line {
      height: 12px;
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      margin-bottom: 8px;
    }
    .sk-line--title { width: 60%; height: 14px; }
    .sk-line--sub   { width: 80%; }

    .sk-badges {
      display: flex;
      gap: 6px;
      margin-top: var(--space-2);
    }
    .sk-badge {
      width: 52px;
      height: 38px;
      border-radius: var(--radius-md);
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `]
})
export class AppComponent {
  private allStations = signal<Station[]>([]);

  userLocation  = signal<{ lat: number; lon: number } | null>(null);
  locationLabel = signal<string | null>(null);
  selectedStation = signal<Station | null>(null);
  loading     = signal(false);
  locating    = signal(false);
  error       = signal<string | null>(null);
  sheetExpanded = signal(false);
  filters     = signal<FilterValues>({ fuelType: 'SP95' as const, radiusKm: 10, maxPrice: null });
  historyStation = signal<Station | null>(null);
  filtersOpen = signal(false);

  displayedStations = computed(() => {
    const loc = this.userLocation();
    if (!loc || this.allStations().length === 0) return [];
    const f = this.filters();
    return this.cacheService.filterStations(
      this.allStations(), loc.lat, loc.lon, f.radiusKm, f.fuelType || undefined, f.maxPrice,
    );
  });

  bestPrice = computed(() => {
    const fuel = this.filters().fuelType;
    let min = Infinity;
    for (const s of this.displayedStations()) {
      const price = s.fuels.find(f => f.type === fuel)?.price;
      if (price != null && price < min) min = price;
    }
    return min === Infinity ? null : min;
  });

  hasActiveFilters = computed(() => {
    const f = this.filters();
    return f.radiusKm !== 10 || f.maxPrice !== null;
  });

  constructor(
    private cacheService: StationCacheService,
    private geolocationService: GeolocationService,
  ) {}

  trackById(_: number, s: Station): string { return s.id; }

  locateUser(): void {
    this.locating.set(true);
    this.error.set(null);
    this.geolocationService.getCurrentPosition().subscribe({
      next: (pos) => {
        this.locating.set(false);
        this.locationLabel.set(null);
        this.userLocation.set(pos);
        this._fetchStations(pos.lat, pos.lon);
      },
      error: (err) => {
        this.error.set(err.message);
        this.locating.set(false);
      },
    });
  }

  onAddressSelected(event: { lat: number; lon: number; label: string }): void {
    this.locationLabel.set(event.label);
    this.userLocation.set({ lat: event.lat, lon: event.lon });
    this._fetchStations(event.lat, event.lon);
  }

  private _fetchStations(lat: number, lon: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.cacheService.getStations(lat, lon).subscribe({
      next: (stations) => {
        this.allStations.set(stations);
        this.loading.set(false);
        if (stations.length > 0) this.sheetExpanded.set(true);
      },
      error: (err) => {
        this.error.set('Erreur lors de la recherche : ' + err.message);
        this.loading.set(false);
      },
    });
  }

  onFiltersChanged(f: FilterValues): void {
    this.filters.set(f);
  }

  onStationSelected(station: Station | null): void {
    this.selectedStation.set(station);
    if (station) this.sheetExpanded.set(false);
  }

  toggleSheet(): void {
    this.sheetExpanded.update(v => !v);
    if (this.sheetExpanded()) this.selectedStation.set(null);
  }
}
