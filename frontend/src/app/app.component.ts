import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal, untracked } from '@angular/core';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent } from './components/filters/filters.component';
import { StationCardComponent } from './components/station-card/station-card.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { RoutePanelComponent } from './components/route-panel/route-panel.component';
import { AppStateService } from './services/app-state.service';
import { IngestionStatusService } from './services/ingestion-status.service';
import { FUEL_LABELS, FilterValues } from './models/station.model';
import { RouteRequest } from './components/route-panel/route-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MapComponent, FiltersComponent, StationCardComponent,
    AddressSearchComponent, PriceHistoryComponent, RoutePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-wrapper">

    @if (ingestionStatus.isLoading() && state.displayedStations().length === 0 && state.routeStations().length === 0) {
      <div class="ingestion-banner" role="status" aria-live="polite">
        <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Chargement des données en cours… cela peut prendre quelques minutes lors du premier démarrage.
      </div>
    }
    @if (ingestionStatus.state().status === 'error') {
      <div class="ingestion-banner ingestion-banner--error" role="alert">
        ⚠ Erreur lors du chargement des données : {{ ingestionStatus.state().error }}
      </div>
    }

    <div class="app-shell">

      <!-- ══ DESKTOP SIDEBAR (hidden on mobile) ══════════════════════════ -->
      <aside class="sidebar" [class.sidebar--open]="state.sidebarOpen()">

        <div class="sidebar-header">
          <div class="sidebar-brand">
            <svg class="brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 22V8l9-4 9 4v14"/>
              <path d="M10 14h4"/><path d="M12 14v4"/>
              <circle cx="18" cy="9" r="1"/>
              <path d="M18 10v5a1 1 0 0 0 2 0v-3l-2-2"/>
            </svg>
            <h1 class="brand-title">Pump Price</h1>
          </div>

          @if (!state.insecureContext) {
            <button class="btn-icon btn-icon--primary" type="button" [disabled]="state.locating()"
                    title="Me localiser" aria-label="Me localiser" (click)="state.locateUser()">
              @if (!state.locating()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                  <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
                </svg>
              } @else {
                <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
            </button>
          } @else {
            <span class="https-badge" title="Géolocalisation indisponible en HTTP.">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
              HTTPS requis
            </span>
          }

          <button class="btn-icon sidebar-close-btn" type="button" aria-label="Fermer la liste"
                  (click)="state.sidebarOpen.set(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="mode-tabs" role="tablist">
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'nearby'"
                  [attr.aria-selected]="state.mode() === 'nearby'"
                  (click)="state.mode.set('nearby')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            À proximité
          </button>
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'route'"
                  [attr.aria-selected]="state.mode() === 'route'"
                  (click)="state.mode.set('route')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M3 3h7l7 9-7 9H3l7-9z"/>
            </svg>
            Itinéraire
          </button>
        </div>

        @if (state.mode() === 'nearby') {
          <div class="sidebar-search">
            <app-address-search [prefill]="state.locatedPosition()" (locationSelected)="state.onAddressSelected($event)"></app-address-search>
          </div>
          <div class="sidebar-filters">
            <button class="filters-toggle" type="button" [attr.aria-expanded]="state.filtersExpanded()"
                    (click)="state.filtersExpanded.set(!state.filtersExpanded())">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="state.filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="state.filtersExpanded()">
              <app-filters [values]="state.filters()" [drawerMode]="false" (changed)="state.onFiltersChanged($event)"></app-filters>
            </div>
          </div>

          @if (state.error() && state.hasSearched()) {
            <div class="sidebar-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.error() }}
            </div>
          }

          @if (state.loading() && state.displayedStations().length === 0) {
            <div class="sidebar-section-title">Chargement…</div>
            @for (_ of [1,2,3]; track $index) {
              <div class="skeleton-card">
                <div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div>
                <div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div>
              </div>
            }
          }

          @if (state.userLocation()) {
            @if (state.loading() && state.displayedStations().length > 0) {
              <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div>
            }
            <div class="results-list" [class.results-list--refreshing]="state.loading()">
              @if (state.displayedStations().length === 0 && state.hasSearched() && !state.loading()) {
                <div class="sidebar-empty">Aucune station trouvée dans ce rayon</div>
              }
              @if (state.top3().length > 0) {
                <div class="sidebar-section-title sidebar-section-title--top3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Top 3
                </div>
                @for (s of state.top3(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }
              @if (state.otherStations().length > 0) {
                <div class="sidebar-section-title">Autres stations <span class="section-count">{{ state.otherStations().length }}</span></div>
                @for (s of state.otherStations(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }
            </div>
          }

          @if (!state.loading() && !state.userLocation()) {
            <div class="sidebar-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              <span>Localisez-vous ou entrez une adresse pour voir les stations</span>
            </div>
          }
        }

        @if (state.mode() === 'route') {
          <div class="sidebar-search">
            <app-route-panel [prefillOrigin]="state.locatedPosition()" (routeRequested)="state.onRouteRequested($event)" (routeCleared)="state.onRouteCleared()"></app-route-panel>
          </div>
          <div class="sidebar-filters">
            <button class="filters-toggle" type="button" [attr.aria-expanded]="state.filtersExpanded()"
                    (click)="state.filtersExpanded.set(!state.filtersExpanded())">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="state.filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="state.filtersExpanded()">
              <app-filters [values]="state.filters()" [drawerMode]="false" (changed)="state.onFiltersChanged($event)"></app-filters>
            </div>
          </div>

          @if (state.routeError() && state.hasRouteSearched()) {
            <div class="sidebar-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.routeError() }}
            </div>
          }

          @if (state.routeLoading() && state.routeStations().length === 0) {
            <div class="sidebar-section-title">Calcul en cours…</div>
            @for (_ of [1,2,3]; track $index) {
              <div class="skeleton-card">
                <div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div>
                <div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div>
              </div>
            }
          }
          @if (state.routeLoading() && state.routeStations().length > 0) {
            <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div>
          }

          @if (state.routeData()) {
            <div class="results-list" [class.results-list--refreshing]="state.routeLoading()">
              <div class="sidebar-share-row">
                <button class="btn-share" type="button" (click)="state.shareRoute()">
                  @if (!state.shareConfirm()) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  }
                  {{ state.shareConfirm() ? '✓ Lien copié !' : "Partager l'itinéraire" }}
                </button>
              </div>
              <div class="sidebar-section-title sidebar-section-title--top3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Top stations sur le trajet
              </div>
              @if (state.routeStations().length === 0) {
                <div class="sidebar-empty">Aucune station sur cet itinéraire</div>
              }
              @for (s of state.routeTop3(); track s.id) {
                <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                  [highlightFuel]="state.effectiveHighlightFuel()" [routeMode]="true"
                  [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
                  [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
                  (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                  (hovered)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps(s)">
                </app-station-card>
              }
              @if (state.routeOtherStations().length > 0) {
                <div class="sidebar-section-title">Autres stations <span class="section-count">{{ state.routeOtherStations().length }}</span></div>
                @for (s of state.routeOtherStations(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()" [routeMode]="true"
                    [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
                    [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps(s)">
                  </app-station-card>
                }
              }
            </div>
          }

          @if (!state.routeLoading() && !state.routeData()) {
            <div class="sidebar-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M3 3h7l7 9-7 9H3l7-9z"/>
              </svg>
              <span>Entrez un départ et une destination pour trouver des stations sur votre route</span>
            </div>
          }
        }

        @if (ingestionStatus.state().finished_at) {
          <div class="data-freshness">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Données collectées {{ formatRelativeTime(ingestionStatus.state().finished_at) }}
          </div>
        }

        <div class="ad-zone" aria-label="Espace publicitaire">
          <span class="ad-zone__label">Annonce</span>
          <div class="ad-zone__slot"><span class="ad-zone__placeholder">Espace publicitaire</span></div>
        </div>
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

        <!-- Mobile: floating top bar (hidden when route planner is fullscreen) -->
        <div class="mobile-topbar" [class.mobile-topbar--hidden]="state.mode() === 'route' && sheetSnap() === 2 && !state.routeData()">
          <button class="search-pill" type="button" aria-label="Rechercher" (click)="openSearch()">
            @if (state.mode() === 'nearby') {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span class="search-pill-label">{{ state.locationLabel() || 'Chercher une adresse…' }}</span>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                <path d="M3 3h7l7 9-7 9H3l7-9z"/>
              </svg>
              <span class="search-pill-label">
                @if (state.routeOrigin() && state.routeDest()) {
                  {{ state.routeOrigin()!.label }} → {{ state.routeDest()!.label }}
                } @else {
                  Planifier un itinéraire…
                }
              </span>
            }
          </button>
          @if (!state.insecureContext && state.mode() === 'nearby') {
            <button class="fab-locate-m" type="button" [disabled]="state.locating()"
                    aria-label="Me localiser" (click)="state.locateUser()">
              @if (!state.locating()) {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                  <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
                </svg>
              } @else {
                <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
            </button>
          }
        </div>

        <!-- Desktop only: FAB list -->
        <button class="fab-list" type="button" aria-label="Afficher la liste" (click)="state.sidebarOpen.set(true)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Liste
          @if (state.displayedStations().length > 0) {
            <span class="fab-count">{{ state.displayedStations().length }}</span>
          }
        </button>
      </div>

    </div><!-- /app-shell -->

      <!-- ══ MOBILE BOTTOM SHEET ═══════════════════════════════════════════ -->
      <div class="sheet"
           [class.sheet--snap0]="sheetSnap() === 0"
           [class.sheet--snap1]="sheetSnap() === 1"
           [class.sheet--snap2]="sheetSnap() === 2"
           role="region" aria-label="Liste des stations">

        <!-- Drag handle -->
        <div class="sheet-handle-bar"
             (touchstart)="onHandleTouchStart($event)"
             (touchmove)="onHandleTouchMove($event)"
             (touchend)="onHandleTouchEnd($event)"
             (click)="onHandleClick()">
          <div class="sheet-drag-pill" aria-hidden="true"></div>

          @if (state.mode() === 'route' && sheetSnap() === 2 && !state.routeData()) {
            <!-- Route planning header: title + locate + close -->
            <div class="sheet-header-row">
              <span class="sheet-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 3h7l7 9-7 9H3l7-9z"/></svg>
                Planifier un itinéraire
              </span>
              <div class="sheet-header-actions">
                @if (!state.insecureContext) {
                  <button class="sheet-icon-btn" type="button" [disabled]="state.locating()"
                          aria-label="Me localiser" (click)="state.locateUser(); $event.stopPropagation()">
                    @if (!state.locating()) {
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                        <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
                      </svg>
                    } @else {
                      <svg class="spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    }
                  </button>
                }
                <button class="sheet-icon-btn" type="button" aria-label="Réduire"
                        (click)="sheetSnap.set(0); $event.stopPropagation()">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                </button>
              </div>
            </div>
          } @else {
            <!-- Standard header: title/count + filters -->
            <div class="sheet-header-row">
              <div class="sheet-title-group">
                <span class="sheet-title">
                  @if (state.mode() === 'nearby') {
                    @if (state.loading()) {
                      <svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Recherche…
                    } @else if (state.displayedStations().length > 0) {
                      {{ state.displayedStations().length }} stations
                    } @else if (state.hasSearched()) {
                      Aucune station
                    } @else {
                      Stations à proximité
                    }
                  } @else {
                    @if (state.routeLoading()) {
                      <svg class="spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Calcul…
                    } @else if (state.routeStations().length > 0) {
                      {{ state.routeStations().length }} stations sur le trajet
                    } @else {
                      Itinéraire
                    }
                  }
                </span>
                @if (state.filters().fuelType !== 'Tous') {
                  <span class="fuel-chip">{{ fuelLabels[state.filters().fuelType] || state.filters().fuelType }}</span>
                }
              </div>
              <div class="sheet-header-actions">
                @if (state.mode() === 'route' && state.routeData()) {
                  <button class="sheet-icon-btn" type="button" aria-label="Modifier l'itinéraire"
                          (click)="sheetSnap.set(2); $event.stopPropagation()" title="Modifier">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                }
                <button class="filters-pill-btn" type="button" (click)="filtersOpen.set(true); $event.stopPropagation()" aria-label="Filtres">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                  Filtres
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Sheet scrollable body -->
        <div class="sheet-body">

          <!-- Route planning form: shown in snap2 route mode only -->
          @if (state.mode() === 'route' && sheetSnap() === 2) {
            <div class="sheet-route-block">
              <app-route-panel [prefillOrigin]="state.locatedPosition()" (routeRequested)="onMobileRoute($event)" (routeCleared)="state.onRouteCleared()"></app-route-panel>
            </div>
          }

          <!-- Address search: nearby snap2 only -->
          @if (state.mode() === 'nearby' && sheetSnap() === 2) {
            <div class="sheet-search-block">
              <app-address-search [prefill]="state.locatedPosition()" (locationSelected)="onMobileSearch($event)"></app-address-search>
            </div>
          }

          <!-- Errors -->
          @if (state.mode() === 'nearby' && state.error() && state.hasSearched()) {
            <div class="sheet-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.error() }}
            </div>
          }
          @if (state.mode() === 'route' && state.routeError() && state.hasRouteSearched()) {
            <div class="sheet-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.routeError() }}
            </div>
          }

          <!-- Skeletons -->
          @if ((state.mode() === 'nearby' && state.loading() && state.displayedStations().length === 0) ||
               (state.mode() === 'route' && state.routeLoading() && state.routeStations().length === 0)) {
            @for (_ of [1,2,3]; track $index) {
              <div class="skeleton-card">
                <div class="sk-line sk-line--title"></div><div class="sk-line sk-line--sub"></div>
                <div class="sk-badges">@for (__ of [1,2,3]; track $index) { <div class="sk-badge"></div> }</div>
              </div>
            }
          }

          <!-- Refresh bar -->
          @if ((state.mode() === 'nearby' && state.loading() && state.displayedStations().length > 0) ||
               (state.mode() === 'route' && state.routeLoading() && state.routeStations().length > 0)) {
            <div class="refresh-bar" role="status"><div class="refresh-bar__track"></div></div>
          }

          <!-- NEARBY results -->
          @if (state.mode() === 'nearby' && state.userLocation()) {
            <div [class.results-list--refreshing]="state.loading()">
              @if (state.displayedStations().length === 0 && state.hasSearched() && !state.loading()) {
                <div class="sheet-empty">Aucune station trouvée dans ce rayon</div>
              }
              @if (state.top3().length > 0) {
                <div class="sheet-section-title sheet-section-title--top3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Meilleures stations
                </div>
                @for (s of state.top3(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }
              @if (state.otherStations().length > 0) {
                <div class="sheet-section-title">Autres <span class="section-count">{{ state.otherStations().length }}</span></div>
                @for (s of state.otherStations(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }
            </div>
          }

          <!-- ROUTE results -->
          @if (state.mode() === 'route' && state.routeData()) {
            <div [class.results-list--refreshing]="state.routeLoading()">
              <div class="sheet-share-row">
                <button class="btn-share" type="button" (click)="state.shareRoute()">
                  @if (!state.shareConfirm()) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  }
                  {{ state.shareConfirm() ? '✓ Lien copié !' : "Partager l'itinéraire" }}
                </button>
              </div>
              <div class="sheet-section-title sheet-section-title--top3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Meilleures stations sur le trajet
              </div>
              @if (state.routeStations().length === 0) {
                <div class="sheet-empty">Aucune station sur cet itinéraire</div>
              }
              @for (s of state.routeTop3(); track s.id) {
                <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                  [highlightFuel]="state.effectiveHighlightFuel()" [routeMode]="true"
                  [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
                  [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
                  (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                  (hovered)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps(s)">
                </app-station-card>
              }
              @if (state.routeOtherStations().length > 0) {
                <div class="sheet-section-title">Autres <span class="section-count">{{ state.routeOtherStations().length }}</span></div>
                @for (s of state.routeOtherStations(); track s.id) {
                  <app-station-card [station]="s" [selected]="state.selectedStation()?.id === s.id"
                    [highlightFuel]="state.effectiveHighlightFuel()" [routeMode]="true"
                    [originLat]="state.routeOrigin()?.lat" [originLon]="state.routeOrigin()?.lon"
                    [destLat]="state.routeDest()?.lat" [destLon]="state.routeDest()?.lon"
                    (select)="state.onStationSelected($event)" (historyRequested)="state.historyStation.set($event)"
                    (hovered)="state.hoveredStationId.set($event)" (exportToMaps)="state.openGoogleMaps(s)">
                  </app-station-card>
                }
              }
            </div>
          }

          <!-- Hints -->
          @if (state.mode() === 'nearby' && !state.loading() && !state.userLocation()) {
            <div class="sheet-hint">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
              </svg>
              <span>Appuyez sur <strong>⊕</strong> pour vous localiser<br>ou cherchez une adresse ci-dessus</span>
            </div>
          }
          @if (state.mode() === 'route' && !state.routeLoading() && !state.routeData()) {
            <div class="sheet-hint">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                <path d="M3 3h7l7 9-7 9H3l7-9z"/>
              </svg>
              <span>Entrez un départ et une destination pour trouver des stations</span>
            </div>
          }

          @if (ingestionStatus.state().finished_at) {
            <div class="sheet-freshness">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Données : {{ formatRelativeTime(ingestionStatus.state().finished_at) }}
            </div>
          }
        </div>
      </div>

      <!-- ══ MOBILE BOTTOM NAV ════════════════════════════════════════════ -->
      <nav class="bottom-nav" aria-label="Navigation principale">
        <button class="nav-tab" type="button" role="tab"
                [class.nav-tab--active]="state.mode() === 'nearby'"
                [attr.aria-selected]="state.mode() === 'nearby'"
                (click)="state.mode.set('nearby')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Proximité</span>
        </button>
        <button class="nav-tab" type="button" role="tab"
                [class.nav-tab--active]="state.mode() === 'route'"
                [attr.aria-selected]="state.mode() === 'route'"
                (click)="state.mode.set('route')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 3h7l7 9-7 9H3l7-9z"/>
          </svg>
          <span>Itinéraire</span>
        </button>
      </nav>

      <!-- ══ MOBILE FILTERS MODAL ═════════════════════════════════════════ -->
      @if (filtersOpen()) {
        <div class="filters-overlay" role="dialog" aria-modal="true" aria-label="Filtres" (click)="filtersOpen.set(false)">
          <div class="filters-modal" (click)="$event.stopPropagation()">
            <div class="filters-modal-header">
              <div class="filters-modal-drag"></div>
              <div class="filters-modal-titlebar">
                <span class="filters-modal-title">Filtres</span>
                <button class="filters-modal-close" type="button" aria-label="Fermer" (click)="filtersOpen.set(false)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="filters-modal-body">
              <app-filters [values]="state.filters()" [drawerMode]="false" (changed)="onMobileFilters($event)"></app-filters>
            </div>
          </div>
        </div>
      }

      <!-- History modal -->
      @if (state.historyStation()) {
        <app-price-history [station]="state.historyStation()!" (close)="state.historyStation.set(null)"></app-price-history>
      }

    </div><!-- /app-wrapper -->
  `,
  styles: [`
    .app-wrapper { display: flex; flex-direction: column; height: 100dvh; }
    .app-shell   { display: flex; flex: 1; min-height: 0; background: var(--color-bg); overflow: hidden; }

    /* ── Sidebar (desktop) ── */
    .sidebar {
      width: 380px; flex-shrink: 0;
      display: flex; flex-direction: column;
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
      z-index: 20; overflow-y: auto; overflow-x: hidden;
    }


    .mode-tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }

    .mode-tab {
      flex: 1; padding: 12px; border: none; background: none;
      font-weight: 600; color: var(--color-text-muted); cursor: pointer;
      font-size: var(--font-size-sm); font-family: var(--font-family);
      transition: all var(--transition-fast);
      display: flex; align-items: center; justify-content: center; gap: 6px;
      border-bottom: 2px solid transparent;
    }
    .mode-tab--active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

    .sidebar-header {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 12px var(--space-4) var(--space-3);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0; position: sticky; top: 0; z-index: 5;
    }
    .sidebar-brand { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }
    .brand-icon    { color: var(--color-primary); flex-shrink: 0; }
    .brand-title   {
      font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary);
      margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;
    }

    .btn-icon {
      position: relative; width: 38px; height: 38px;
      border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
      background: var(--color-surface); color: var(--color-text-secondary);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all var(--transition-fast); -webkit-tap-highlight-color: transparent; flex-shrink: 0;
    }
    .btn-icon:active { transform: scale(0.93); }
    .btn-icon--primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .btn-icon--primary:disabled { background: var(--color-text-muted); border-color: var(--color-text-muted); cursor: not-allowed; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    .https-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: var(--font-size-xs); font-weight: 600; color: var(--color-warning);
      background: var(--color-warning-bg); border: 1px solid var(--color-warning-border);
      border-radius: var(--radius-pill); padding: 4px 10px; white-space: nowrap; flex-shrink: 0;
    }
    .sidebar-close-btn { display: none; }

    .sidebar-search  { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }
    .sidebar-filters { border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }

    .filters-toggle {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-3) var(--space-4); background: none; border: none; cursor: pointer;
      font-family: var(--font-family); -webkit-tap-highlight-color: transparent;
    }
    .filters-toggle:hover { background: var(--color-surface-3); }
    .filters-toggle-label {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-xs); font-weight: 700;
      color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.6px;
    }
    .filters-chevron { color: var(--color-text-muted); transition: transform var(--transition-fast); }
    .filters-chevron--open { transform: rotate(180deg); }
    .filters-body { display: none; padding: 0 var(--space-4) var(--space-3); }
    .filters-body--open { display: block; }

    .sidebar-section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-xs); font-weight: 700;
      color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.6px;
      padding: var(--space-3) var(--space-4) var(--space-1);
    }
    .sidebar-section-title--top3 { color: #b45309; }

    .section-count {
      background: var(--color-bg); color: var(--color-text-muted);
      font-size: 10px; font-weight: 700; padding: 1px 5px;
      border-radius: var(--radius-pill); margin-left: 2px;
    }

    .sidebar-error {
      display: flex; align-items: center; gap: var(--space-2);
      background: var(--color-error-bg); color: var(--color-error);
      padding: 8px var(--space-4); font-size: var(--font-size-sm); font-weight: 500;
      margin: var(--space-2) var(--space-4); border-radius: var(--radius-md);
    }
    .sidebar-empty { padding: var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; }
    .sidebar-hint {
      display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
      padding: var(--space-6) var(--space-4);
      color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; line-height: 1.5;
    }
    .sidebar-hint svg { color: var(--color-primary); opacity: 0.5; width: 32px; height: 32px; }

    .sidebar-share-row { padding: var(--space-2) var(--space-4) 0; }
    .btn-share {
      display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px var(--space-4);
      background: var(--color-accent-blue-bg); border: 1.5px solid var(--color-accent-blue-border);
      border-radius: var(--radius-md); color: var(--color-accent-blue);
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      cursor: pointer; justify-content: center; transition: all var(--transition-fast);
    }
    .btn-share:active { opacity: 0.8; transform: scale(0.98); }

    /* ── Map area ── */
    .map-area { flex: 1; min-width: 0; position: relative; }

    /* ── Desktop FAB ── */
    .fab-list {
      display: none;
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--color-surface); border: none; border-radius: var(--radius-pill);
      box-shadow: var(--shadow-lg); padding: 10px 20px;
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      color: var(--color-text-primary); cursor: pointer;
      align-items: center; gap: 8px; z-index: 10;
      -webkit-tap-highlight-color: transparent;
    }
    .fab-list:active { transform: translateX(-50%) scale(0.95); }
    .fab-count {
      background: var(--color-primary); color: #fff;
      font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: var(--radius-pill);
    }

    /* ── Skeleton ── */
    .skeleton-card {
      margin: 0 var(--space-3) var(--space-2);
      background: var(--color-surface); border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4); box-shadow: var(--shadow-sm);
    }
    .sk-line {
      height: 12px; border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 8px;
    }
    .sk-line--title { width: 60%; height: 14px; }
    .sk-line--sub   { width: 80%; }
    .sk-badges { display: flex; gap: 6px; margin-top: var(--space-2); }
    .sk-badge {
      width: 52px; height: 38px; border-radius: var(--radius-md);
      background: linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

    /* ── Refresh bar ── */
    .refresh-bar {
      margin: 0 var(--space-3) var(--space-2); height: 3px;
      border-radius: var(--radius-pill); background: var(--color-border); overflow: hidden;
    }
    .refresh-bar__track {
      height: 100%; background: var(--color-primary); border-radius: var(--radius-pill);
      animation: refresh-slide 1.2s ease-in-out infinite;
    }
    @keyframes refresh-slide {
      0%   { transform: translateX(-100%); width: 60%; }
      50%  { transform: translateX(80%);   width: 60%; }
      100% { transform: translateX(200%);  width: 60%; }
    }
    .results-list--refreshing { opacity: 0.55; pointer-events: none; transition: opacity 150ms ease; }

    /* ── Footer ── */
    .data-freshness {
      display: flex; align-items: center; gap: 5px;
      padding: var(--space-2) var(--space-4);
      font-size: var(--font-size-xs); color: var(--color-text-tertiary);
      border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
    }
    .ad-zone { margin-top: auto; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-border-subtle); flex-shrink: 0; }
    .ad-zone__label { display: block; font-size: 9px; font-weight: 600; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; }
    .ad-zone__slot { min-height: 80px; border-radius: var(--radius-md); background: var(--color-surface-3); border: 1px dashed var(--color-border); display: flex; align-items: center; justify-content: center; }
    .ad-zone__placeholder { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

    /* ── Ingestion banner ── */
    .ingestion-banner {
      background: var(--color-primary); color: #fff;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 8px 16px; font-size: var(--font-size-sm); font-weight: 500; flex-shrink: 0;
    }
    .ingestion-banner--error { background: var(--color-error); }

    /* ── Mobile sheet + bottom-nav: hidden on desktop ── */
    .sheet      { display: none; }
    .bottom-nav { display: none; }
    .mobile-topbar { display: none; }
    .filters-overlay { display: none; }

    /* ══ MOBILE + TABLETTE (≤1024px) ════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .app-shell { position: relative; }

      /* Hide desktop sidebar */
      .sidebar { display: none; }

      /* Map fills screen */
      .map-area { position: absolute; inset: 0; top: 0; }

      /* FAB list hidden on mobile */
      .fab-list { display: none !important; }

      /* ── Floating top bar ── */
      .mobile-topbar--hidden { opacity: 0; pointer-events: none; }

      .mobile-topbar {
        display: flex;
        position: absolute;
        top: 12px; left: 12px; right: 12px;
        z-index: 1000;
        transition: opacity 0.2s ease;
        gap: 8px;
        align-items: center;
      }

      .search-pill {
        flex: 1; display: flex; align-items: center; gap: 8px;
        padding: 11px 14px;
        background: #fff;
        border: none; border-radius: 100px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        font-family: var(--font-family); font-size: var(--font-size-sm);
        color: var(--color-text-muted); text-align: left; cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        min-width: 0;
      }
      .search-pill svg { flex-shrink: 0; color: var(--color-text-muted); }
      .search-pill-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .search-pill:active { opacity: 0.85; }

      .fab-locate-m {
        width: 46px; height: 46px; flex-shrink: 0;
        border-radius: 50%; background: #fff; border: none;
        box-shadow: 0 2px 16px rgba(0,0,0,0.18);
        display: flex; align-items: center; justify-content: center;
        color: var(--color-primary); cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: transform var(--transition-fast);
      }
      .fab-locate-m:disabled { color: var(--color-text-muted); cursor: not-allowed; }
      .fab-locate-m:not(:disabled):active { transform: scale(0.92); }

      /* ── Bottom Sheet ── */
      .sheet {
        display: flex; flex-direction: column;
        position: fixed;
        bottom: calc(56px + env(safe-area-inset-bottom, 0px));
        left: 0; right: 0;
        height: calc(100dvh - 56px - env(safe-area-inset-bottom, 0px) - 56px);
        background: var(--color-surface);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -4px 30px rgba(0,0,0,0.13), 0 -1px 4px rgba(0,0,0,0.06);
        z-index: 50;
        transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1);
        will-change: transform;
        overflow: hidden;
      }

      /* Snap positions: peek / half / full */
      .sheet--snap0 { transform: translateY(calc(100% - 76px)); }
      .sheet--snap1 { transform: translateY(calc(100% - 48vh)); }
      .sheet--snap2 { transform: translateY(0); }

      .sheet-handle-bar {
        padding: 8px 16px 10px; flex-shrink: 0;
        cursor: grab; user-select: none; touch-action: none;
        border-bottom: 1px solid var(--color-border-subtle);
      }

      .sheet-drag-pill {
        width: 38px; height: 4px;
        background: var(--color-border);
        border-radius: 100px;
        margin: 0 auto 10px;
      }

      .sheet-header-row {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }

      .sheet-title-group {
        display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;
      }

      .sheet-title {
        font-size: var(--font-size-md); font-weight: 700; color: var(--color-text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        display: flex; align-items: center; gap: 6px;
      }

      .fuel-chip {
        font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 100px;
        background: var(--color-primary-light); color: var(--color-primary-dark); flex-shrink: 0;
      }

      .filters-pill-btn {
        display: flex; align-items: center; gap: 5px;
        padding: 7px 13px;
        background: var(--color-surface-3);
        border: 1.5px solid var(--color-border);
        border-radius: 100px;
        font-size: var(--font-size-xs); font-family: var(--font-family); font-weight: 700;
        color: var(--color-text-secondary); cursor: pointer; flex-shrink: 0; white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
        transition: background var(--transition-fast);
      }
      .filters-pill-btn:active { background: var(--color-border); }

      .sheet-body {
        flex: 1; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }

      .sheet-header-actions {
        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
      }

      .sheet-icon-btn {
        width: 34px; height: 34px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        background: var(--color-surface-3); border: 1.5px solid var(--color-border);
        border-radius: 50%; color: var(--color-text-secondary); cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background var(--transition-fast);
      }
      .sheet-icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .sheet-icon-btn:not(:disabled):active { background: var(--color-border); }

      .sheet-search-block {
        padding: 12px 12px 8px;
        border-bottom: 1px solid var(--color-border-subtle);
      }

      .sheet-route-block {
        flex: 1; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .sheet-error {
        display: flex; align-items: center; gap: 8px;
        background: var(--color-error-bg); color: var(--color-error);
        padding: 10px 16px; font-size: var(--font-size-sm); font-weight: 500;
        margin: 8px 12px; border-radius: var(--radius-md);
      }

      .sheet-section-title {
        display: flex; align-items: center; gap: 6px;
        font-size: var(--font-size-xs); font-weight: 700;
        color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.6px;
        padding: 12px 16px 6px;
      }
      .sheet-section-title--top3 { color: #b45309; }

      .sheet-empty {
        padding: 28px 16px; font-size: var(--font-size-sm);
        color: var(--color-text-muted); text-align: center;
      }

      .sheet-hint {
        display: flex; flex-direction: column; align-items: center; gap: 14px;
        padding: 36px 28px;
        color: var(--color-text-muted); font-size: var(--font-size-sm);
        text-align: center; line-height: 1.6;
      }
      .sheet-hint svg { color: var(--color-primary); opacity: 0.4; }

      .sheet-share-row { padding: 8px 12px 0; }

      .sheet-freshness {
        display: flex; align-items: center; gap: 4px;
        padding: 10px 16px 16px;
        font-size: 10px; color: var(--color-text-tertiary);
      }

      /* ── Bottom Navigation ── */
      .bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: calc(56px + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        z-index: 60;
        box-shadow: 0 -1px 10px rgba(0,0,0,0.07);
      }

      .nav-tab {
        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 3px; background: none; border: none;
        font-family: var(--font-family); font-size: 10px; font-weight: 600;
        color: var(--color-text-muted); cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: color var(--transition-fast);
      }
      .nav-tab--active { color: var(--color-primary); }
      .nav-tab--active svg { stroke: var(--color-primary); }

      /* ── Filters Modal ── */
      .filters-overlay {
        display: flex; /* overrides the display:none from desktop rules */
        position: fixed; inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 200;
        align-items: flex-end;
        animation: overlay-in 0.2s ease;
      }
      @keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }

      .filters-modal {
        width: 100%; background: var(--color-surface);
        border-radius: 20px 20px 0 0;
        max-height: 82vh; display: flex; flex-direction: column;
        animation: sheet-in 0.32s cubic-bezier(0.32, 0.72, 0, 1);
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      @keyframes sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }

      .filters-modal-header {
        padding: 8px 20px 0; flex-shrink: 0;
      }
      .filters-modal-drag {
        width: 38px; height: 4px; background: var(--color-border);
        border-radius: 100px; margin: 0 auto 12px;
      }
      .filters-modal-titlebar {
        display: flex; align-items: center; justify-content: space-between;
        padding-bottom: 12px; border-bottom: 1px solid var(--color-border-subtle);
      }
      .filters-modal-title { font-size: var(--font-size-md); font-weight: 700; color: var(--color-text-primary); }
      .filters-modal-close {
        width: 34px; height: 34px; background: var(--color-surface-3); border: none; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: var(--color-text-secondary); cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .filters-modal-close:active { background: var(--color-border); }

      .filters-modal-body { overflow-y: auto; flex: 1; }
    }
  `],
})
export class AppComponent implements OnInit {
  readonly state           = inject(AppStateService);
  readonly ingestionStatus = inject(IngestionStatusService);
  readonly fuelLabels      = FUEL_LABELS;

  readonly sheetSnap   = signal<0 | 1 | 2>(0);
  readonly filtersOpen = signal(false);

  private _touchStartY: number    = 0;
  private _touchStartSnap: 0|1|2  = 0;
  private _touchMoved               = false;

  constructor() {
    // Auto-expand sheet when switching to route mode so inputs are visible
    effect(() => {
      if (this.state.mode() === 'route' && !untracked(() => this.state.routeData())) {
        this.sheetSnap.set(2);
      }
    });
    // Snap to half when data loads
    effect(() => {
      if (this.state.sidebarOpen()) {
        this.sheetSnap.set(1);
      }
    });
    // Snap to peek when station selected; restore to half when deselected and there are results
    effect(() => {
      const selected = this.state.selectedStation();
      if (selected) {
        this.sheetSnap.set(0);
      } else {
        const hasResults = untracked(() =>
          this.state.mode() === 'route'
            ? this.state.routeStations().length > 0
            : this.state.displayedStations().length > 0
        );
        if (hasResults && untracked(() => this.sheetSnap()) === 0) {
          this.sheetSnap.set(1);
        }
      }
    });
  }

  ngOnInit(): void {
    this.state.restoreFromUrl();
    this.ingestionStatus.startPolling();
  }

  openSearch(): void {
    this.sheetSnap.set(2);
  }

  onHandleTouchStart(e: TouchEvent): void {
    this._touchStartY    = e.touches[0].clientY;
    this._touchStartSnap = this.sheetSnap();
    this._touchMoved     = false;
  }

  onHandleTouchMove(e: TouchEvent): void {
    if (Math.abs(e.touches[0].clientY - this._touchStartY) > 8) {
      this._touchMoved = true;
    }
  }

  onHandleTouchEnd(e: TouchEvent): void {
    const delta = e.changedTouches[0].clientY - this._touchStartY;
    if (!this._touchMoved || Math.abs(delta) < 8) return; // let click handler manage taps
    if (delta > 40)       this.sheetSnap.set(Math.max(0, this._touchStartSnap - 1) as 0|1|2);
    else if (delta < -40) this.sheetSnap.set(Math.min(2, this._touchStartSnap + 1) as 0|1|2);
  }

  onHandleClick(): void {
    if (this._touchMoved) return; // was a drag, not a tap
    const cur = this.sheetSnap();
    this.sheetSnap.set((cur === 0 ? 1 : cur === 1 ? 2 : 0) as 0|1|2);
  }

  onMobileSearch(event: { lat: number; lon: number; label: string }): void {
    this.state.onAddressSelected(event);
    this.sheetSnap.set(1);
  }

  onMobileRoute(req: RouteRequest): void {
    this.state.onRouteRequested(req);
    this.sheetSnap.set(1); // show results at half height, map visible above
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
