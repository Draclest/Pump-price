import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import * as L from 'leaflet';
import { Station, FUEL_LABELS } from '../../models/station.model';
import { openRoute } from '../../utils/navigation.util';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #mapContainer class="map-container"></div>

    <!-- Station bottom panel -->
    @if (selectedStation) {
      <div class="station-panel" role="region" aria-label="Station sélectionnée">
        <div class="panel-drag-handle"></div>

        <div class="panel-header">
          <div class="panel-logo" [style.background]="panelBadgeColor()" aria-hidden="true">
            @if (selectedStation.logo_url) {
              <img [src]="selectedStation.logo_url" [alt]="selectedStation.brand || ''"
                   class="panel-logo-img" (error)="onPanelLogoError($event)" />
            } @else {
              <span class="panel-logo-letter">
                {{ (selectedStation.brand || selectedStation.name || '?').charAt(0).toUpperCase() }}
              </span>
            }
          </div>

          <div class="panel-info">
            <span class="panel-name">{{ selectedStation.name || selectedStation.brand || 'Station' }}</span>
            <div class="panel-meta">
              @if (selectedStation.brand) {
                <span class="panel-brand">{{ selectedStation.brand }}</span>
                <span class="panel-dot">·</span>
              }
              <span class="panel-address">{{ selectedStation.address }}, {{ selectedStation.city }}</span>
            </div>
            @if (selectedStation.is_open !== null && selectedStation.is_open !== undefined) {
              <div class="panel-status">
                <span class="panel-status-badge"
                      [class.panel-status-badge--open]="selectedStation.is_open"
                      [class.panel-status-badge--closed]="!selectedStation.is_open">
                  <span class="status-dot"></span>
                  {{ selectedStation.is_open ? 'Ouvert' : 'Fermé' }}
                  @if (selectedStation.opening_hours_display === 'Ouvert 24h/24') {
                    <span> · 24h/24</span>
                  }
                </span>
              </div>
            }
          </div>

          <button class="panel-close" aria-label="Fermer le panneau de la station"
                  (click)="stationSelected.emit(null); $event.stopPropagation()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Score + distance row -->
        <div class="panel-stats-row">
          @if (selectedStation.score != null) {
            <div class="panel-stat">
              <div class="panel-score"
                   [class.panel-score--green]="selectedStation.score >= 70"
                   [class.panel-score--amber]="selectedStation.score >= 50 && selectedStation.score < 70"
                   [class.panel-score--red]="selectedStation.score < 50">
                {{ selectedStation.score | number:'1.0-0' }}
              </div>
              <span class="panel-stat-label">Score</span>
            </div>
          }
          @if (selectedStation.distance_meters != null) {
            <div class="panel-stat">
              <span class="panel-stat-value">{{ formatDistance(selectedStation.distance_meters) }}</span>
              <span class="panel-stat-label">Distance</span>
            </div>
          }
          @if (selectedStation._route_info) {
            <div class="panel-stat">
              <span class="panel-stat-value"
                    [class.panel-stat-value--ok]="selectedStation._route_info.detour_km <= 2"
                    [class.panel-stat-value--warn]="selectedStation._route_info.detour_km > 2">
                +{{ selectedStation._route_info.detour_km.toFixed(1) }} km
              </span>
              <span class="panel-stat-label">Détour</span>
            </div>
          }
        </div>

        <!-- Fuel prices -->
        <div class="panel-fuels">
          @for (f of selectedStation.fuels; track f.type) {
            <div class="panel-fuel"
                 [class.panel-fuel--highlight]="isFuelHighlighted(f.type)">
              <span class="fuel-name">{{ fuelLabels[f.type] || f.type }}</span>
              <span class="fuel-price">{{ f.price.toFixed(3) }}<span class="fuel-unit">€</span></span>
              <span class="fuel-date">{{ formatFuelDate(f.updated_at) }}</span>
            </div>
          }
        </div>

        <!-- Services -->
        @if (selectedStation.services && selectedStation.services.length > 0) {
          <div class="panel-services">
            <span class="panel-services-title">Services</span>
            <div class="panel-services-chips">
              @for (svc of selectedStation.services; track svc) {
                <span class="panel-service-chip">{{ svc }}</span>
              }
            </div>
          </div>
        }

        <div class="panel-actions">
          <button class="btn-panel btn-panel--route" aria-label="Lancer l'itinéraire"
                  (click)="onOpenRoute()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Itinéraire
          </button>
          <button class="btn-panel btn-panel--history" aria-label="Voir l'historique des prix"
                  (click)="historyRequested.emit(selectedStation)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Historique
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }

    .map-container { width: 100%; height: 100%; }

    /* ── Station panel ── */
    .station-panel {
      position: absolute;
      bottom: 12px; left: 12px; right: 12px;
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

    .panel-drag-handle {
      width: 32px; height: 3px;
      background: var(--color-border);
      border-radius: var(--radius-pill);
      margin: 10px auto 8px;
    }

    .panel-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .panel-logo {
      width: 44px; height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-bg);
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      border: 1px solid var(--color-border-subtle);
    }
    .panel-logo-img    { width: 34px; height: 34px; object-fit: contain; }
    .panel-logo-letter { font-size: 18px; font-weight: 800; color: #fff; text-transform: uppercase; }

    .panel-info { display: flex; flex-direction: column; gap: 3px; overflow: hidden; flex: 1; }

    .panel-name {
      font-size: var(--font-size-md); font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }

    .panel-meta { display: flex; align-items: center; gap: 4px; overflow: hidden; }
    .panel-brand   { font-size: var(--font-size-xs); color: var(--color-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; }
    .panel-dot     { color: var(--color-text-muted); font-size: var(--font-size-xs); }
    .panel-address { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .panel-status { margin-top: 3px; }
    .panel-status-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700;
      padding: 2px 7px; border-radius: var(--radius-pill);
    }
    .panel-status-badge--open   { background: var(--color-primary-light); color: var(--color-primary-dark); }
    .panel-status-badge--closed { background: #fef2f2; color: #dc2626; }

    .status-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .panel-status-badge--open   .status-dot { background: var(--color-primary); }
    .panel-status-badge--closed .status-dot { background: #dc2626; }

    .panel-close {
      background: var(--color-bg); border: none; border-radius: var(--radius-md);
      width: 30px; height: 30px;
      color: var(--color-text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .panel-close:active { background: var(--color-border); }

    /* Stats row */
    .panel-stats-row {
      display: flex; gap: var(--space-3);
      margin-bottom: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    .panel-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
    .panel-stat-value { font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
    .panel-stat-value--ok   { color: var(--color-success); }
    .panel-stat-value--warn { color: var(--color-warning); }
    .panel-stat-label { font-size: 10px; color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }

    .panel-score {
      width: 34px; height: 34px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 800; color: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .panel-score--green { background: var(--color-primary); }
    .panel-score--amber { background: var(--color-warning); }
    .panel-score--red   { background: var(--color-error); }

    /* Fuels */
    .panel-fuels { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }

    .panel-fuel {
      display: flex; flex-direction: column; align-items: center;
      background: var(--color-bg); border-radius: var(--radius-md);
      padding: 6px 10px; min-width: 58px;
      border: 1.5px solid transparent;
    }
    .panel-fuel--highlight { background: var(--color-primary-light); border-color: var(--color-primary-muted); }

    .fuel-name { font-size: 10px; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
    .panel-fuel--highlight .fuel-name { color: var(--color-primary); }

    .fuel-price { font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
    .panel-fuel--highlight .fuel-price { color: var(--color-primary-dark); }

    .fuel-unit  { font-size: var(--font-size-xs); font-weight: 600; margin-left: 1px; }
    .fuel-date  { font-size: 9px; color: var(--color-text-tertiary); margin-top: 2px; }

    /* Services */
    .panel-services { margin-bottom: var(--space-3); }
    .panel-services-title { display: block; font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .panel-services-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .panel-service-chip { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--color-surface-3); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

    /* Actions */
    .panel-actions { display: flex; gap: var(--space-2); }

    .btn-panel {
      flex: 1;
      display: flex; align-items: center; justify-content: center;
      gap: 6px; padding: 10px 0;
      border: none; border-radius: var(--radius-md);
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      cursor: pointer;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-panel:active { transform: scale(0.96); }

    .btn-panel--route { background: var(--color-primary); color: var(--color-text-on-primary); }
    .btn-panel--route:active { background: var(--color-primary-dark); }

    .btn-panel--history { background: var(--color-primary-light); color: var(--color-primary-dark); border: 1.5px solid var(--color-primary-muted); }
    .btn-panel--history:active { background: var(--color-primary-muted); }
  `],
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;

  @Input() stations:        Station[] = [];
  @Input() userLocation:    { lat: number; lon: number } | null = null;
  @Input() selectedStation: Station | null = null;
  @Input() highlightFuel = 'SP95';
  @Input() top3Ids:         string[] = [];
  @Input() routeCoords:     [number, number][] | null = null; // [lon, lat] pairs

  @Input() set hoveredStationId(id: string | null) {
    this._hoveredStationId = id;
    if (this._initialized) this._applyHover(id);
  }

  @Output() readonly stationSelected  = new EventEmitter<Station | null>();
  @Output() readonly historyRequested = new EventEmitter<Station>();

  readonly fuelLabels = FUEL_LABELS;

  private _map!: L.Map;
  private _markers       = new L.LayerGroup();
  private _markerMap     = new Map<string, L.Marker>();
  private _userMarker:   L.Marker | null = null;
  private _routePolyline: L.Polyline | null = null;
  private _previousSelectedId: string | null = null;
  private _hoveredStationId:   string | null = null;
  private _previousHoveredId:  string | null = null;
  private _initialized = false;

  ngAfterViewInit(): void {
    this._initMap();
    this._initialized = true;
    if (this.userLocation)   this._centerOnUser();
    if (this.stations.length) this._rebuildAllMarkers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this._initialized) return;
    if (changes['userLocation']?.currentValue) this._centerOnUser();
    if (changes['stations'] || changes['top3Ids']) this._rebuildAllMarkers();
    if (changes['selectedStation'] && !changes['stations'] && !changes['top3Ids']) this._updateSelectionMarkers();
    if (changes['highlightFuel'] && !changes['stations'] && !changes['top3Ids'])  this._rebuildAllMarkers();
    if (changes['routeCoords']) this._updateRoutePolyline();
  }

  ngOnDestroy(): void {
    this._map?.remove();
  }

  // ── Template helpers ──────────────────────────────────────────────────

  isFuelHighlighted(type: string): boolean {
    if (this.highlightFuel === 'Tous') return type === 'E10' || type === 'SP95';
    return type === this.highlightFuel;
  }

  formatDistance(meters: number): string {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  }

  formatFuelDate(iso: string): string {
    if (!iso) return '';
    try {
      const diffH = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
      if (diffH < 1)  return 'à l\'instant';
      if (diffH < 24) return `il y a ${diffH} h`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7)  return `il y a ${diffD} j`;
      return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  }

  panelBadgeColor(): string {
    return this.selectedStation?.logo_url ? 'var(--color-bg)' : (this.selectedStation?.brand_color ?? '#94a3b8');
  }

  onPanelLogoError(event: Event): void {
    const img    = event.target as HTMLImageElement;
    img.style.display = 'none';
    const letter = img.parentElement?.querySelector<HTMLElement>('.panel-logo-letter');
    if (letter) letter.style.display = 'block';
  }

  onOpenRoute(): void {
    if (this.selectedStation) openRoute(this.selectedStation.location.lat, this.selectedStation.location.lon);
  }

  // ── Private: map logic ────────────────────────────────────────────────

  private _initMap(): void {
    this._map = L.map(this.mapContainer.nativeElement, {
      center: [46.603354, 1.888334],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this._map);

    this._markers.addTo(this._map);
  }

  private _centerOnUser(): void {
    if (!this.userLocation) return;
    const { lat, lon } = this.userLocation;

    this._userMarker?.remove();

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;background:#16a34a;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(22,163,74,0.25),0 2px 6px rgba(0,0,0,0.2)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    this._userMarker = L.marker([lat, lon], { icon })
      .addTo(this._map)
      .bindPopup('Votre position');

    this._map.setView([lat, lon], 13);
  }

  private _rebuildAllMarkers(): void {
    this._markers.clearLayers();
    this._markerMap.clear();

    for (const station of this.stations) {
      const marker = this._createMarker(station, this.selectedStation?.id === station.id);
      this._markers.addLayer(marker);
      this._markerMap.set(station.id, marker);
    }

    this._previousSelectedId = this.selectedStation?.id ?? null;
  }

  private _updateSelectionMarkers(): void {
    if (this._previousSelectedId) {
      const prev = this.stations.find(s => s.id === this._previousSelectedId);
      const m    = prev ? this._markerMap.get(this._previousSelectedId!) : null;
      if (prev && m) m.setIcon(this._buildIcon(prev, false));
    }

    if (this.selectedStation) {
      const m = this._markerMap.get(this.selectedStation.id);
      if (m) {
        m.setIcon(this._buildIcon(this.selectedStation, true));
        this._map.panTo([this.selectedStation.location.lat, this.selectedStation.location.lon]);
      }
    }

    this._previousSelectedId = this.selectedStation?.id ?? null;
  }

  private _applyHover(id: string | null): void {
    if (this._previousHoveredId && this._previousHoveredId !== this.selectedStation?.id) {
      const prev = this.stations.find(s => s.id === this._previousHoveredId);
      const m    = prev ? this._markerMap.get(this._previousHoveredId!) : null;
      if (prev && m) m.setIcon(this._buildIcon(prev, false));
    }
    if (id && id !== this.selectedStation?.id) {
      const st = this.stations.find(s => s.id === id);
      const m  = st ? this._markerMap.get(id) : null;
      if (st && m) { m.setIcon(this._buildIcon(st, false, true)); m.setZIndexOffset(500); }
    }
    this._previousHoveredId = id;
  }

  private _createMarker(station: Station, isSelected: boolean): L.Marker {
    const marker = L.marker(
      [station.location.lat, station.location.lon],
      { icon: this._buildIcon(station, isSelected) }
    );
    marker.on('click', () => this.stationSelected.emit(station));
    return marker;
  }

  private _buildIcon(station: Station, isSelected: boolean, isHovered = false): L.DivIcon {
    const top3Index = this.top3Ids.indexOf(station.id);
    const isTop3    = top3Index !== -1;
    const hoverCls  = isHovered ? 'map-marker--hovered' : '';
    const selCls    = isSelected ? 'map-marker--selected' : '';

    if (isTop3) {
      return L.divIcon({
        className: '',
        html: `<div class="map-marker map-marker--top3 ${selCls} ${hoverCls}">
                 <span class="map-marker__rank">${top3Index + 1}</span>
               </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });
    }

    const matchedFuels = ['E10', 'SP95', 'Tous'].includes(this.highlightFuel)
      ? station.fuels.filter(f => f.type === 'E10' || f.type === 'SP95')
      : station.fuels.filter(f => f.type === this.highlightFuel);

    const bestFuel   = matchedFuels.length ? matchedFuels.reduce((a, b) => a.price < b.price ? a : b) : null;
    const priceLabel = bestFuel ? `${bestFuel.price.toFixed(3)} €` : '—';
    const noPrice    = !bestFuel;

    return L.divIcon({
      className: '',
      html: `<div class="map-marker ${selCls} ${noPrice ? 'map-marker--no-price' : ''} ${hoverCls}">
               <span class="map-marker__price">${priceLabel}</span>
             </div>`,
      iconSize: [66, 28],
      iconAnchor: [33, 28],
    });
  }

  private _updateRoutePolyline(): void {
    this._routePolyline?.remove();
    this._routePolyline = null;

    if (this.routeCoords && this.routeCoords.length > 1) {
      const latLngs: L.LatLngExpression[] = this.routeCoords.map(([lon, lat]) => [lat, lon]);
      this._routePolyline = L.polyline(latLngs, { color: '#3b82f6', weight: 5, opacity: 0.8 })
        .addTo(this._map);
      this._map.invalidateSize();
      this._map.fitBounds(this._routePolyline.getBounds(), { padding: [32, 32] });
    }
  }
}
