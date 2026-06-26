import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent } from './components/filters/filters.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { RoutePanelComponent, RouteRequest } from './components/route-panel/route-panel.component';
import { StationListComponent } from './components/station-list/station-list.component';
import { SortBarComponent } from './components/ui/sort-bar.component';
import { IconComponent } from './components/ui/icon.component';
import { AppStateService } from './services/app-state.service';
import { IngestionStatusService } from './services/ingestion-status.service';
import { FUEL_LABELS, FilterValues, SortBy } from './models/station.model';

type Snap = 0 | 1 | 2; // 0 collapsed (peek) · 1 mid · 2 full

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MapComponent, FiltersComponent, AddressSearchComponent, PriceHistoryComponent,
    RoutePanelComponent, StationListComponent, SortBarComponent, IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./app.component.scss'],
  template: `
    <div class="app-wrapper">

    @if (ingestionStatus.isLoading() && state.displayedStations().length === 0 && state.routeStations().length === 0) {
      <div class="ingestion-banner" role="status" aria-live="polite">
        <app-icon name="spinner" [size]="14" [spin]="true" [strokeWidth]="2.5" />
        Chargement des données en cours… cela peut prendre quelques minutes lors du premier démarrage.
      </div>
    }
    @if (ingestionStatus.state().status === 'error') {
      <div class="ingestion-banner ingestion-banner--error" role="alert">
        ⚠ Erreur lors du chargement des données : {{ ingestionStatus.state().error }}
      </div>
    }

    <div class="app-shell">

      <!-- ══ DESKTOP SIDEBAR ═══════════════════════════════════════════════ -->
      <aside class="sidebar" [class.sidebar--open]="state.sidebarOpen()">

        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="brand-logo"><app-icon name="pump" [size]="16" [strokeWidth]="2.2" /></div>
            <h1 class="brand-title">Pump Price</h1>
          </div>

          @if (!state.insecureContext) {
            <button class="btn-icon btn-icon--primary" type="button" [disabled]="state.locating()"
                    title="Me localiser" aria-label="Me localiser" (click)="state.locateUser()">
              <app-icon [name]="state.locating() ? 'spinner' : 'locate'" [size]="17" [spin]="state.locating()" />
            </button>
          } @else {
            <span class="https-badge" title="Géolocalisation indisponible en HTTP.">
              <app-icon name="lock" [size]="12" /> HTTPS requis
            </span>
          }

          <button class="btn-icon sidebar-close-btn" type="button" aria-label="Fermer la liste"
                  (click)="state.sidebarOpen.set(false)">
            <app-icon name="close" [size]="16" [strokeWidth]="2.5" />
          </button>
        </div>

        <div class="mode-tabs" role="tablist">
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'nearby'"
                  [attr.aria-selected]="state.mode() === 'nearby'"
                  (click)="state.mode.set('nearby')">
            <app-icon name="pin" [size]="13" [strokeWidth]="2.2" /> À proximité
          </button>
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'route'"
                  [attr.aria-selected]="state.mode() === 'route'"
                  (click)="state.mode.set('route')">
            <app-icon name="route" [size]="13" [strokeWidth]="2.2" /> Itinéraire
          </button>
        </div>

        <div class="sidebar-search">
          @if (state.mode() === 'nearby') {
            <app-address-search [prefill]="state.locatedPosition()" (locationSelected)="state.onAddressSelected($event)"></app-address-search>
          } @else {
            <app-route-panel [prefillOrigin]="state.locatedPosition()" (routeRequested)="state.onRouteRequested($event)" (routeCleared)="state.onRouteCleared()"></app-route-panel>
          }
        </div>

        @if (state.mode() === 'nearby') {
          <app-sort-bar />
        }

        <div class="sidebar-filters">
          <button class="filters-toggle" type="button" [attr.aria-expanded]="state.filtersExpanded()"
                  (click)="state.filtersExpanded.set(!state.filtersExpanded())">
            <span class="filters-toggle-label"><app-icon name="filter" [size]="12" [strokeWidth]="2.2" /> Filtres</span>
            <app-icon class="filters-chevron" [class.filters-chevron--open]="state.filtersExpanded()"
                      name="chevron-down" [size]="13" [strokeWidth]="2.5" />
          </button>
          <div class="filters-body" [class.filters-body--open]="state.filtersExpanded()">
            <app-filters [values]="state.filters()" (changed)="state.onFiltersChanged($event)"></app-filters>
          </div>
        </div>

        <!-- Nearby results -->
        @if (state.mode() === 'nearby') {
          @if (state.error() && state.hasSearched()) {
            <div class="sidebar-error" role="alert"><app-icon name="alert" [size]="13" /> {{ state.error() }}</div>
          }
          @if (state.loading() && state.displayedStations().length === 0) {
            @for (_ of [1,2,3]; track $index) { <div class="skeleton-card"><div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div><div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div></div> }
          }
          @if (state.userLocation()) {
            @if (state.loading() && state.displayedStations().length > 0) {
              <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div>
            }
            <div [class.results-list--refreshing]="state.loading()">
              <app-station-list
                [top3]="state.top3()" [others]="state.otherStations()"
                [topLabel]="sortTopLabel(false)"
                [empty]="state.displayedStations().length === 0 && state.hasSearched() && !state.loading()"
                emptyLabel="Aucune station trouvée dans ce rayon"
                [selectedId]="state.selectedStation()?.id ?? null"
                [highlightFuel]="state.effectiveHighlightFuel()"
                (select)="state.onStationSelected($event)" (history)="state.historyStation.set($event)"
                (hover)="state.hoveredStationId.set($event)">
              </app-station-list>
            </div>
          } @else if (!state.loading()) {
            <div class="sidebar-hint">
              <app-icon name="locate" [size]="32" [strokeWidth]="1.5" />
              <span>Localisez-vous ou entrez une adresse pour voir les stations</span>
            </div>
          }
        }

        <!-- Route results -->
        @if (state.mode() === 'route') {
          @if (state.routeError() && state.hasRouteSearched()) {
            <div class="sidebar-error" role="alert"><app-icon name="alert" [size]="13" /> {{ state.routeError() }}</div>
          }
          @if (state.routeLoading() && state.routeStations().length === 0) {
            @for (_ of [1,2,3]; track $index) { <div class="skeleton-card"><div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div><div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div></div> }
          }
          @if (state.routeData()) {
            @if (state.routeLoading()) { <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div> }
            <app-sort-bar />
            <div [class.results-list--refreshing]="state.routeLoading()">
              <app-station-list
                [top3]="state.routeTop3()" [others]="state.routeOtherStations()"
                [topLabel]="sortTopLabel(true)" [routeMode]="true"
                [empty]="state.routeStations().length === 0" emptyLabel="Aucune station sur cet itinéraire"
                [selectedId]="state.selectedStation()?.id ?? null"
                [highlightFuel]="state.effectiveHighlightFuel()"
                [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
                [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
                [showShare]="true" [shareConfirm]="state.shareConfirm()"
                (select)="state.onStationSelected($event)" (history)="state.historyStation.set($event)"
                (hover)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps($event)"
                (share)="state.shareRoute()">
              </app-station-list>
            </div>
          } @else if (!state.routeLoading()) {
            <div class="sidebar-hint">
              <app-icon name="route" [size]="32" [strokeWidth]="1.5" />
              <span>Entrez un départ et une destination pour trouver des stations sur votre route</span>
            </div>
          }
        }

        @if (ingestionStatus.state().finished_at) {
          <div class="data-freshness">
            <app-icon name="clock" [size]="10" [strokeWidth]="2.5" />
            Données collectées {{ formatRelativeTime(ingestionStatus.state().finished_at) }}
          </div>
        }
      </aside>

      <!-- ══ MAP AREA ══════════════════════════════════════════════════════ -->
      <div class="map-area">
        <app-map
          [stations]="state.mapStations()"
          [userLocation]="state.userLocation()"
          [selectedStation]="state.selectedStation()"
          [highlightFuel]="state.effectiveHighlightFuel()"
          [top3Ids]="state.top3Ids()"
          [routeCoords]="state.routeCoords()"
          [hoveredStationId]="state.hoveredStationId()"
          (stationSelected)="state.onStationSelected($event)"
          (historyRequested)="state.historyStation.set($event)">
        </app-map>

        <!-- Mobile map FAB: locate -->
        @if (!state.insecureContext && state.mode() === 'nearby') {
          <button class="map-fab" type="button" [disabled]="state.locating()"
                  aria-label="Me localiser" (click)="state.locateUser()">
            <app-icon [name]="state.locating() ? 'spinner' : 'locate'" [size]="20" [spin]="state.locating()" />
          </button>
        }

        <!-- Desktop FAB list -->
        <button class="fab-list" type="button" aria-label="Afficher la liste" (click)="state.sidebarOpen.set(true)">
          <app-icon name="list" [size]="15" /> Liste
          @if (state.displayedStations().length > 0) { <span class="fab-count">{{ state.displayedStations().length }}</span> }
        </button>
      </div>

    </div><!-- /app-shell -->

    <!-- ══ MOBILE BOTTOM SHEET (single surface) ══════════════════════════ -->
    <div class="sheet"
         [class.sheet--collapsed]="sheetSnap() === 0"
         [class.sheet--mid]="sheetSnap() === 1"
         [class.sheet--full]="sheetSnap() === 2"
         role="region" aria-label="Liste des stations">

      <div class="sheet-handle-bar"
           (touchstart)="onHandleTouchStart($event)"
           (touchmove)="onHandleTouchMove($event)"
           (touchend)="onHandleTouchEnd($event)"
           (click)="onHandleClick()">
        <div class="sheet-drag-pill" aria-hidden="true"></div>
      </div>

      <!-- Header: mode toggle + persistent search (always visible in peek) -->
      <div class="sheet-header">
        <div class="seg" role="tablist">
          <button class="seg-btn" type="button" role="tab"
                  [class.seg-btn--active]="state.mode() === 'nearby'"
                  [attr.aria-selected]="state.mode() === 'nearby'"
                  (click)="state.mode.set('nearby')">
            <app-icon name="pin" [size]="14" [strokeWidth]="2.2" /> Proximité
          </button>
          <button class="seg-btn" type="button" role="tab"
                  [class.seg-btn--active]="state.mode() === 'route'"
                  [attr.aria-selected]="state.mode() === 'route'"
                  (click)="state.mode.set('route')">
            <app-icon name="route" [size]="14" [strokeWidth]="2.2" /> Itinéraire
          </button>
        </div>

        @if (state.mode() === 'nearby') {
          <div (focusin)="onSearchFocus()">
            <app-address-search [prefill]="state.locatedPosition()" (locationSelected)="onMobileSearch($event)"></app-address-search>
          </div>
        } @else {
          <button class="route-summary" type="button" (click)="expandFull()">
            <app-icon name="route" [size]="15" />
            @if (state.routeOrigin() && state.routeDest()) {
              <span>{{ state.routeOrigin()!.label }} → {{ state.routeDest()!.label }}</span>
            } @else {
              <span>Planifier un itinéraire…</span>
            }
          </button>
        }
      </div>

      <!-- Sub-header: sort/count + filters (hidden in the peek) -->
      @if (sheetSnap() !== 0) {
        <div class="sheet-subheader">
          @if (hasResults()) {
            <app-sort-bar variant="sheet" />
          } @else {
            <span class="sheet-count">{{ countLabel() }}</span>
          }
          <button class="filters-pill-btn" type="button"
                  [class.filters-pill-btn--on]="state.filters().fuelType !== 'Tous'"
                  (click)="filtersOpen.set(true)" aria-label="Filtres">
            <app-icon name="filter" [size]="12" [strokeWidth]="2.2" /> Filtres
          </button>
        </div>
      }

      <div class="sheet-body">

        @if (state.mode() === 'route' && (sheetSnap() === 2 || !state.routeData())) {
          <div class="sheet-route-block">
            <app-route-panel [prefillOrigin]="state.locatedPosition()" (routeRequested)="onMobileRoute($event)" (routeCleared)="state.onRouteCleared()"></app-route-panel>
          </div>
        }

        @if (state.mode() === 'nearby' && state.error() && state.hasSearched()) {
          <div class="sheet-error" role="alert"><app-icon name="alert" [size]="13" /> {{ state.error() }}</div>
        }
        @if (state.mode() === 'route' && state.routeError() && state.hasRouteSearched()) {
          <div class="sheet-error" role="alert"><app-icon name="alert" [size]="13" /> {{ state.routeError() }}</div>
        }

        @if ((state.mode() === 'nearby' && state.loading() && state.displayedStations().length === 0) ||
             (state.mode() === 'route' && state.routeLoading() && state.routeStations().length === 0)) {
          @for (_ of [1,2,3]; track $index) { <div class="skeleton-card"><div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div><div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div></div> }
        }
        @if ((state.mode() === 'nearby' && state.loading() && state.displayedStations().length > 0) ||
             (state.mode() === 'route' && state.routeLoading() && state.routeStations().length > 0)) {
          <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div>
        }

        @if (state.mode() === 'nearby' && state.userLocation()) {
          <div [class.results-list--refreshing]="state.loading()">
            <app-station-list
              [top3]="state.top3()" [others]="state.otherStations()"
              [topLabel]="sortTopLabel(false)"
              [empty]="state.displayedStations().length === 0 && state.hasSearched() && !state.loading()"
              emptyLabel="Aucune station trouvée dans ce rayon"
              [selectedId]="state.selectedStation()?.id ?? null"
              [highlightFuel]="state.effectiveHighlightFuel()"
              (select)="state.onStationSelected($event)" (history)="state.historyStation.set($event)"
              (hover)="state.hoveredStationId.set($event)">
            </app-station-list>
          </div>
        }

        @if (state.mode() === 'route' && state.routeData()) {
          <div [class.results-list--refreshing]="state.routeLoading()">
            <app-station-list
              [top3]="state.routeTop3()" [others]="state.routeOtherStations()"
              [topLabel]="sortTopLabel(true)" [routeMode]="true"
              [empty]="state.routeStations().length === 0" emptyLabel="Aucune station sur cet itinéraire"
              [selectedId]="state.selectedStation()?.id ?? null"
              [highlightFuel]="state.effectiveHighlightFuel()"
              [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
              [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
              [showShare]="true" [shareConfirm]="state.shareConfirm()"
              (select)="state.onStationSelected($event)" (history)="state.historyStation.set($event)"
              (hover)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps($event)"
              (share)="state.shareRoute()">
            </app-station-list>
          </div>
        }

        @if (state.mode() === 'nearby' && !state.loading() && !state.userLocation()) {
          <div class="sheet-hint">
            <div class="sheet-hint-icon"><app-icon name="locate" [size]="24" [strokeWidth]="1.8" /></div>
            <span>Touchez le bouton <strong>de localisation</strong> en bas à droite<br>ou cherchez une adresse ci-dessus</span>
          </div>
        }
        @if (state.mode() === 'route' && !state.routeLoading() && !state.routeData() && sheetSnap() !== 2) {
          <div class="sheet-hint">
            <div class="sheet-hint-icon"><app-icon name="route" [size]="24" [strokeWidth]="1.8" /></div>
            <span>Entrez un départ et une destination pour trouver des stations</span>
          </div>
        }

        @if (ingestionStatus.state().finished_at) {
          <div class="sheet-freshness">
            <app-icon name="clock" [size]="10" [strokeWidth]="2.5" />
            Données : {{ formatRelativeTime(ingestionStatus.state().finished_at) }}
          </div>
        }
      </div>
    </div>

    <!-- ══ MOBILE FILTERS MODAL ═════════════════════════════════════════ -->
    @if (filtersOpen()) {
      <div class="filters-overlay" role="dialog" aria-modal="true" aria-label="Filtres" (click)="filtersOpen.set(false)">
        <div class="filters-modal" (click)="$event.stopPropagation()">
          <div class="filters-modal-header">
            <div class="filters-modal-drag"></div>
            <div class="filters-modal-titlebar">
              <span class="filters-modal-title">Filtres</span>
              <button class="filters-modal-close" type="button" aria-label="Fermer" (click)="filtersOpen.set(false)">
                <app-icon name="close" [size]="16" [strokeWidth]="2.5" />
              </button>
            </div>
          </div>
          <div class="filters-modal-body">
            <app-filters [values]="state.filters()" (changed)="onMobileFilters($event)"></app-filters>
          </div>
        </div>
      </div>
    }

    @if (state.historyStation()) {
      <app-price-history [station]="state.historyStation()!"
                         [preferredFuel]="state.filters().fuelType !== 'Tous' ? state.filters().fuelType : null"
                         (close)="state.historyStation.set(null)"></app-price-history>
    }

    </div><!-- /app-wrapper -->
  `,
})
export class AppComponent implements OnInit {
  readonly state           = inject(AppStateService);
  readonly ingestionStatus = inject(IngestionStatusService);
  readonly fuelLabels      = FUEL_LABELS;

