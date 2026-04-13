import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { switchMap, of, catchError } from 'rxjs';
import { GeocodingService } from './services/geocoding.service';

import { MapComponent } from './components/map/map.component';
import { FiltersComponent } from './components/filters/filters.component';
import { StationCardComponent } from './components/station-card/station-card.component';
import { AddressSearchComponent } from './components/address-search/address-search.component';
import { PriceHistoryComponent } from './components/price-history/price-history.component';
import { RoutePanelComponent, RouteRequest } from './components/route-panel/route-panel.component';
import { StationService } from './services/station.service';
import { GeolocationService } from './services/geolocation.service';
import { RoutingService, RouteGeometry } from './services/routing.service';
import { FUEL_LABELS, FilterValues, Station } from './models/station.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent, FiltersComponent, StationCardComponent,
    AddressSearchComponent, PriceHistoryComponent, RoutePanelComponent,
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

        <!-- Mode tabs -->
        <div class="mode-tabs">
          <button class="mode-tab" [class.mode-tab--active]="mode() === 'nearby'" (click)="mode.set('nearby')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            À proximité
          </button>
          <button class="mode-tab" [class.mode-tab--active]="mode() === 'route'" (click)="mode.set('route')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M3 3h7l7 9-7 9H3l7-9z"/>
            </svg>
            Itinéraire
          </button>
        </div>

        <!-- NEARBY MODE -->
        <ng-container *ngIf="mode() === 'nearby'">
          <!-- Address search -->
          <div class="sidebar-search">
            <app-address-search
              [prefill]="locatedPosition()"
              (locationSelected)="onAddressSelected($event)"
            ></app-address-search>
          </div>

          <!-- Filters collapsible -->
          <div class="sidebar-filters">
            <button class="filters-toggle" (click)="filtersExpanded.set(!filtersExpanded())" type="button"
                    [attr.aria-expanded]="filtersExpanded()">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="filtersExpanded()">
              <app-filters
                [values]="filters()"
                [drawerMode]="false"
                (changed)="onFiltersChanged($event)"
              ></app-filters>
            </div>
          </div>

          <!-- Error — only after a search attempt -->
          <div class="sidebar-error" role="alert" *ngIf="error() && hasSearched()">
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

            <!-- No results — only after a search -->
            <div class="sidebar-empty" *ngIf="displayedStations().length === 0 && hasSearched()">
              Aucune station trouv\u00e9e dans ce rayon
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
              (hovered)="hoveredStationId.set($event)"
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
              (hovered)="hoveredStationId.set($event)"
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
        </ng-container>

        <!-- ROUTE MODE -->
        <ng-container *ngIf="mode() === 'route'">
          <div class="sidebar-search">
            <app-route-panel
              [prefillOrigin]="locatedPosition()"
              (routeRequested)="onRouteRequested($event)"
              (routeCleared)="onRouteCleared()"
            ></app-route-panel>
          </div>

          <!-- Filters collapsible (route mode) -->
          <div class="sidebar-filters">
            <button class="filters-toggle" (click)="filtersExpanded.set(!filtersExpanded())" type="button"
                    [attr.aria-expanded]="filtersExpanded()">
              <span class="filters-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                  <line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                Filtres
              </span>
              <svg class="filters-chevron" [class.filters-chevron--open]="filtersExpanded()"
                   width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="filters-body" [class.filters-body--open]="filtersExpanded()">
              <app-filters
                [values]="filters()"
                [drawerMode]="false"
                (changed)="onFiltersChanged($event)"
              ></app-filters>
            </div>
          </div>

          <!-- Route error — only after a route has been requested -->
          <div class="sidebar-error" role="alert" *ngIf="routeError() && hasRouteSearched()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ routeError() }}
          </div>

          <!-- Route loading -->
          <ng-container *ngIf="routeLoading()">
            <div class="sidebar-section-title">Calcul en cours…</div>
            <div class="skeleton-card" *ngFor="let i of [1,2,3]">
              <div class="sk-line sk-line--title"></div>
              <div class="sk-line sk-line--sub"></div>
              <div class="sk-badges">
                <div class="sk-badge" *ngFor="let j of [1,2,3]"></div>
              </div>
            </div>
          </ng-container>

          <!-- Route results -->
          <ng-container *ngIf="!routeLoading() && routeData()">
            <!-- Share button -->
            <div class="sidebar-share-row">
              <button class="btn-share" (click)="shareRoute()" type="button">
                <svg *ngIf="!shareConfirm()" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                {{ shareConfirm() ? '✓ Lien copié !' : 'Partager l\'itinéraire' }}
              </button>
            </div>

            <div class="sidebar-section-title sidebar-section-title--top3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Top stations sur le trajet
            </div>

            <div class="sidebar-empty" *ngIf="routeStations().length === 0">
              Aucune station sur cet itinéraire
            </div>

            <app-station-card
              *ngFor="let s of routeTop3(); trackBy: trackById"
              [station]="s"
              [selected]="selectedStation()?.id === s.id"
              [highlightFuel]="filters().fuelType"
              [routeMode]="true"
              [originLat]="routeOrigin()?.lat"
              [originLon]="routeOrigin()?.lon"
              [destLat]="routeDest()?.lat"
              [destLon]="routeDest()?.lon"
              (select)="onStationSelected($event)"
              (historyRequested)="historyStation.set($event)"
              (hovered)="hoveredStationId.set($event)"
              (exportToMaps)="openGoogleMaps(s)"
            ></app-station-card>

            <ng-container *ngIf="routeOtherStations().length > 0">
              <div class="sidebar-section-title">
                Autres stations sur le trajet
                <span class="section-count">{{ routeOtherStations().length }}</span>
              </div>
              <app-station-card
                *ngFor="let s of routeOtherStations(); trackBy: trackById"
                [station]="s"
                [selected]="selectedStation()?.id === s.id"
                [highlightFuel]="filters().fuelType"
                [routeMode]="true"
                [originLat]="routeOrigin()?.lat"
                [originLon]="routeOrigin()?.lon"
                [destLat]="routeDest()?.lat"
                [destLon]="routeDest()?.lon"
                (select)="onStationSelected($event)"
                (historyRequested)="historyStation.set($event)"
              (hovered)="hoveredStationId.set($event)"
                (exportToMaps)="openGoogleMaps(s)"
              ></app-station-card>
            </ng-container>
          </ng-container>

          <!-- Hint when no route yet -->
          <div class="sidebar-hint" *ngIf="!routeLoading() && !routeData()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M3 3h7l7 9-7 9H3l7-9z"/>
            </svg>
            <span>Entrez un départ et une destination pour trouver des stations sur votre route</span>
          </div>
        </ng-container>

        <!-- Ad zone — sticky bottom of sidebar -->
        <div class="ad-zone" aria-label="Espace publicitaire">
          <span class="ad-zone__label">Annonce</span>
          <div class="ad-zone__slot">
            <!-- 320×80 ad slot — replace with actual ad tag -->
            <span class="ad-zone__placeholder">Espace publicitaire</span>
          </div>
        </div>

      </aside>

      <!-- ── Map area ── -->
      <div class="map-area">
        <app-map
          [stations]="mapStations()"
          [userLocation]="userLocation()"
          [selectedStation]="selectedStation()"
          [highlightFuel]="filters().fuelType"
          [top3Ids]="top3Ids()"
          [routeCoords]="routeCoords()"
          [hoveredStationId]="hoveredStationId()"
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
    }

    /* ── Mode Tabs ── */
    .mode-tabs {
      display: flex;
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .mode-tab {
      flex: 1;
      padding: 12px;
      border: none;
      background: none;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-bottom: 2px solid transparent;
    }

    .mode-tab--active {
      color: var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
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
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
    }

    .filters-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      -webkit-tap-highlight-color: transparent;
    }
    .filters-toggle:hover { background: var(--color-surface-3); }

    .filters-toggle-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .filters-chevron {
      color: var(--color-text-muted);
      transition: transform var(--transition-fast);
    }
    .filters-chevron--open {
      transform: rotate(180deg);
    }

    .filters-body {
      display: none;
      padding: 0 var(--space-4) var(--space-3);
    }
    .filters-body--open {
      display: block;
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

    /* ── Share row ── */
    .sidebar-share-row {
      padding: var(--space-2) var(--space-4) 0;
    }

    .btn-share {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 9px var(--space-4);
      background: var(--color-accent-blue-bg);
      border: 1.5px solid var(--color-accent-blue-border);
      border-radius: var(--radius-md);
      color: var(--color-accent-blue);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      cursor: pointer;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .btn-share:active { opacity: 0.8; transform: scale(0.98); }

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

    /* ── Ad zone ── */
    .ad-zone {
      margin-top: auto;
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
      flex-shrink: 0;
    }

    .ad-zone__label {
      display: block;
      font-size: 9px;
      font-weight: 600;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 5px;
    }

    .ad-zone__slot {
      min-height: 80px;
      border-radius: var(--radius-md);
      background: var(--color-surface-3);
      border: 1px dashed var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ad-zone__placeholder {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
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
export class AppComponent implements OnInit {
  readonly fuelLabels = FUEL_LABELS;
  private stationService = inject(StationService);
  private geolocationService = inject(GeolocationService);
  private routingService = inject(RoutingService);
  private geocodingService = inject(GeocodingService);

  // Mode
  mode = signal<'nearby' | 'route'>('nearby');

  // Nearby mode
  userLocation  = signal<{ lat: number; lon: number } | null>(null);
  locationLabel = signal<string | null>(null);
  selectedStation = signal<Station | null>(null);
  loading     = signal(false);
  locating    = signal(false);
  error       = signal<string | null>(null);
  filters     = signal<FilterValues>({ fuelType: 'E10', radiusKm: 10, maxPrice: null, services: [] });
  historyStation = signal<Station | null>(null);
  sidebarOpen = signal(false);
  hoveredStationId = signal<string | null>(null);

  // UI state
  filtersExpanded = signal(true);
  hasSearched     = signal(false);  // true after first nearby search attempt
  hasRouteSearched = signal(false); // true after first route search attempt

  // Geoloc result shared between modes
  locatedPosition = signal<{ lat: number; lon: number; label: string } | null>(null);

  private _allStations = signal<Station[]>([]);

  displayedStations = computed(() => this._allStations());
  top3 = computed(() => this.displayedStations().slice(0, 3));
  otherStations = computed(() => this.displayedStations().slice(3));
  top3Ids = computed(() => this.top3().map(s => s.id));

  // Route mode
  routeData       = signal<{ route: RouteGeometry; stations: Station[] } | null>(null);
  routeOrigin     = signal<{ lat: number; lon: number; label: string } | null>(null);
  routeDest       = signal<{ lat: number; lon: number; label: string } | null>(null);
  routeLoading    = signal(false);
  routeError      = signal<string | null>(null);
  shareConfirm    = signal(false);
  routeMaxDetour  = signal(5);

  routeStations   = computed(() => this.routeData()?.stations ?? []);
  routeTop3        = computed(() => this.routeStations().slice(0, 3));
  routeOtherStations = computed(() => this.routeStations().slice(3));

  routeCoords = computed<[number, number][] | null>(() =>
    (this.routeData()?.route?.coordinates as [number, number][] | undefined) ?? null
  );

  // Map shows route stations in route mode, otherwise nearby stations
  mapStations = computed(() =>
    this.mode() === 'route' ? this.routeStations() : this.displayedStations()
  );

  ngOnInit(): void {
    const search = window.location.search;
    if (!search) return;
    const params = new URLSearchParams(search);
    if (params.get('mode') !== 'route') return;

    const olat   = parseFloat(params.get('olat')   ?? '');
    const olon   = parseFloat(params.get('olon')   ?? '');
    const olabel = params.get('olabel') ?? '';
    const dlat   = parseFloat(params.get('dlat')   ?? '');
    const dlon   = parseFloat(params.get('dlon')   ?? '');
    const dlabel = params.get('dlabel') ?? '';
    const fuel   = params.get('fuel')   ?? 'E10';
    const radius = parseInt(params.get('radius') ?? '10', 10);
    const detour = parseInt(params.get('detour') ?? '5',  10);

    if (isNaN(olat) || isNaN(olon) || isNaN(dlat) || isNaN(dlon)) return;

    this.mode.set('route');
    this.routeMaxDetour.set(detour);
    this.filters.set({ ...this.filters(), fuelType: fuel as any, radiusKm: radius });
    this.onRouteRequested({
      origin: olabel, originLat: olat, originLon: olon,
      destination: dlabel, destLat: dlat, destLon: dlon,
      maxDetourKm: detour,
    });
  }

  trackById(_: number, s: Station): string { return s.id; }

  locateUser(): void {
    this.locating.set(true);
    this.error.set(null);
    this.geolocationService.getCurrentPosition().subscribe({
      next: (pos) => {
        this.locating.set(false);
        this.userLocation.set(pos);
        // Reverse-geocode to get a readable label, then populate active mode's address field
        this.geocodingService.reverseGeocode(pos.lat, pos.lon).subscribe({
          next: (result) => {
            const label = result?.label ?? `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}`;
            this.locationLabel.set(label);
            this.locatedPosition.set({ lat: pos.lat, lon: pos.lon, label });
          },
          error: () => {
            const label = 'Ma position';
            this.locationLabel.set(label);
            this.locatedPosition.set({ lat: pos.lat, lon: pos.lon, label });
          },
        });
        if (this.mode() === 'nearby') {
          this._fetchStations(pos.lat, pos.lon);
        }
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
    this.hasSearched.set(true);
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

  onRouteRequested(req: RouteRequest): void {
    if (req.originLat == null || req.originLon == null || req.destLat == null || req.destLon == null) {
      this.routeError.set('Impossible de géocoder les adresses.');
      return;
    }
    this.routeLoading.set(true);
    this.routeError.set(null);
    this.routeData.set(null);
    this.hasRouteSearched.set(true);
    this.routeOrigin.set({ lat: req.originLat, lon: req.originLon, label: req.origin });
    this.routeDest.set({ lat: req.destLat, lon: req.destLon, label: req.destination });

    const f = this.filters();
    this.routingService.getRouteRecommendations({
      originLat: req.originLat,
      originLon: req.originLon,
      destLat: req.destLat,
      destLon: req.destLon,
      fuelType: f.fuelType !== 'Tous' ? f.fuelType : undefined,
      maxPrice: f.maxPrice,
      maxDetourKm: req.maxDetourKm,
      services: f.services,
    }).subscribe({
      next: (data) => {
        this.routeData.set(data);
        this.routeLoading.set(false);
        this.sidebarOpen.set(true);
      },
      error: (err) => {
        this.routeError.set('Erreur itinéraire : ' + (err.message ?? err.status));
        this.routeLoading.set(false);
      },
    });
  }

  onRouteCleared(): void {
    this.routeData.set(null);
    this.routeOrigin.set(null);
    this.routeDest.set(null);
    this.routeError.set(null);
  }

  shareRoute(): void {
    const origin = this.routeOrigin();
    const dest   = this.routeDest();
    if (!origin || !dest) return;
    const params = new URLSearchParams({
      mode:    'route',
      olat:    String(origin.lat),
      olon:    String(origin.lon),
      olabel:  origin.label,
      dlat:    String(dest.lat),
      dlon:    String(dest.lon),
      dlabel:  dest.label,
      fuel:    this.filters().fuelType,
      radius:  String(this.filters().radiusKm),
      detour:  String(this.routeMaxDetour()),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      this.shareConfirm.set(true);
      setTimeout(() => this.shareConfirm.set(false), 2500);
    });
  }

  openGoogleMaps(station: Station): void {
    const origin = this.routeOrigin();
    const dest   = this.routeDest();
    if (!origin || !dest) return;
    const url = this.routingService.exportToGoogleMaps({
      originLat: origin.lat,
      originLon: origin.lon,
      destLat: dest.lat,
      destLon: dest.lon,
      waypointLat: station.location.lat,
      waypointLon: station.location.lon,
    });
    window.open(url, '_blank');
  }
}
