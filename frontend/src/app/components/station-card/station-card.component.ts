import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Station, FUEL_LABELS, ScoreBreakdown } from '../../models/station.model';
import { openRoute } from '../../utils/navigation.util';
import { safeBrandColor, brandInitial as getBrandInitial } from '../../utils/brand.utils';

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
         (click)="onCardClick()"
         (mouseenter)="hovered.emit(station.id)"
         (mouseleave)="hovered.emit(null)"
         (keydown.enter)="onCardClick()"
         (keydown.space)="onCardClick()">

      <!-- Header : logo + nom + score + prix -->
      <div class="card-header">

        <!-- Logo marque -->
        <div class="card-logo" [style.background]="badgeColor()" aria-hidden="true">
          @if (station.logo_url) {
            <img [src]="station.logo_url" [alt]="station.brand || ''" class="logo-img"
                 (error)="onLogoError($event)" />
          }
          @if (!station.logo_url) {
            <span class="logo-letter">{{ brandInitial() }}</span>
          }
        </div>

        <!-- Nom + adresse + chips -->
        <div class="card-info">
          <span class="card-name">{{ station.name || station.brand || 'Station' }}</span>
          <span class="card-address">{{ station.address }}, {{ station.city }}</span>
          <div class="card-chips">
            @if (station.distance_meters != null) {
              <span class="chip chip--distance">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {{ formatDistance(station.distance_meters) }}
              </span>
            }
            @if (routeMode && station._route_info) {
              <span class="chip"
                    [class.chip--ok]="station._route_info.detour_km <= 2"
                    [class.chip--warn]="station._route_info.detour_km > 2">
                +{{ station._route_info.detour_km.toFixed(1) }}&thinsp;km
              </span>
            }
            @if (station.is_open === true)  { <span class="chip chip--open"><span class="dot"></span>Ouvert</span> }
            @if (station.is_open === false) { <span class="chip chip--closed"><span class="dot"></span>Fermé</span> }
          </div>
        </div>

        <!-- Prix hero + score -->
        <div class="card-right">
          @if (station.score != null) {
            <div class="score-wrap">
              <button class="score-badge"
                      [class.score-badge--high]="station.score >= 70"
                      [class.score-badge--mid]="station.score >= 50 && station.score < 70"
                      [class.score-badge--low]="station.score < 50"
                      [attr.aria-label]="'Score ' + station.score + ' sur 100'"
                      type="button"
                      (click)="onScoreTap($event)">
                <span class="score-value">{{ station.score | number:'1.0-0' }}</span>
                <span class="score-sub">/100</span>
              </button>
              @if (scoreBreakdownRows().length > 0) {
                <div class="score-panel" [class.score-panel--visible]="showTooltip()" role="tooltip">
                  <div class="panel-title">Composition du score</div>
                  @for (c of scoreBreakdownRows(); track c.key) {
                    <div class="panel-row">
                      <span class="panel-label">{{ c.label }}</span>
                      <div class="panel-track">
                        <div class="panel-fill" [style.width.%]="c.value" [style.background]="c.color"></div>
                      </div>
                      <span class="panel-val">{{ c.value | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (station.matched_fuel) {
            <div class="price-hero"
                 [class.price-hero--good]="isPriceGood(station.matched_fuel.price)"
                 [class.price-hero--high]="isPriceHigh(station.matched_fuel.price)">
              <span class="price-amount">{{ station.matched_fuel.price.toFixed(3) }}</span>
              <span class="price-unit">€/L</span>
            </div>
            <span class="price-tag">{{ fuelLabels[station.matched_fuel.type] || station.matched_fuel.type }}</span>
          } @else if (highlightPrice() != null) {
            <div class="price-hero">
              <span class="price-amount">{{ highlightPrice()!.toFixed(3) }}</span>
              <span class="price-unit">€/L</span>
            </div>
          }
        </div>
      </div>

      <!-- Rec badge -->
      @if (station.recommendation_label) {
        <div class="rec-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ station.recommendation_label }}
        </div>
      }

      <!-- Carburants -->
      <div class="fuels-row">
        @for (fuel of station.fuels; track fuel.type) {
          <div class="fuel-pill" [class.fuel-pill--active]="fuel.type === highlightFuel">
            <span class="fuel-type">{{ fuelLabels[fuel.type] || fuel.type }}</span>
            <span class="fuel-price">{{ fuel.price.toFixed(3) }}<span class="fuel-unit">€</span></span>
          </div>
        }
      </div>

      <!-- Fraîcheur -->
      @if (station.osm_last_updated) {
        <div class="freshness">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Mis à jour {{ formatOsmDate(station.osm_last_updated) }}
        </div>
      }

      <!-- Actions -->
      <div class="card-actions" (click)="$event.stopPropagation()">
        @if (routeMode) {
          <button class="btn btn--maps btn--wide" type="button"
                  [attr.aria-label]="'Itinéraire Google Maps vers ' + (station.name || station.brand)"
                  (click)="exportToMaps.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Itinéraire Google Maps
          </button>
        } @else {
          <button class="btn btn--primary" type="button"
                  [attr.aria-label]="'Itinéraire vers ' + (station.name || station.brand)"
                  (click)="openRoute()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            Itinéraire
          </button>
        }
        <button class="btn btn--ghost" type="button"
                [attr.aria-label]="'Historique — ' + (station.name || station.brand)"
                (click)="historyRequested.emit(station)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Historique
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* ── Card shell ── */
    .card {
      position: relative;
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      padding: var(--space-4);
      margin: 0 var(--space-3) var(--space-3);
      box-shadow: var(--shadow-md);
      cursor: pointer;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast);
      border: 1.5px solid var(--color-border-subtle);
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    .card:hover        { box-shadow: var(--shadow-lg); border-color: var(--color-border); transform: translateY(-1px); }
    .card:focus-visible { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light), var(--shadow-md); }
    .card--selected    { border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-muted), var(--shadow-lg); }
    .card:active       { transform: scale(0.982); box-shadow: var(--shadow-sm); }

    /* ── Header ── */
    .card-header { display: flex; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3); }

    .card-logo {
      width: 44px; height: 44px;
      border-radius: var(--radius-md);
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      border: 1.5px solid rgba(0,0,0,0.06);
      box-shadow: var(--shadow-sm);
    }
    .logo-img    { width: 34px; height: 34px; object-fit: contain; }
    .logo-letter { font-size: 18px; font-weight: 800; color: #fff; text-transform: uppercase; line-height: 1; }

    .card-info  { display: flex; flex-direction: column; gap: 2px; overflow: hidden; flex: 1; min-width: 0; }
    .card-name  {
      font-size: var(--font-size-md); font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      letter-spacing: -0.3px;
    }
    .card-address { font-size: var(--font-size-xs); color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-chips { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 600;
      padding: 2px 7px; border-radius: var(--radius-pill);
      white-space: nowrap;
    }
    .chip--distance { background: var(--color-surface-3); color: var(--color-text-secondary); }
    .chip--open     { background: var(--color-success-bg); color: var(--color-success); }
    .chip--closed   { background: var(--color-error-bg);   color: var(--color-error); }
    .chip--ok       { background: var(--color-success-bg); color: var(--color-success); }
    .chip--warn     { background: var(--color-warning-bg); color: var(--color-warning); }
    .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* ── Colonne droite (prix + score) ── */
    .card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

    .price-hero { display: flex; align-items: baseline; gap: 2px; font-variant-numeric: tabular-nums; }
    .price-amount {
      font-size: 22px; font-weight: 800;
      color: var(--color-text-primary);
      letter-spacing: -1px; line-height: 1;
    }
    .price-unit { font-size: 11px; font-weight: 600; color: var(--color-text-muted); }
    .price-hero--good .price-amount { color: var(--color-price-good); }
    .price-hero--high .price-amount { color: var(--color-price-high); }
    .price-tag { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.4px; }

    /* ── Score badge ── */
    .score-wrap { position: relative; }
    .score-badge {
      display: flex; align-items: center; gap: 2px;
      padding: 5px 9px; border-radius: var(--radius-md);
      border: none; cursor: pointer;
      font-family: var(--font-family);
      transition: transform var(--transition-fast), filter var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .score-badge:active { transform: scale(0.92); }
    .score-value { font-size: 14px; font-weight: 800; color: #fff; line-height: 1; }
    .score-sub   { font-size: 9px;  font-weight: 600; color: rgba(255,255,255,0.72); }
    .score-badge--high { background: linear-gradient(135deg,#059669,#047857); box-shadow: 0 2px 8px rgba(5,150,105,.35); }
    .score-badge--mid  { background: linear-gradient(135deg,#D97706,#B45309); box-shadow: 0 2px 8px rgba(217,119,6,.35); }
    .score-badge--low  { background: linear-gradient(135deg,#DC2626,#B91C1C); box-shadow: 0 2px 8px rgba(220,38,38,.35); }

    /* ── Panneau score détail ── */
    .score-panel {
      display: none;
      position: absolute; top: calc(100% + 8px); right: 0;
      width: 220px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      padding: 12px; z-index: 200;
      animation: slide-up var(--transition-normal);
    }
    .score-badge:hover + .score-panel,
    .score-panel--visible { display: block; }

    .panel-title { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 10px; }
    .panel-row   { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .panel-label { font-size: 11px; font-weight: 600; color: var(--color-text-secondary); width: 58px; flex-shrink: 0; }
    .panel-track { flex: 1; height: 6px; background: var(--color-surface-3); border-radius: 3px; overflow: hidden; }
    .panel-fill  { height: 100%; border-radius: 3px; }
    .panel-val   { font-size: 11px; font-weight: 700; color: var(--color-text-primary); width: 24px; text-align: right; }

    /* ── Rec badge ── */
    .rec-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700;
      color: var(--color-accent-dark);
      background: var(--color-accent-light);
      border: 1px solid var(--color-warning-border);
      border-radius: var(--radius-pill);
      padding: 4px 10px;
      margin-bottom: var(--space-3);
    }

    /* ── Carburants ── */
    .fuels-row { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
    .fuel-pill {
      display: flex; flex-direction: column; align-items: center;
      background: var(--color-surface-3);
      border-radius: var(--radius-md);
      padding: 6px 10px; min-width: 56px;
      border: 1.5px solid transparent;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .fuel-pill--active { background: var(--color-primary-subtle); border-color: var(--color-primary-muted); }
    .fuel-type  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: var(--color-text-muted); margin-bottom: 2px; }
    .fuel-pill--active .fuel-type { color: var(--color-primary); }
    .fuel-price { font-size: var(--font-size-sm); font-weight: 800; color: var(--color-text-primary); font-variant-numeric: tabular-nums; letter-spacing: -.3px; }
    .fuel-pill--active .fuel-price { color: var(--color-primary-dark); }
    .fuel-unit  { font-size: 10px; font-weight: 600; margin-left: 1px; }

    /* ── Fraîcheur ── */
    .freshness { display: flex; align-items: center; gap: 4px; font-size: 9px; color: var(--color-text-tertiary); margin-bottom: var(--space-3); }

    /* ── Actions ── */
    .card-actions { display: flex; gap: var(--space-2); }
    .btn {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 0; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      cursor: pointer; border: none; min-height: 44px;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn:active { transform: scale(0.95); }

    .btn--primary {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: #fff;
      box-shadow: 0 2px 8px rgba(2,132,199,.35);
    }
    .btn--primary:hover { filter: brightness(1.06); box-shadow: 0 4px 16px rgba(2,132,199,.45); }

    .btn--ghost {
      background: var(--color-surface-3); color: var(--color-text-secondary);
      border: 1.5px solid var(--color-border-subtle);
    }
    .btn--ghost:hover { background: var(--color-border); color: var(--color-text-primary); }

    .btn--maps {
      background: var(--color-accent-light); color: var(--color-accent-dark);
      border: 1.5px solid var(--color-warning-border);
    }
    .btn--maps:hover { filter: brightness(0.96); }
    .btn--wide { flex: 2; }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .card         { margin: 0 10px var(--space-3); padding: 14px; }
      .card-logo    { width: 46px; height: 46px; }
      .price-amount { font-size: 24px; }
      .btn          { padding: 12px 0; min-height: 48px; }
      .score-panel  { display: none !important; }
      .score-panel--visible { display: block !important; }
    }
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

  @Output() readonly select           = new EventEmitter<Station>();
  @Output() readonly historyRequested = new EventEmitter<Station>();
  @Output() readonly hovered          = new EventEmitter<string | null>();
  @Output() readonly exportToMaps     = new EventEmitter<void>();

  readonly fuelLabels  = FUEL_LABELS;
  readonly showTooltip = signal(false);

  onCardClick(): void {
    this.showTooltip.set(false);
    this.select.emit(this.station);
  }

  onScoreTap(e: Event): void {
    e.stopPropagation();
    this.showTooltip.update(v => !v);
  }

  brandInitial(): string { return getBrandInitial(this.station.brand || this.station.name); }

  badgeColor(): string {
    return this.station.logo_url ? 'var(--color-surface-3)' : safeBrandColor(this.station.brand_color);
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const letter = img.parentElement?.querySelector<HTMLElement>('.logo-letter');
    if (letter) letter.style.display = 'block';
  }

  highlightPrice(): number | null {
    return this.station.fuels.find(f => f.type === this.highlightFuel)?.price ?? null;
  }

  isPriceGood(price: number): boolean {
    const prices = this.station.fuels.map(f => f.price);
    const min = Math.min(...prices);
    return price <= min * 1.005;
  }

  isPriceHigh(price: number): boolean {
    const prices = this.station.fuels.map(f => f.price);
    const max = Math.max(...prices);
    return price >= max * 0.995 && prices.length > 1;
  }

  formatDistance(meters: number): string {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  }

  formatOsmDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return iso; }
  }

  get cardAriaLabel(): string {
    const name  = this.station.name || this.station.brand || 'Station sans nom';
    const dist  = this.station.distance_meters != null ? ` à ${this.formatDistance(this.station.distance_meters)}` : '';
    const price = this.highlightPrice() != null ? `, ${this.highlightFuel} à ${this.highlightPrice()!.toFixed(3)} €` : '';
    const open  = this.station.is_open === true ? ', ouverte' : this.station.is_open === false ? ', fermée' : '';
    return `${name}${dist}${price}${open}`;
  }

  readonly scoreBreakdownRows = computed<ScoreRow[]>(() => {
    const bd = this.station.score_breakdown;
    if (!bd) return [];
    const defs: { key: keyof ScoreBreakdown; label: string; color: string }[] = [
      { key: 'price',     label: 'Prix',      color: '#059669' },
      { key: 'detour',    label: 'Détour',    color: '#D97706' },
      { key: 'distance',  label: 'Distance',  color: '#0284C7' },
      { key: 'freshness', label: 'Fraîcheur', color: '#7C3AED' },
      { key: 'services',  label: 'Services',  color: '#0891B2' },
    ];
    return defs
      .filter(d => bd[d.key] !== undefined)
      .map(d => ({ key: d.key, label: d.label, color: d.color, value: bd[d.key] as number }));
  });

  openRoute(): void { openRoute(this.station.location.lat, this.station.location.lon); }
}
