import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Station, FUEL_LABELS, ScoreBreakdown } from '../../models/station.model';
import { openRoute } from '../../utils/navigation.util';

interface ScoreRow {
  key:   string;
  label: string;
  color: string;
  value: number;
}

@Component({
  selector: 'app-station-card',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card"
         [class.card--selected]="selected"
         role="button"
         [attr.aria-pressed]="selected"
         [attr.aria-label]="cardAriaLabel"
         tabindex="0"
         (click)="select.emit(station)"
         (mouseenter)="hovered.emit(station.id)"
         (mouseleave)="hovered.emit(null)"
         (keydown.enter)="select.emit(station)"
         (keydown.space)="select.emit(station)">

      <!-- Top row: logo + info + price hero -->
      <div class="card-top">

        <!-- Brand badge -->
        <div class="card-logo" [style.background]="badgeColor()" aria-hidden="true">
          @if (station.logo_url) {
            <img [src]="station.logo_url" [alt]="station.brand || ''" class="logo-img"
                 (error)="onLogoError($event)" />
          }
          @if (!station.logo_url) {
            <span class="logo-letter">{{ brandInitial() }}</span>
          }
        </div>

        <!-- Name, address, status -->
        <div class="card-info">
          <div class="card-name-row">
            <span class="card-name">{{ station.name || station.brand || 'Station' }}</span>
            @if (station.brand && station.brand !== station.name) {
              <span class="card-brand">{{ station.brand }}</span>
            }
          </div>
          <span class="card-address">{{ station.address }}, {{ station.city }}</span>

          <div class="card-meta-row">
            @if (station.distance_meters != null) {
              <span class="meta-chip meta-chip--distance">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ formatDistance(station.distance_meters) }}
              </span>
            }
            @if (routeMode && station._route_info) {
              <span class="meta-chip"
                    [class.meta-chip--detour-ok]="station._route_info.detour_km <= 2"
                    [class.meta-chip--detour-far]="station._route_info.detour_km > 2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                {{ station._route_info.detour_km.toFixed(1) }}&thinsp;km détour
              </span>
            }
            @if (station.is_open === true) {
              <span class="meta-chip meta-chip--open">
                <span class="status-dot" aria-hidden="true"></span>Ouvert
              </span>
            }
            @if (station.is_open === false) {
              <span class="meta-chip meta-chip--closed">
                <span class="status-dot" aria-hidden="true"></span>Fermé
              </span>
            }
          </div>
        </div>

        <!-- Price hero + score -->
        <div class="card-right">
          @if (station.score != null) {
            <div class="score-wrap">
              <div class="score-badge"
                   [class.score-badge--green]="station.score >= 70"
                   [class.score-badge--amber]="station.score >= 50 && station.score < 70"
                   [class.score-badge--red]="station.score < 50"
                   [attr.aria-label]="'Score: ' + station.score + '/100'"
                   title="Score global">
                {{ station.score | number:'1.0-0' }}
              </div>
              @if (scoreBreakdownRows.length > 0) {
                <div class="score-tooltip">
                  <div class="tooltip-title">Composition du score</div>
                  @for (c of scoreBreakdownRows; track c.key) {
                    <div class="tooltip-row" [class.tooltip-row--primary]="c.key === 'price' || c.key === 'detour' || c.key === 'distance'">
                      <span class="tooltip-label">{{ c.label }}</span>
                      <div class="tooltip-bar-track">
                        <div class="tooltip-bar-fill" [style.width.%]="c.value" [style.background]="c.color"></div>
                      </div>
                      <span class="tooltip-value">{{ c.value | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
          @if (station.matched_fuel) {
            <span class="card-best-price">{{ station.matched_fuel.price.toFixed(3) }}&nbsp;€</span>
            <span class="card-fuel-type">{{ fuelLabels[station.matched_fuel.type] || station.matched_fuel.type }}</span>
          } @else if (highlightPrice() != null) {
            <span class="card-best-price">{{ highlightPrice()!.toFixed(3) }}&nbsp;€</span>
          }
        </div>
      </div>

      <!-- Rec label -->
      @if (station.recommendation_label) {
        <div class="rec-label" [attr.aria-label]="station.recommendation_label">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ station.recommendation_label }}
        </div>
      }

      <!-- Fuel price badges -->
      <div class="card-fuels">
        @for (fuel of station.fuels; track fuel.type) {
          <div class="fuel-badge" [class.fuel-badge--highlight]="fuel.type === highlightFuel">
            <span class="badge-type">{{ fuelLabels[fuel.type] || fuel.type }}</span>
            <span class="badge-price">{{ fuel.price.toFixed(3) }}<span class="badge-unit">€</span></span>
          </div>
        }
      </div>

      <!-- OSM attribution -->
      @if (station.osm_last_updated) {
        <div class="card-osm">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          MAJ&nbsp;: {{ formatOsmDate(station.osm_last_updated) }}
        </div>
      }

      <!-- Actions -->
      <div class="card-actions" (click)="$event.stopPropagation()">
        @if (routeMode) {
          <button class="btn-card btn-card--gmaps btn-card--full" type="button"
                  [attr.aria-label]="'Itinéraire via Google Maps vers ' + (station.name || station.brand || 'cette station')"
                  (click)="exportToMaps.emit()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Itinéraire via Google Maps
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                 style="margin-left:2px;opacity:0.65">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>
        } @else {
          <button class="btn-card btn-card--primary" type="button"
                  [attr.aria-label]="'Itinéraire vers ' + (station.name || station.brand || 'cette station')"
                  (click)="openRoute()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Itinéraire
          </button>
        }
        <button class="btn-card btn-card--secondary" type="button"
                [attr.aria-label]="'Historique ' + (station.name || station.brand || 'cette station')"
                (click)="historyRequested.emit(station)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Historique
        </button>
      </div>
    </div>
  `,
  styles: [`
    .card {
      position: relative;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      margin: 0 var(--space-3) var(--space-2);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
      border: 1.5px solid var(--color-border-subtle);
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    .card:hover          { box-shadow: var(--shadow-md); border-color: var(--color-border); }
    .card:focus-visible  { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
    .card--selected      { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-muted), var(--shadow-md); }
    .card:active         { transform: scale(0.985); }

    .card-top { display: flex; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2); }

    .card-logo {
      width: 40px; height: 40px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .logo-img    { width: 32px; height: 32px; object-fit: contain; }
    .logo-letter { font-size: 17px; font-weight: 800; color: #fff; text-transform: uppercase; line-height: 1; }

    .card-info { display: flex; flex-direction: column; gap: 3px; overflow: hidden; flex: 1; }

    .card-name-row { display: flex; align-items: baseline; gap: 6px; overflow: hidden; }

    .card-name {
      font-size: var(--font-size-md);
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.2px;
    }

    .card-brand {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.4px;
      flex-shrink: 0;
    }

    .card-address { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-meta-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 2px; }

    .meta-chip {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 600;
      padding: 2px 6px;
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }
    .meta-chip--distance    { background: var(--color-surface-3); color: var(--color-text-secondary); }
    .meta-chip--open        { background: var(--color-success-bg); color: var(--color-success); }
    .meta-chip--closed      { background: var(--color-error-bg); color: var(--color-error); }
    .meta-chip--detour-ok   { background: var(--color-success-bg); color: var(--color-success); }
    .meta-chip--detour-far  { background: var(--color-warning-bg); color: var(--color-warning); }

    .status-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; background: currentColor; }

    .card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }

    .card-best-price {
      font-size: 18px; font-weight: 800;
      color: var(--color-price-good);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.8px;
      line-height: 1.1;
    }
    .card-fuel-type { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-align: right; }

    .score-wrap { position: relative; display: inline-flex; margin-bottom: 3px; }

    .score-badge {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800;
      color: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.18);
      cursor: help;
      flex-shrink: 0;
    }
    .score-badge--green { background: var(--color-primary); }
    .score-badge--amber { background: var(--color-warning); }
    .score-badge--red   { background: var(--color-error); }

    .score-tooltip {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 210px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 10px 12px;
      z-index: 200;
      pointer-events: none;
    }
    .score-wrap:hover .score-tooltip { display: block; }

    .tooltip-title { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }

    .tooltip-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }

    .tooltip-label { font-size: 11px; color: var(--color-text-secondary); width: 58px; flex-shrink: 0; }
    .tooltip-row--primary .tooltip-label { font-weight: 700; color: var(--color-text-primary); }

    .tooltip-bar-track { flex: 1; height: 6px; background: var(--color-bg); border-radius: 3px; overflow: hidden; }
    .tooltip-row--primary .tooltip-bar-track { height: 9px; border-radius: 4px; }

    .tooltip-bar-fill { height: 100%; border-radius: 3px; }

    .tooltip-value { font-size: 10px; font-weight: 700; color: var(--color-text-secondary); width: 24px; text-align: right; }
    .tooltip-row--primary .tooltip-value { font-size: 11px; color: var(--color-text-primary); }

    .rec-label {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700;
      color: var(--color-warning);
      background: var(--color-warning-bg);
      border: 1px solid var(--color-warning-border);
      border-radius: var(--radius-pill);
      padding: 3px 8px;
      margin-bottom: var(--space-2);
    }

    .card-fuels { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }

    .fuel-badge {
      display: flex; flex-direction: column; align-items: center;
      background: var(--color-surface-3);
      border-radius: var(--radius-md);
      padding: 5px 9px;
      min-width: 52px;
      border: 1.5px solid transparent;
    }
    .fuel-badge--highlight { background: var(--color-primary-subtle); border-color: var(--color-primary-muted); }

    .badge-type { font-size: 10px; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
    .fuel-badge--highlight .badge-type { color: var(--color-primary); }

    .badge-price { font-size: var(--font-size-sm); font-weight: 800; color: var(--color-text-primary); font-variant-numeric: tabular-nums; letter-spacing: -0.3px; }
    .fuel-badge--highlight .badge-price { color: var(--color-primary-dark); }

    .badge-unit { font-size: var(--font-size-xs); font-weight: 600; margin-left: 1px; }

    .card-osm { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--color-text-tertiary); margin-bottom: var(--space-2); }

    .card-actions { display: flex; gap: var(--space-2); }

    .btn-card {
      flex: 1;
      display: flex; align-items: center; justify-content: center;
      gap: 5px;
      padding: 8px 0;
      border-radius: var(--radius-md);
      font-size: var(--font-size-xs);
      font-family: var(--font-family);
      font-weight: 700;
      cursor: pointer;
      transition: all var(--transition-fast);
      border: none;
      -webkit-tap-highlight-color: transparent;
    }
    .btn-card:active { transform: scale(0.95); }

    .btn-card--primary { background: var(--color-primary); color: #fff; }
    .btn-card--primary:hover  { background: var(--color-primary-dark); }

    .btn-card--secondary { background: var(--color-surface-3); color: var(--color-text-secondary); border: 1.5px solid var(--color-border); }
    .btn-card--secondary:hover { background: var(--color-border); }

    .btn-card--gmaps { background: #eff6ff; color: var(--color-accent-blue-text); border: 1.5px solid var(--color-accent-blue-border); }
    .btn-card--gmaps:hover  { background: #dbeafe; }
    .btn-card--gmaps:active { background: var(--color-accent-blue-border); }

    .btn-card--full { flex: 2; }
  `],
})
export class StationCardComponent {
  @Input({ required: true }) station!: Station;
  @Input() selected      = false;
  @Input() highlightFuel = 'SP95';
  @Input() routeMode     = false;
  @Input() originLat?: number;
  @Input() originLon?: number;
  @Input() destLat?: number;
  @Input() destLon?: number;

  @Output() readonly select          = new EventEmitter<Station>();
  @Output() readonly historyRequested = new EventEmitter<Station>();
  @Output() readonly hovered         = new EventEmitter<string | null>();
  @Output() readonly exportToMaps    = new EventEmitter<void>();

  readonly fuelLabels = FUEL_LABELS;

  brandInitial(): string {
    return (this.station.brand || this.station.name || '?').charAt(0).toUpperCase();
  }

  badgeColor(): string {
    return this.station.logo_url ? 'var(--color-bg)' : (this.station.brand_color ?? '#94a3b8');
  }

  onLogoError(event: Event): void {
    const img    = event.target as HTMLImageElement;
    img.style.display = 'none';
    const letter = img.parentElement?.querySelector<HTMLElement>('.logo-letter');
    if (letter) letter.style.display = 'block';
  }

  highlightPrice(): number | null {
    return this.station.fuels.find(f => f.type === this.highlightFuel)?.price ?? null;
  }

  formatDistance(meters: number): string {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  }

  formatOsmDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  get cardAriaLabel(): string {
    const name  = this.station.name || this.station.brand || 'Station sans nom';
    const dist  = this.station.distance_meters != null ? ` à ${this.formatDistance(this.station.distance_meters)}` : '';
    const price = this.highlightPrice() != null ? `, ${this.highlightFuel} à ${this.highlightPrice()!.toFixed(3)} €` : '';
    const open  = this.station.is_open === true ? ', ouverte' : this.station.is_open === false ? ', fermée' : '';
    return `${name}${dist}${price}${open}`;
  }

  get scoreBreakdownRows(): ScoreRow[] {
    const bd = this.station.score_breakdown;
    if (!bd) return [];
    const defs: { key: keyof ScoreBreakdown; label: string; color: string }[] = [
      { key: 'price',     label: 'Prix',      color: '#15803d' },
      { key: 'detour',    label: 'Détour',    color: '#b45309' },
      { key: 'distance',  label: 'Distance',  color: '#1d4ed8' },
      { key: 'freshness', label: 'Fraîcheur', color: '#7c3aed' },
      { key: 'services',  label: 'Services',  color: '#0891b2' },
    ];
    return defs
      .filter(d => bd[d.key] !== undefined)
      .map(d => ({ key: d.key, label: d.label, color: d.color, value: bd[d.key] as number }));
  }

  openRoute(): void {
    openRoute(this.station.location.lat, this.station.location.lon);
  }
}
