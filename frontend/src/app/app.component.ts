import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { switchMap, of, catchError } from 'rxjs';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent } from './components/filters/filters.component';
import { StationCardComponent } from './components/station-card/station-card.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { StationService } from './services/station.service';
import { GeolocationService } from './services/geolocation.service';
import { FUEL_LABELS, FilterValues, Station } from './models/station.model';

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

      <!-- ── Left Sidebar ── -->
      <aside class="sidebar" [class.sidebar--open]="sidebarOpen()">

        <!-- Sidebar header -->
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <svg class="brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 22V8l9-4 9 4v14"/>
              <path d="M10 14h4"/>
              <path d="M12 14v4"/>
              <circle cx="18" cy="9" r="1"/>
              <path d="M18 10v5a1 1 0 0 0 2 0v-3l-2-2"/>
            </svg>
            <h1 class="brand-title">Pump Price</h1>
          </div>
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
          <!-- Mobile close button -->
          <button
            class="btn-icon sidebar-close-btn"
            (click)="sidebarOpen.set(false)"
            aria-label="Fermer la liste"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Address search -->
        <div class="sidebar-search">
          <app-address-search (locationSelected)="onAddressSelected($event)"></app-address-search>
        </div>

        <!-- Filters inline -->
        <div class="sidebar-filters">
          <div class="sidebar-section-title">Filtres</div>
          <app-filters
            [values]="filters()"
            [drawerMode]="false"
            (changed)="onFiltersChanged($event)"
          ></app-filters>
        </div>

        <!-- Error -->
        <div class="sidebar-error" role="alert" *ngIf="error()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error() }}
        </div>

        <!-- Loading state -->
        <ng-container *ngIf="loading()">
          <div class="sidebar-section-title">Chargement…</div>
          <div class="skeleton-card" *ngFor="let i of [1,2,3]">
            <div class="sk-line sk-line--title"></div>
            <div class="sk-line sk-line--sub"></div>
            <div class="sk-badges">
              <div class="sk-badge" *ngFor="let j of [1,2,3]"></div>
            </div>
          </div>
        </ng-container>

        <!-- Results -->
        <ng-container *ngIf="!loading() && userLocation()">

          <!-- No results -->
          <div class="sidebar-empty" *ngIf="displayedStations().length === 0">
            Aucune station trouvée
          </div>

          <!-- Top 3 -->
          <ng-container *ngIf="top3().length > 0">
            <div class="sidebar-section-title sidebar-section-title--top3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Top 3
            </div>
            <app-station-card
              *ngFor="let s of top3(); trackBy: trackById"
              [station]="s"
              [selected]="selectedStation()?.id === s.id"
              [highlightFuel]="filters().fuelType"
              (select)="onStationSelected($event)"
              (historyRequested)="historyStation.set($event)"
            ></app-station-card>
          </ng-container>

          <!-- Other stations -->
          <ng-container *ngIf="otherStations().length > 0">
            <div class="sidebar-section-title">
              Autres stations
              <span class="section-count">{{ otherStations().length }}</span>
            </div>
            <app-station-card
              *ngFor="let s of otherStations(); trackBy: trackById"
              [station]="s"
              [selected]="selectedStation()?.id === s.id"
              [highlightFuel]="filters().fuelType"
              (select)="onStationSelected($event)"
              (historyRequested)="historyStation.set($event)"
            ></app-station-card>
          </ng-container>

        </ng-container>

        <!-- Pre-location hint -->
        <div class="sidebar-hint" *ngIf="!loading() && !userLocation()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
          </svg>
          <span>Localisez-vous ou entrez une adresse pour voir les stations</span>
        </div>

      </aside>

      <!-- ── Map area ── -->
      <div class="map-area">
        <app-map
          [stations]="displayedStations()"
          [userLocation]="userLocation()"
          [selectedStation]="selectedStation()"
          [highlightFuel]="filters().fuelType"
          [top3Ids]="top3Ids()"
          (stationSelected)="onStationSelected($event)"
          (historyRequested)="historyStation.set($event)"
        ></app-map>

        <!-- Mobile: floating "Liste" button -->
        <button
          class="fab-list"
          (click)="sidebarOpen.set(true)"
          aria-label="Afficher la liste"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Liste
          <span class="fab-count" *ngIf="displayedStations().length > 0">{{ displayedStations().length }}</span>
        </button>
      </div>

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
      height: 100dvh;
      background: var(--color-bg);
      overflow: hidden;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 380px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
      z-index: 20;
      overflow-y: auto;
      overflow-x: hidden;
      gap: var(--space-1);
    }

    /* ── Sidebar Header ── */
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 12px var(--space-4) var(--space-3);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .sidebar-brand {
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
      flex-shrink: 0;
    }
    .btn-icon:active { transform: scale(0.93); }
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 0.8s linear infinite; }

    /* Mobile-only close button - hidden on desktop */
    .sidebar-close-btn {
      display: none;
    }

    /* ── Sidebar sections ── */
    .sidebar-search {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
    }

    .sidebar-filters {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .sidebar-section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: var(--space-3) var(--space-4) var(--space-1);
    }

    .sidebar-section-title--top3 {
      color: #b45309;
    }

    .section-count {
      background: var(--color-bg);
      color: var(--color-text-muted);
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: var(--radius-pill);
      margin-left: 2px;
    }

    .sidebar-error {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-error-bg);
      color: var(--color-error);
      padding: 8px var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: 500;
      margin: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
    }

    .sidebar-empty {
      padding: var(--space-4);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      text-align: center;
    }

    .sidebar-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-4);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      text-align: center;
      line-height: 1.5;
    }
    .sidebar-hint svg {
      color: var(--color-primary);
      opacity: 0.5;
      width: 32px;
      height: 32px;
    }

    /* ── Map area ── */
    .map-area {
      flex: 1;
      min-width: 0;
      position: relative;
    }

    /* ── FAB List button (mobile only) ── */
    .fab-list {
      display: none;
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-surface);
      border: none;
      border-radius: var(--radius-pill);
      box-shadow: var(--shadow-lg);
      padding: 10px 20px;
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      color: var(--color-text-primary);
      cursor: pointer;
      align-items: center;
      gap: 8px;
      z-index: 10;
      -webkit-tap-highlight-color: transparent;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }
    .fab-list:active { transform: translateX(-50%) scale(0.95); }

    .fab-count {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
      font-size: 11px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: var(--radius-pill);
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

    /* ── Mobile responsive (≤768px) ── */
    @media (max-width: 768px) {
      .app-shell {
        flex-direction: column;
      }

      .sidebar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 85vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        box-shadow: var(--shadow-sheet);
        z-index: 50;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        /* Prevent bottom of page from showing */
        padding-bottom: env(safe-area-inset-bottom, 0);
      }

      .sidebar--open {
        transform: translateY(0);
      }

      .sidebar-close-btn {
        display: flex;
      }

      .map-area {
        position: absolute;
        inset: 0;
      }

      .fab-list {
        display: flex;
      }
    }
  `]
})
export class AppComponent {
  readonly fuelLabels = FUEL_LABELS;
  private stationService = inject(StationService);
  private geolocationService = inject(GeolocationService);

  userLocation  = signal<{ lat: number; lon: number } | null>(null);
  locationLabel = signal<string | null>(null);
  selectedStation = signal<Station | null>(null);
  loading     = signal(false);
  locating    = signal(false);
  error       = signal<string | null>(null);
  filters     = signal<FilterValues>({ fuelType: 'E10', radiusKm: 10, maxPrice: null, services: [] });
  historyStation = signal<Station | null>(null);
  sidebarOpen = signal(false);

  private _allStations = signal<Station[]>([]);

  displayedStations = computed(() => this._allStations());

  top3 = computed(() => this.displayedStations().slice(0, 3));
  otherStations = computed(() => this.displayedStations().slice(3));
  top3Ids = computed(() => this.top3().map(s => s.id));

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
    const f = this.filters();
    this.stationService.recommendStations({
      lat,
      lon,
      radiusKm: f.radiusKm,
      fuelType: f.fuelType !== 'Tous' ? f.fuelType : undefined,
      maxPrice: f.maxPrice,
      services: f.services,
      limit: 50,
    }).subscribe({
      next: (stations) => {
        this._allStations.set(stations);
        this.loading.set(false);
        if (stations.length > 0) this.sidebarOpen.set(true);
      },
      error: (err) => {
        this.error.set('Erreur lors de la recherche : ' + err.message);
        this.loading.set(false);
      },
    });
  }

  onFiltersChanged(f: FilterValues): void {
    this.filters.set(f);
    const loc = this.userLocation();
    if (loc) {
      this._fetchStations(loc.lat, loc.lon);
    }
  }

  onStationSelected(station: Station | null): void {
    this.selectedStation.set(station);
    if (station) this.sidebarOpen.set(false);
  }
}
