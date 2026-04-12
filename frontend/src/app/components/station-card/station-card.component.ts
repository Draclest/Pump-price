import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station, FUEL_LABELS } from '../../models/station.model';
import { openRoute } from '../../utils/navigation.util';

@Component({
  selector: 'app-station-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="card"
      [class.card--selected]="selected"
      (click)="select.emit(station)"
      role="button"
      [attr.aria-pressed]="selected"
      [attr.aria-label]="cardAriaLabel"
      tabindex="0"
      (keydown.enter)="select.emit(station)"
      (keydown.space)="select.emit(station)"
    >
      <!-- Top row -->
      <div class="card-top">

        <!-- Brand logo or letter badge -->
        <div class="card-logo" [style.background]="badgeColor()" aria-hidden="true">
          <img
            *ngIf="station.logo_url"
            [src]="station.logo_url"
            [alt]="station.brand || ''"
            class="logo-img"
            (error)="onLogoError($event)"
          />
          <span *ngIf="!station.logo_url" class="logo-letter">
            {{ brandInitial() }}
          </span>
        </div>

        <!-- Name & address -->
        <div class="card-info">
          <div class="card-name-row">
            <span class="card-name">{{ station.name || station.brand || 'Station sans nom' }}</span>
            <span class="card-brand" *ngIf="station.brand && station.brand !== station.name">
              {{ station.brand }}
            </span>
          </div>
          <span class="card-address">{{ station.address }}, {{ station.city }}</span>

          <!-- Open / closed badge -->
          <div class="card-status-row">
            <span
              *ngIf="station.is_open === true"
              class="status-badge status-badge--open"
              role="status"
              aria-label="Station ouverte"
            >
              <span class="status-dot"></span>Ouvert
            </span>
            <span
              *ngIf="station.is_open === false"
              class="status-badge status-badge--closed"
              role="status"
              aria-label="Station fermée"
            >
              <span class="status-dot"></span>Fermé
            </span>
            <span
              class="status-hours"
              *ngIf="station.opening_hours_display && station.opening_hours_display !== 'Ouvert 24h/24'"
              [title]="station.opening_hours || ''"
            >
              {{ station.opening_hours_display }}
            </span>
            <span class="status-hours" *ngIf="station.opening_hours_display === 'Ouvert 24h/24'">
              24h/24
            </span>
          </div>
        </div>

        <!-- Right: distance + best price -->
        <div class="card-right">
          <span class="card-distance" *ngIf="station.distance_meters != null">
            {{ formatDistance(station.distance_meters) }}
          </span>
          <span class="card-best-price" *ngIf="highlightPrice() != null">
            {{ highlightPrice()!.toFixed(3) }}&nbsp;€
          </span>
        </div>
      </div>

      <!-- Fuel badges -->
      <div class="card-fuels">
        <div
          *ngFor="let fuel of station.fuels"
          class="fuel-badge"
          [class.fuel-badge--highlight]="fuel.type === highlightFuel"
        >
          <span class="badge-type">{{ fuelLabels[fuel.type] || fuel.type }}</span>
          <span class="badge-price">{{ fuel.price.toFixed(3) }}<span class="badge-unit">€</span></span>
        </div>
      </div>

      <!-- OSM attribution -->
      <div class="card-osm" *ngIf="station.osm_last_updated">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        MAJ OSM&nbsp;: {{ formatOsmDate(station.osm_last_updated) }}
      </div>

      <!-- Actions -->
      <div class="card-actions" (click)="$event.stopPropagation()">
        <button
          class="btn-card btn-card--route"
          (click)="openRoute()"
          [attr.aria-label]="routeAriaLabel"
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Itinéraire
        </button>
        <button
          class="btn-card btn-card--history"
          (click)="historyRequested.emit(station)"
          [attr.aria-label]="historyAriaLabel"
          type="button"
        >
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
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      margin: 0 var(--space-3) var(--space-2);
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
      border: 1.5px solid transparent;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    .card:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }
    .card--selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-muted), var(--shadow-md);
    }
    .card:active { transform: scale(0.985); }

    /* Top row */
    .card-top {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    /* Logo badge */
    .card-logo {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-bg);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 1px solid var(--color-border-subtle);
    }

    .logo-img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .logo-letter {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      text-transform: uppercase;
      line-height: 1;
    }

    /* Info */
    .card-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow: hidden;
      flex: 1;
    }

    .card-name-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      overflow: hidden;
    }

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

    .card-address {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Status row */
    .card-status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 1px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-pill);
    }

    .status-badge--open {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
    }

    .status-badge--closed {
      background: #fef2f2;
      color: #dc2626;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-badge--open  .status-dot { background: var(--color-primary); }
    .status-badge--closed .status-dot { background: #dc2626; }

    .status-hours {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Right column */
    .card-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }

    .card-distance {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums;
    }

    .card-best-price {
      font-size: var(--font-size-md);
      font-weight: 800;
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.5px;
    }

    /* Fuel badges */
    .card-fuels {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .fuel-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--color-bg);
      border-radius: var(--radius-md);
      padding: 5px 9px;
      min-width: 54px;
      border: 1.5px solid transparent;
    }

    .fuel-badge--highlight {
      background: var(--color-primary-light);
      border-color: var(--color-primary-muted);
    }

    .badge-type {
      font-size: 10px;
      color: var(--color-text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .fuel-badge--highlight .badge-type { color: var(--color-primary); }

    .badge-price {
      font-size: var(--font-size-sm);
      font-weight: 800;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.3px;
    }

    .fuel-badge--highlight .badge-price { color: var(--color-primary-dark); }

    .badge-unit {
      font-size: var(--font-size-xs);
      font-weight: 600;
      margin-left: 1px;
    }

    /* OSM attribution */
    .card-osm {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      color: var(--color-text-muted);
      margin-bottom: var(--space-2);
    }

    /* Actions */
    .card-actions {
      display: flex;
      gap: var(--space-2);
    }

    .btn-card {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
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
    .btn-card:active { transform: scale(0.94); }

    .btn-card--route {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
    }
    .btn-card--route:active { background: var(--color-primary-dark); }

    .btn-card--history {
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      border: 1.5px solid var(--color-primary-muted);
    }
    .btn-card--history:active { background: var(--color-primary-muted); }
  `]
})
export class StationCardComponent {
  @Input() station!: Station;
  @Input() selected = false;
  @Input() highlightFuel = 'SP95';
  @Output() select = new EventEmitter<Station>();
  @Output() historyRequested = new EventEmitter<Station>();

  fuelLabels = FUEL_LABELS;

  brandInitial(): string {
    const name = this.station.brand || this.station.name || '?';
    return name.charAt(0).toUpperCase();
  }

  badgeColor(): string {
    if (this.station.logo_url) return 'var(--color-bg)';
    return this.station.brand_color || '#94a3b8';
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Show parent letter badge
    const letter = img.parentElement?.querySelector('.logo-letter') as HTMLElement | null;
    if (letter) letter.style.display = 'block';
  }

  highlightPrice(): number | null {
    return this.station.fuels.find(f => f.type === this.highlightFuel)?.price ?? null;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  formatOsmDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  get routeAriaLabel(): string {
    return 'Itinéraire vers ' + (this.station.name || this.station.brand || 'cette station');
  }

  get historyAriaLabel(): string {
    return 'Historique ' + (this.station.name || this.station.brand || 'cette station');
  }

  get cardAriaLabel(): string {
    const name  = this.station.name || this.station.brand || 'Station sans nom';
    const dist  = this.station.distance_meters != null
      ? ' à ' + this.formatDistance(this.station.distance_meters) : '';
    const price = this.highlightPrice() != null
      ? ', ' + this.highlightFuel + ' à ' + this.highlightPrice()!.toFixed(3) + ' €' : '';
    const open  = this.station.is_open === true ? ', ouverte'
                : this.station.is_open === false ? ', fermée' : '';
    return name + dist + price + open;
  }

  openRoute(): void {
    openRoute(this.station.location.lat, this.station.location.lon);
  }
}
