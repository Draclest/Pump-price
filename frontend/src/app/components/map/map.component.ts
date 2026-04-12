import {
  Component, OnDestroy, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Station, FUEL_LABELS } from '../../models/station.model';
import { openRoute } from '../../utils/navigation.util';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="map-container"></div>

    <!-- Station bottom panel -->
    <div class="station-panel" *ngIf="selectedStation" role="region" aria-label="Station sélectionnée">
      <div class="panel-drag-handle"></div>

      <div class="panel-header">
        <!-- Logo badge -->
        <div class="panel-logo" [style.background]="panelBadgeColor()" aria-hidden="true">
          <img
            *ngIf="selectedStation.logo_url"
            [src]="selectedStation.logo_url"
            [alt]="selectedStation.brand || ''"
            class="panel-logo-img"
            (error)="onPanelLogoError($event)"
          />
          <span *ngIf="!selectedStation.logo_url" class="panel-logo-letter">
            {{ (selectedStation.brand || selectedStation.name || '?').charAt(0).toUpperCase() }}
          </span>
        </div>

        <div class="panel-info">
          <span class="panel-name">{{ selectedStation.name || selectedStation.brand || 'Station' }}</span>
          <div class="panel-meta">
            <span class="panel-brand" *ngIf="selectedStation.brand">{{ selectedStation.brand }}</span>
            <span class="panel-dot" *ngIf="selectedStation.brand">·</span>
            <span class="panel-address">{{ selectedStation.address }}, {{ selectedStation.city }}</span>
          </div>
          <!-- Open/closed status -->
          <div class="panel-status" *ngIf="selectedStation.is_open !== null && selectedStation.is_open !== undefined">
            <span class="panel-status-badge" [class.panel-status-badge--open]="selectedStation.is_open"
                                              [class.panel-status-badge--closed]="!selectedStation.is_open">
              <span class="status-dot"></span>
              {{ selectedStation.is_open ? 'Ouvert' : 'Fermé' }}
              <span *ngIf="selectedStation.opening_hours_display === 'Ouvert 24h/24'"> · 24h/24</span>
            </span>
          </div>
        </div>
        <button
          class="panel-close"
          (click)="stationSelected.emit(null); $event.stopPropagation()"
          aria-label="Fermer le panneau de la station"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="panel-fuels">
        <div
          *ngFor="let f of selectedStation.fuels"
          class="panel-fuel"
          [class.panel-fuel--highlight]="f.type === highlightFuel"
        >
          <span class="fuel-name">{{ fuelLabels[f.type] || f.type }}</span>
          <span class="fuel-price">{{ f.price.toFixed(3) }}<span class="fuel-unit">€</span></span>
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn-panel btn-panel--route" (click)="onOpenRoute()" aria-label="Lancer l'itinéraire">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Itinéraire
        </button>
        <button class="btn-panel btn-panel--history" (click)="historyRequested.emit(selectedStation)" aria-label="Voir l'historique des prix">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Historique
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }

    .map-container {
      width: 100%;
      height: 100%;
    }

    /* ── Station panel ── */
    .station-panel {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      padding: 0 var(--space-4) var(--space-3);
      z-index: 500;
      animation: panel-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes panel-in {
      from { transform: translateY(24px) scale(0.97); opacity: 0; }
      to   { transform: translateY(0)    scale(1);    opacity: 1; }
    }

    /* Logo */
    .panel-logo {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-bg);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid var(--color-border-subtle);
    }

    .panel-logo-img {
      width: 34px;
      height: 34px;
      object-fit: contain;
    }

    .panel-logo-letter {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
      text-transform: uppercase;
    }

    /* Status badge */
    .panel-status {
      margin-top: 3px;
    }

    .panel-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-pill);
    }

    .panel-status-badge--open   { background: var(--color-primary-light); color: var(--color-primary-dark); }
    .panel-status-badge--closed { background: #fef2f2; color: #dc2626; }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .panel-status-badge--open   .status-dot { background: var(--color-primary); }
    .panel-status-badge--closed .status-dot { background: #dc2626; }

    .panel-drag-handle {
      width: 32px;
      height: 3px;
      background: var(--color-border);
      border-radius: var(--radius-pill);
      margin: 10px auto 8px;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .panel-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow: hidden;
      flex: 1;
    }

    .panel-name {
      font-size: var(--font-size-md);
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }

    .panel-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
    }

    .panel-brand {
      font-size: var(--font-size-xs);
      color: var(--color-primary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      flex-shrink: 0;
    }

    .panel-dot {
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
    }

    .panel-address {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .panel-close {
      background: var(--color-bg);
      border: none;
      border-radius: var(--radius-md);
      width: 30px;
      height: 30px;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .panel-close:active { background: var(--color-border); }

    /* Fuels */
    .panel-fuels {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .panel-fuel {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--color-bg);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      min-width: 58px;
      border: 1.5px solid transparent;
    }

    .panel-fuel--highlight {
      background: var(--color-primary-light);
      border-color: var(--color-primary-muted);
    }

    .fuel-name {
      font-size: 10px;
      color: var(--color-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .panel-fuel--highlight .fuel-name {
      color: var(--color-primary);
    }

    .fuel-price {
      font-size: var(--font-size-md);
      font-weight: 800;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.5px;
    }

    .panel-fuel--highlight .fuel-price {
      color: var(--color-primary-dark);
    }

    .fuel-unit {
      font-size: var(--font-size-xs);
      font-weight: 600;
      margin-left: 1px;
    }

    /* Actions */
    .panel-actions {
      display: flex;
      gap: var(--space-2);
    }

    .btn-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 0;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      cursor: pointer;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-panel:active { transform: scale(0.96); }

    .btn-panel--route {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
    }
    .btn-panel--route:active { background: var(--color-primary-dark); }

    .btn-panel--history {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      border: 1.5px solid var(--color-primary-muted);
    }
    .btn-panel--history:active { background: var(--color-primary-muted); }
  `]
})
export class MapComponent implements OnDestroy, OnChanges, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() stations: Station[] = [];
  @Input() userLocation: { lat: number; lon: number } | null = null;
  @Input() selectedStation: Station | null = null;
  @Input() highlightFuel = 'SP95';
  @Input() top3Ids: string[] = [];
  @Input() routeCoords: [number, number][] | null = null;  // [lon, lat] pairs
  @Output() stationSelected = new EventEmitter<Station | null>();
  @Output() historyRequested = new EventEmitter<Station>();

  fuelLabels = FUEL_LABELS;

  private map!: L.Map;
  private markers = new L.LayerGroup();
  private markerMap = new Map<string, L.Marker>();
  private userMarker: L.Marker | null = null;
  private routePolyline: L.Polyline | null = null;
  private previousSelectedId: string | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    this.initMap();
    this.initialized = true;
    if (this.userLocation) this.centerOnUser();
    if (this.stations.length) this.rebuildAllMarkers();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['userLocation']?.currentValue) this.centerOnUser();
    if (changes['stations'] || changes['top3Ids']) this.rebuildAllMarkers();
    if (changes['selectedStation'] && !changes['stations'] && !changes['top3Ids']) this.updateSelectionMarkers();
    if (changes['highlightFuel'] && !changes['stations'] && !changes['top3Ids']) this.rebuildAllMarkers();
    if (changes['routeCoords']) this.updateRoutePolyline();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [46.603354, 1.888334],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.markers.addTo(this.map);
  }

  private centerOnUser(): void {
    if (!this.userLocation) return;
    const { lat, lon } = this.userLocation;

    if (this.userMarker) this.userMarker.remove();

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width: 16px; height: 16px;
        background: #16a34a;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(22,163,74,0.25), 0 2px 6px rgba(0,0,0,0.2);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    this.userMarker = L.marker([lat, lon], { icon })
      .addTo(this.map)
      .bindPopup('Votre position');

    this.map.setView([lat, lon], 13);
  }

  private rebuildAllMarkers(): void {
    this.markers.clearLayers();
    this.markerMap.clear();

    this.stations.forEach((station) => {
      const isSelected = this.selectedStation?.id === station.id;
      const marker = this.createMarker(station, isSelected);
      this.markers.addLayer(marker);
      this.markerMap.set(station.id, marker);
    });

    this.previousSelectedId = this.selectedStation?.id ?? null;
  }

  private updateSelectionMarkers(): void {
    if (this.previousSelectedId) {
      const prev = this.stations.find(s => s.id === this.previousSelectedId);
      if (prev) {
        const m = this.markerMap.get(this.previousSelectedId);
        m?.setIcon(this.buildIcon(prev, false));
      }
    }

    if (this.selectedStation) {
      const m = this.markerMap.get(this.selectedStation.id);
      m?.setIcon(this.buildIcon(this.selectedStation, true));
      this.map.panTo([this.selectedStation.location.lat, this.selectedStation.location.lon]);
    }

    this.previousSelectedId = this.selectedStation?.id ?? null;
  }

  private createMarker(station: Station, isSelected: boolean): L.Marker {
    const marker = L.marker(
      [station.location.lat, station.location.lon],
      { icon: this.buildIcon(station, isSelected) }
    );
    marker.on('click', () => this.stationSelected.emit(station));
    return marker;
  }

  private buildIcon(station: Station, isSelected: boolean): L.DivIcon {
    const top3Index = this.top3Ids.indexOf(station.id);
    const isTop3 = top3Index !== -1;

    if (isTop3) {
      const rank = top3Index + 1;
      return L.divIcon({
        className: '',
        html: `<div class="map-marker map-marker--top3 ${isSelected ? 'map-marker--selected' : ''}">
          <span class="map-marker__rank">${rank}</span>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });
    }

    const fuelForHighlight = station.fuels.find(f => f.type === this.highlightFuel);
    const priceLabel = fuelForHighlight ? `${fuelForHighlight.price.toFixed(3)} €` : '—';
    const noPrice = !fuelForHighlight;
    return L.divIcon({
      className: '',
      html: `<div class="map-marker ${isSelected ? 'map-marker--selected' : ''} ${noPrice ? 'map-marker--no-price' : ''}">
        <span class="map-marker__price">${priceLabel}</span>
      </div>`,
      iconSize: [66, 28],
      iconAnchor: [33, 28],
    });
  }

  panelBadgeColor(): string {
    if (this.selectedStation?.logo_url) return 'var(--color-bg)';
    return this.selectedStation?.brand_color || '#94a3b8';
  }

  onPanelLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const letter = img.parentElement?.querySelector('.panel-logo-letter') as HTMLElement | null;
    if (letter) letter.style.display = 'block';
  }

  private updateRoutePolyline(): void {
    if (this.routePolyline) {
      this.routePolyline.remove();
      this.routePolyline = null;
    }
    if (this.routeCoords && this.routeCoords.length > 1) {
      // Convert [lon, lat] to Leaflet [lat, lon]
      const latLngs: L.LatLngExpression[] = this.routeCoords.map(([lon, lat]) => [lat, lon]);
      this.routePolyline = L.polyline(latLngs, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
      }).addTo(this.map);
      this.map.invalidateSize();
      this.map.fitBounds(this.routePolyline.getBounds(), { padding: [32, 32] });
    }
  }

  onOpenRoute(): void {
    if (!this.selectedStation) return;
    openRoute(this.selectedStation.location.lat, this.selectedStation.location.lon);
  }
}
