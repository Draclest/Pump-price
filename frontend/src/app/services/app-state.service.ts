/**
 * AppStateService — single source of truth for the top-level application state.
 *
 * Holds all signals, computed values, and side-effect logic that was previously
 * packed into AppComponent. The component becomes a thin coordinator that simply
 * binds to this service and dispatches user events.
 */
import { Injectable, computed, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';

import { GeocodingService } from './geocoding.service';
import { GeolocationService } from './geolocation.service';
import { RoutingService, RouteGeometry } from './routing.service';
import { StationService } from './station.service';
import { FilterValues, Station } from '../models/station.model';
import { RouteRequest } from '../components/route-panel/route-panel.component';

export type AppMode = 'nearby' | 'route';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly stationService   = inject(StationService);
  private readonly geoService       = inject(GeolocationService);
  private readonly routingService   = inject(RoutingService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly destroyRef       = inject(DestroyRef);

  // ── Mode ──────────────────────────────────────────────────────────────
  readonly mode = signal<AppMode>('nearby');

  // ── Shared ────────────────────────────────────────────────────────────
  readonly filters  = signal<FilterValues>({ fuelType: 'E10', radiusKm: 10, maxPrice: null, services: [] });
  readonly locating = signal(false);

  /** Resolved position after geoloc + reverse-geocode — fed to address inputs */
  readonly locatedPosition = signal<{ lat: number; lon: number; label: string } | null>(null);

  // ── Nearby mode ───────────────────────────────────────────────────────
  readonly userLocation    = signal<{ lat: number; lon: number } | null>(null);
  readonly locationLabel   = signal<string | null>(null);
  readonly loading         = signal(false);
  readonly error           = signal<string | null>(null);
  readonly hasSearched     = signal(false);

  private readonly _allStations = signal<Station[]>([]);

  readonly displayedStations = computed(() => this._allStations());
  readonly top3              = computed(() => this.displayedStations().slice(0, 3));
  readonly otherStations     = computed(() => this.displayedStations().slice(3));
  readonly top3Ids           = computed(() => this.top3().map(s => s.id));

  // ── Route mode ────────────────────────────────────────────────────────
  readonly routeData    = signal<{ route: RouteGeometry; stations: Station[] } | null>(null);
  readonly routeOrigin  = signal<{ lat: number; lon: number; label: string } | null>(null);
  readonly routeDest    = signal<{ lat: number; lon: number; label: string } | null>(null);
  readonly routeLoading = signal(false);
  readonly routeError   = signal<string | null>(null);
  readonly shareConfirm = signal(false);
  readonly routeMaxDetour = signal(5);
  readonly hasRouteSearched = signal(false);

  readonly routeStations      = computed(() => this.routeData()?.stations ?? []);
  readonly routeTop3          = computed(() => this.routeStations().slice(0, 3));
  readonly routeOtherStations = computed(() => this.routeStations().slice(3));

  readonly routeCoords = computed<[number, number][] | null>(() =>
    (this.routeData()?.route?.coordinates as [number, number][] | undefined) ?? null
  );

  // ── Context ───────────────────────────────────────────────────────────
  /** HTTP + non-localhost → browser blocks geolocation */
  readonly insecureContext = this.geoService.isInsecureContext;

  // ── UI ────────────────────────────────────────────────────────────────
  readonly selectedStation  = signal<Station | null>(null);
  readonly historyStation   = signal<Station | null>(null);
  readonly sidebarOpen      = signal(false);
  readonly hoveredStationId = signal<string | null>(null);
  readonly filtersExpanded  = signal(true);

  // Effective fuel for highlight: 'Tous' → 'SP95'
  readonly effectiveHighlightFuel = computed(() =>
    this.filters().fuelType === 'Tous' ? 'SP95' : this.filters().fuelType
  );

  // Map shows route stations in route mode, otherwise nearby stations
  readonly mapStations = computed(() =>
    this.mode() === 'route' ? this.routeStations() : this.displayedStations()
  );

  // ── Actions ───────────────────────────────────────────────────────────

  locateUser(): void {
    this.locating.set(true);
    this.error.set(null);

    this.geoService.getCurrentPosition().pipe(
      switchMap(pos => {
        this.locating.set(false);
        this.userLocation.set(pos);
        if (this.mode() === 'nearby') this.fetchStations(pos.lat, pos.lon);
        return this.geocodingService.reverseGeocode(pos.lat, pos.lon).pipe(
          switchMap(result => of({ pos, label: result?.label ?? `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ pos, label }) => {
        this.locationLabel.set(label);
        this.locatedPosition.set({ lat: pos.lat, lon: pos.lon, label });
      },
      error: err => {
        this.error.set(err.message ?? 'Géolocalisation impossible');
        this.locating.set(false);
      },
    });
  }

  onAddressSelected(event: { lat: number; lon: number; label: string }): void {
    this.locationLabel.set(event.label);
    this.userLocation.set({ lat: event.lat, lon: event.lon });
    this.fetchStations(event.lat, event.lon);
  }

  fetchStations(lat: number, lon: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.hasSearched.set(true);
    this.filtersExpanded.set(false);

    const f = this.filters();
    this.stationService.recommendStations({
      lat,
      lon,
      radiusKm: f.radiusKm,
      fuelType: f.fuelType !== 'Tous' ? f.fuelType : undefined,
      maxPrice: f.maxPrice,
      services: f.services,
      limit:    50,
    }).subscribe({
      next: stations => {
        this._allStations.set(stations);
        this.loading.set(false);
        if (stations.length > 0) this.sidebarOpen.set(true);
      },
      error: err => {
        this.error.set('Erreur lors de la recherche : ' + err.message);
        this.loading.set(false);
      },
    });
  }

  onFiltersChanged(f: FilterValues): void {
    this.filters.set(f);
    const loc = this.userLocation();
    if (loc) this.fetchStations(loc.lat, loc.lon);
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
    this.filtersExpanded.set(false);
    this.routeOrigin.set({ lat: req.originLat, lon: req.originLon, label: req.origin });
    this.routeDest.set({ lat: req.destLat, lon: req.destLon, label: req.destination });

    const f = this.filters();
    this.routingService.getRouteRecommendations({
      originLat:   req.originLat,
      originLon:   req.originLon,
      destLat:     req.destLat,
      destLon:     req.destLon,
      fuelType:    f.fuelType !== 'Tous' ? f.fuelType : undefined,
      maxPrice:    f.maxPrice,
      maxDetourKm: req.maxDetourKm,
      services:    f.services,
    }).subscribe({
      next: data => {
        this.routeData.set(data);
        this.routeLoading.set(false);
        this.sidebarOpen.set(true);
      },
      error: err => {
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
      mode:   'route',
      olat:   String(origin.lat),
      olon:   String(origin.lon),
      olabel: origin.label,
      dlat:   String(dest.lat),
      dlon:   String(dest.lon),
      dlabel: dest.label,
      fuel:   this.filters().fuelType,
      radius: String(this.filters().radiusKm),
      detour: String(this.routeMaxDetour()),
    });

    const url     = `${window.location.origin}${window.location.pathname}?${params}`;
    const confirm = () => {
      this.shareConfirm.set(true);
      setTimeout(() => this.shareConfirm.set(false), 2500);
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(confirm).catch(() => this._fallbackCopy(url, confirm));
    } else {
      this._fallbackCopy(url, confirm);
    }
  }

  openGoogleMaps(station: Station): void {
    const origin = this.routeOrigin();
    const dest   = this.routeDest();
    if (!origin || !dest) return;
    const url = this.routingService.exportToGoogleMaps({
      originLat:   origin.lat,
      originLon:   origin.lon,
      destLat:     dest.lat,
      destLon:     dest.lon,
      waypointLat: station.location.lat,
      waypointLon: station.location.lon,
    });
    window.open(url, '_blank');
  }

  /** Restore a shared route from URL query params (called on app init). */
  restoreFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
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
      origin:      olabel, originLat: olat, originLon: olon,
      destination: dlabel, destLat:   dlat, destLon:   dlon,
      maxDetourKm: detour,
    });
  }

  // ── Private ───────────────────────────────────────────────────────────

  private _fallbackCopy(text: string, onSuccess: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); onSuccess(); } catch { /* silent */ }
    document.body.removeChild(ta);
  }
}
