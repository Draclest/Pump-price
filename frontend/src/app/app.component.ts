import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent } from './components/filters/filters.component';
import { StationCardComponent } from './components/station-card/station-card.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { RoutePanelComponent } from './components/route-panel/route-panel.component';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MapComponent,
    FiltersComponent,
    StationCardComponent,
    AddressSearchComponent,
    PriceHistoryComponent,
    RoutePanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">

      <!-- ── Left Sidebar ── -->
      <aside class="sidebar" [class.sidebar--open]="state.sidebarOpen()">

        <!-- Header -->
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
            <button class="btn-icon btn-icon--primary" type="button"
                    [disabled]="state.locating()"
                    title="Me localiser" aria-label="Me localiser"
                    (click)="state.locateUser()">
              @if (!state.locating()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
                  <circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>
                </svg>
              } @else {
                <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
            </button>
          } @else {
            <span class="https-badge" title="Géolocalisation indisponible en HTTP. Utilisez HTTPS ou entrez votre adresse manuellement.">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
              HTTPS requis
            </span>
          }

          <button class="btn-icon sidebar-close-btn" type="button" aria-label="Fermer la liste"
                  (click)="state.sidebarOpen.set(false)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Mode tabs -->
        <div class="mode-tabs" role="tablist">
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'nearby'"
                  [attr.aria-selected]="state.mode() === 'nearby'"
                  (click)="state.mode.set('nearby')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            À proximité
          </button>
          <button class="mode-tab" type="button" role="tab"
                  [class.mode-tab--active]="state.mode() === 'route'"
                  [attr.aria-selected]="state.mode() === 'route'"
                  (click)="state.mode.set('route')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M3 3h7l7 9-7 9H3l7-9z"/>
            </svg>
            Itinéraire
          </button>
        </div>

        <!-- ── NEARBY MODE ── -->
        @if (state.mode() === 'nearby') {
          <div class="sidebar-search">
            <app-address-search
              [prefill]="state.locatedPosition()"
              (locationSelected)="state.onAddressSelected($event)"
            ></app-address-search>
          </div>

          <div class="sidebar-filters">
            <button class="filters-toggle" type="button" [attr.aria-expanded]="state.filtersExpanded()"
                    (click)="state.filtersExpanded.set(!state.filtersExpanded())">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="state.filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="state.filtersExpanded()">
              <app-filters [values]="state.filters()" [drawerMode]="false"
                           (changed)="state.onFiltersChanged($event)">
              </app-filters>
            </div>
          </div>

          @if (state.error() && state.hasSearched()) {
            <div class="sidebar-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.error() }}
            </div>
          }

          <!-- Initial load skeleton (no results yet) -->
          @if (state.loading() && state.displayedStations().length === 0) {
            <div class="sidebar-section-title">Chargement…</div>
            @for (_ of [1, 2, 3]; track $index) {
              <div class="skeleton-card">
                <div class="sk-line sk-line--title"></div>
                <div class="sk-line sk-line--sub"></div>
                <div class="sk-badges">
                  @for (__ of [1, 2, 3]; track $index) { <div class="sk-badge"></div> }
                </div>
              </div>
            }
          }

          <!-- Results (visible even while refreshing) -->
          @if (state.userLocation()) {
            <!-- Refresh progress bar — shown only when reloading existing results -->
            @if (state.loading() && state.displayedStations().length > 0) {
              <div class="refresh-bar" role="status" aria-label="Actualisation en cours">
                <div class="refresh-bar__track"></div>
              </div>
            }

            <div class="results-list" [class.results-list--refreshing]="state.loading()">
              @if (state.displayedStations().length === 0 && state.hasSearched() && !state.loading()) {
                <div class="sidebar-empty">Aucune station trouvée dans ce rayon</div>
              }

              @if (state.top3().length > 0) {
                <div class="sidebar-section-title sidebar-section-title--top3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Top 3
                </div>
                @for (s of state.top3(); track s.id) {
                  <app-station-card [station]="s"
                                    [selected]="state.selectedStation()?.id === s.id"
                                    [highlightFuel]="state.effectiveHighlightFuel()"
                                    (select)="state.onStationSelected($event)"
                                    (historyRequested)="state.historyStation.set($event)"
                                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }

              @if (state.otherStations().length > 0) {
                <div class="sidebar-section-title">
                  Autres stations
                  <span class="section-count">{{ state.otherStations().length }}</span>
                </div>
                @for (s of state.otherStations(); track s.id) {
                  <app-station-card [station]="s"
                                    [selected]="state.selectedStation()?.id === s.id"
                                    [highlightFuel]="state.effectiveHighlightFuel()"
                                    (select)="state.onStationSelected($event)"
                                    (historyRequested)="state.historyStation.set($event)"
                                    (hovered)="state.hoveredStationId.set($event)">
                  </app-station-card>
                }
              }
            </div>
          }

          @if (!state.loading() && !state.userLocation()) {
            <div class="sidebar-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              <span>Localisez-vous ou entrez une adresse pour voir les stations</span>
            </div>
          }
        }

        <!-- ── ROUTE MODE ── -->
        @if (state.mode() === 'route') {
          <div class="sidebar-search">
            <app-route-panel
              [prefillOrigin]="state.locatedPosition()"
              (routeRequested)="state.onRouteRequested($event)"
              (routeCleared)="state.onRouteCleared()"
            ></app-route-panel>
          </div>

          <div class="sidebar-filters">
            <button class="filters-toggle" type="button" [attr.aria-expanded]="state.filtersExpanded()"
                    (click)="state.filtersExpanded.set(!state.filtersExpanded())">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="state.filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="state.filtersExpanded()">
              <app-filters [values]="state.filters()" [drawerMode]="false"
                           (changed)="state.onFiltersChanged($event)">
              </app-filters>
            </div>
          </div>

          @if (state.routeError() && state.hasRouteSearched()) {
            <div class="sidebar-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ state.routeError() }}
            </div>
          }

          <!-- Initial route load skeleton -->
          @if (state.routeLoading() && state.routeStations().length === 0) {
            <div class="sidebar-section-title">Calcul en cours…</div>
            @for (_ of [1, 2, 3]; track $index) {
              <div class="skeleton-card">
                <div class="sk-line sk-line--title"></div>
                <div class="sk-line sk-line--sub"></div>
                <div class="sk-badges">
                  @for (__ of [1, 2, 3]; track $index) { <div class="sk-badge"></div> }
                </div>
              </div>
            }
          }

          <!-- Route refresh bar -->
          @if (state.routeLoading() && state.routeStations().length > 0) {
            <div class="refresh-bar" role="status" aria-label="Actualisation en cours">
              <div class="refresh-bar__track"></div>
            </div>
          }

          @if (state.routeData()) {
            <div class="results-list" [class.results-list--refreshing]="state.routeLoading()">
            <div class="sidebar-share-row">
              <button class="btn-share" type="button" (click)="state.shareRoute()">
                @if (!state.shareConfirm()) {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                }
                {{ state.shareConfirm() ? '✓ Lien copié !' : "Partager l'itinéraire" }}
              </button>
            </div>

            <div class="sidebar-section-title sidebar-section-title--top3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Top stations sur le trajet
            </div>

            @if (state.routeStations().length === 0) {
              <div class="sidebar-empty">Aucune station sur cet itinéraire</div>
            }

            @for (s of state.routeTop3(); track s.id) {
              <app-station-card [station]="s"
                                [selected]="state.selectedStation()?.id === s.id"
                                [highlightFuel]="state.effectiveHighlightFuel()"
                                [routeMode]="true"
                                [originLat]="state.routeOrigin()?.lat"
                                [originLon]="state.routeOrigin()?.lon"
                                [destLat]="state.routeDest()?.lat"
                                [destLon]="state.routeDest()?.lon"
                                (select)="state.onStationSelected($event)"
                                (historyRequested)="state.historyStation.set($event)"
                                (hovered)="state.hoveredStationId.set($event)"
                                (exportToMaps)="state.openGoogleMaps(s)">
              </app-station-card>
            }

            @if (state.routeOtherStations().length > 0) {
              <div class="sidebar-section-title">
                Autres stations sur le trajet
                <span class="section-count">{{ state.routeOtherStations().length }}</span>
              </div>
              @for (s of state.routeOtherStations(); track s.id) {
                <app-station-card [station]="s"
                                  [selected]="state.selectedStation()?.id === s.id"
                                  [highlightFuel]="state.effectiveHighlightFuel()"
                                  [routeMode]="true"
                                  [originLat]="state.routeOrigin()?.lat"
                                  [originLon]="state.routeOrigin()?.lon"
                                  [destLat]="state.routeDest()?.lat"
                                  [destLon]="state.routeDest()?.lon"
                                  (select)="state.onStationSelected($event)"
                                  (historyRequested)="state.historyStation.set($event)"
                                  (hovered)="state.hoveredStationId.set($event)"
                                  (exportToMaps)="state.openGoogleMaps(s)">
                </app-station-card>
              }
            }
            </div><!-- /results-list -->
          }

          @if (!state.routeLoading() && !state.routeData()) {
            <div class="sidebar-hint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M3 3h7l7 9-7 9H3l7-9z"/>
              </svg>
              <span>Entrez un départ et une destination pour trouver des stations sur votre route</span>
            </div>
          }
        }

        <!-- Ad zone — sticky bottom via margin-top: auto -->
        <div class="ad-zone" aria-label="Espace publicitaire">
          <span class="ad-zone__label">Annonce</span>
          <div class="ad-zone__slot">
            <span class="ad-zone__placeholder">Espace publicitaire</span>
          </div>
        </div>

      </aside>

      <!-- ── Map area ── -->
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
          (historyRequested)="state.historyStation.set($event)"
        ></app-map>

        <!-- Mobile: floating list button -->
        <button class="fab-list" type="button" aria-label="Afficher la liste"
                (click)="state.sidebarOpen.set(true)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Liste
          @if (state.displayedStations().length > 0) {
            <span class="fab-count">{{ state.displayedStations().length }}</span>
          }
        </button>
      </div>

      <!-- History modal -->
      @if (state.historyStation()) {
        <app-price-history
          [station]="state.historyStation()!"
          (close)="state.historyStation.set(null)"
        ></app-price-history>
      }

    </div>
  `,
  styles: [`
    .app-shell { display: flex; height: 100dvh; background: var(--color-bg); overflow: hidden; }

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
    }

    /* ── Mode Tabs ── */
    .mode-tabs { display: flex; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }

    .mode-tab {
      flex: 1; padding: 12px;
      border: none; background: none;
      font-weight: 600; color: var(--color-text-muted); cursor: pointer;
      font-size: var(--font-size-sm); font-family: var(--font-family);
      transition: all var(--transition-fast);
      display: flex; align-items: center; justify-content: center; gap: 6px;
      border-bottom: 2px solid transparent;
    }
    .mode-tab--active { color: var(--color-primary); border-bottom-color: var(--color-primary); }

    /* ── Sidebar Header ── */
    .sidebar-header {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 12px var(--space-4) var(--space-3);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
      position: sticky; top: 0; z-index: 5;
    }

    .sidebar-brand { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; }

    .brand-icon { color: var(--color-primary); flex-shrink: 0; }

    .brand-title {
      font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary);
      margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;
    }

    .btn-icon {
      position: relative; width: 38px; height: 38px;
      border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
      background: var(--color-surface); color: var(--color-text-secondary);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent; flex-shrink: 0;
    }
    .btn-icon:active { transform: scale(0.93); }
    .btn-icon--primary { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-on-primary); }
    .btn-icon--primary:disabled { background: var(--color-text-muted); border-color: var(--color-text-muted); cursor: not-allowed; }
    .btn-icon--primary:not(:disabled):active { background: var(--color-primary-dark); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    .https-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: var(--font-size-xs); font-weight: 600;
      color: var(--color-warning);
      background: var(--color-warning-bg);
      border: 1px solid var(--color-warning-border);
      border-radius: var(--radius-pill);
      padding: 4px 10px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .sidebar-close-btn { display: none; }

    /* ── Sidebar sections ── */
    .sidebar-search { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }

    .sidebar-filters { border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }

    .filters-toggle {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      background: none; border: none; cursor: pointer;
      font-family: var(--font-family);
      -webkit-tap-highlight-color: transparent;
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

    /* ── Share row ── */
    .sidebar-share-row { padding: var(--space-2) var(--space-4) 0; }

    .btn-share {
      display: flex; align-items: center; gap: 6px;
      width: 100%; padding: 9px var(--space-4);
      background: var(--color-accent-blue-bg);
      border: 1.5px solid var(--color-accent-blue-border);
      border-radius: var(--radius-md);
      color: var(--color-accent-blue);
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      cursor: pointer; justify-content: center;
      transition: all var(--transition-fast);
    }
    .btn-share:active { opacity: 0.8; transform: scale(0.98); }

    /* ── Map area ── */
    .map-area { flex: 1; min-width: 0; position: relative; }

    /* ── FAB (mobile only) ── */
    .fab-list {
      display: none;
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--color-surface); border: none; border-radius: var(--radius-pill);
      box-shadow: var(--shadow-lg); padding: 10px 20px;
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      color: var(--color-text-primary); cursor: pointer;
      align-items: center; gap: 8px; z-index: 10;
      -webkit-tap-highlight-color: transparent;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }
    .fab-list:active { transform: translateX(-50%) scale(0.95); }

    .fab-count {
      background: var(--color-primary); color: var(--color-text-on-primary);
      font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: var(--radius-pill);
    }

    /* ── Skeleton cards ── */
    .skeleton-card {
      margin: 0 var(--space-3) var(--space-2);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      box-shadow: var(--shadow-sm);
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

    /* ── Refresh bar ── */
    .refresh-bar {
      margin: 0 var(--space-3) var(--space-2);
      height: 3px;
      border-radius: var(--radius-pill);
      background: var(--color-border);
      overflow: hidden;
    }
    .refresh-bar__track {
      height: 100%;
      background: var(--color-primary);
      border-radius: var(--radius-pill);
      animation: refresh-slide 1.2s ease-in-out infinite;
    }
    @keyframes refresh-slide {
      0%   { transform: translateX(-100%); width: 60%; }
      50%  { transform: translateX(80%);   width: 60%; }
      100% { transform: translateX(200%);  width: 60%; }
    }

    /* ── Refreshing state — keep cards visible but dimmed ── */
    .results-list--refreshing {
      opacity: 0.55;
      pointer-events: none;
      transition: opacity 150ms ease;
    }

    /* ── Ad zone ── */
    .ad-zone {
      margin-top: auto;
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
    }
    .ad-zone__label {
      display: block; font-size: 9px; font-weight: 600; color: var(--color-text-tertiary);
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px;
    }
    .ad-zone__slot {
      min-height: 80px; border-radius: var(--radius-md);
      background: var(--color-surface-3); border: 1px dashed var(--color-border);
      display: flex; align-items: center; justify-content: center;
    }
    .ad-zone__placeholder { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

    /* ── Mobile (≤768px) ── */
    @media (max-width: 768px) {
      .app-shell { flex-direction: column; }

      .sidebar {
        position: fixed; bottom: 0; left: 0; right: 0;
        width: 100%; height: 85vh;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        box-shadow: var(--shadow-sheet);
        z-index: 50;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      .sidebar--open { transform: translateY(0); }
      .sidebar-close-btn { display: flex; }
      .map-area { position: absolute; inset: 0; }
      .fab-list { display: flex; }
    }
  `],
})
export class AppComponent implements OnInit {
  /** Expose the service directly to the template — no forwarding methods needed. */
  readonly state = inject(AppStateService);

  ngOnInit(): void {
    this.state.restoreFromUrl();
  }
}