  readonly sheetSnap   = signal<Snap>(0);
  readonly filtersOpen = signal(false);

  readonly hasResults = computed(() =>
    this.state.mode() === 'route'
      ? this.state.routeStations().length > 0
      : this.state.displayedStations().length > 0
  );

  /** Short status label shown in the sheet sub-header before results exist. */
  readonly countLabel = computed(() => {
    if (this.state.mode() === 'nearby') {
      if (this.state.loading())      return 'Recherche…';
      if (this.state.hasSearched())  return 'Aucune station';
      return 'Stations à proximité';
    }
    if (this.state.routeLoading()) return 'Calcul…';
    return 'Itinéraire';
  });

  private readonly _sortTopLabels: Record<SortBy, { nearby: string; route: string }> = {
    score:     { nearby: '★ Top 3',                      route: '★ Top stations sur le trajet' },
    price:     { nearby: '€ Les moins chères',           route: '€ Moins chères sur le trajet' },
    distance:  { nearby: '📍 Les plus proches',          route: '📍 Moins de détour' },
    freshness: { nearby: '🕐 Prix mis à jour récemment', route: '🕐 Prix mis à jour récemment' },
  };

  sortTopLabel(routeMode: boolean): string {
    const labels = this._sortTopLabels[this.state.sortBy()];
    return routeMode ? labels.route : labels.nearby;
  }

  private _touchStartY = 0;
  private _touchStartSnap: Snap = 0;
  private _touchMoved = false;

  constructor() {
    // Single snap state machine — precedence: selection → route form → fresh results.
    effect(() => {
      const mode      = this.state.mode();
      const selected  = this.state.selectedStation();
      const routeData = this.state.routeData();
      const hasResults = mode === 'route'
        ? this.state.routeStations().length > 0
        : this.state.displayedStations().length > 0;

      untracked(() => {
        if (selected) { this.sheetSnap.set(0); return; }          // reveal the map for the picked station
        if (mode === 'route' && !routeData) { this.sheetSnap.set(2); return; } // show the route form
        if (hasResults && this.sheetSnap() === 0) this.sheetSnap.set(1);        // surface fresh results
      });
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.state.restoreFromUrl();
    this.ingestionStatus.startPolling();
  }

  expandFull(): void { this.sheetSnap.set(2); }
  onSearchFocus(): void { if (this.sheetSnap() < 2) this.sheetSnap.set(2); }

  onHandleTouchStart(e: TouchEvent): void {
    this._touchStartY    = e.touches[0].clientY;
    this._touchStartSnap = this.sheetSnap();
    this._touchMoved     = false;
  }

  onHandleTouchMove(e: TouchEvent): void {
    if (Math.abs(e.touches[0].clientY - this._touchStartY) > 8) this._touchMoved = true;
  }

  onHandleTouchEnd(e: TouchEvent): void {
    const delta = e.changedTouches[0].clientY - this._touchStartY;
    if (!this._touchMoved || Math.abs(delta) < 8) return;
    if (delta > 40)       this.sheetSnap.set(Math.max(0, this._touchStartSnap - 1) as Snap);
    else if (delta < -40) this.sheetSnap.set(Math.min(2, this._touchStartSnap + 1) as Snap);
  }

  onHandleClick(): void {
    if (this._touchMoved) return;
    const cur = this.sheetSnap();
    this.sheetSnap.set((cur === 0 ? 1 : cur === 1 ? 2 : 0) as Snap);
  }

  onMobileSearch(event: { lat: number; lon: number; label: string }): void {
    this.state.onAddressSelected(event);
    this.sheetSnap.set(1);
  }

  onMobileRoute(req: RouteRequest): void {
    this.state.onRouteRequested(req);
    this.sheetSnap.set(1);
  }

  onMobileFilters(f: FilterValues): void {
    this.state.onFiltersChanged(f);
    this.filtersOpen.set(false);
  }

  formatRelativeTime(isoDate: string | null): string {
    if (!isoDate) return '';
    const diff    = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1)  return 'il y a quelques secondes';
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)   return `il y a ${hours} h`;
    return `il y a ${Math.floor(hours / 24)} j`;
  }
}
