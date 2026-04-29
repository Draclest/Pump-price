import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { Station } from '../../models/station.model';
import { PriceHistoryService, FuelHistory } from '../../services/price-history.service';

@Component({
  selector: 'app-price-history',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="close.emit()" aria-hidden="true"></div>

    <div class="modal" role="dialog" aria-modal="true"
         [attr.aria-label]="'Historique des prix — ' + (station.name || station.brand || 'Station')">

      <div class="modal-handle"></div>

      <!-- Header -->
      <div class="modal-header">
        <div class="modal-title-wrap">
          <div class="modal-station-icon" aria-hidden="true">
            @if (station.logo_url) {
              <img [src]="station.logo_url" [alt]="station.brand || ''" class="modal-logo"/>
            } @else {
              <span class="modal-logo-letter">{{ brandInitial() }}</span>
            }
          </div>
          <div class="modal-title-text">
            <h2 class="modal-name">{{ station.name || station.brand || 'Station' }}</h2>
            <p class="modal-address">{{ station.address }}, {{ station.city }}</p>
          </div>
        </div>
        <button class="modal-close" (click)="close.emit()" aria-label="Fermer l'historique">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">

        @if (loading()) {
          @for (_ of [1, 2]; track $index) {
            <div class="sk-card">
              <div class="sk-card-header">
                <div class="sk-block" style="width:80px;height:18px;border-radius:6px"></div>
                <div class="sk-block" style="width:110px;height:28px;border-radius:8px"></div>
              </div>
              <div class="sk-stats-row">
                @for (__ of [1,2,3]; track $index) {
                  <div class="sk-block" style="flex:1;height:44px;border-radius:10px"></div>
                }
              </div>
              <div class="sk-block" style="height:160px;border-radius:12px;margin-top:4px"></div>
            </div>
          }
        }

        @if (!loading() && error()) {
          <div class="state-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Erreur de chargement</strong>
              <p>{{ error() }}</p>
            </div>
          </div>
        }

        @if (!loading() && !error() && fuelHistories().length === 0) {
          <div class="state-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <strong>Pas encore de données</strong>
            <p>L'historique s'accumule au fil des ingestions quotidiennes.</p>
          </div>
        }

        @for (fh of fuelHistories(); track fh.type; let fi = $index) {
          <div class="fuel-card">

            <!-- Card header: fuel name + trend + current price -->
            <div class="fc-header">
              <div class="fc-title-row">
                <span class="fc-name">{{ fh.label }}</span>
                <span class="fc-trend-badge" [class]="'fc-trend-badge--' + fh.trend"
                      [attr.aria-label]="trendLabel(fh.trend)">
                  @if (fh.trend === 'up') {
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
                    Hausse
                  }
                  @if (fh.trend === 'down') {
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    Baisse
                  }
                  @if (fh.trend === 'stable') {
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Stable
                  }
                </span>
              </div>
              <div class="fc-price-now">
                <span class="fc-price-value">{{ fh.latest.toFixed(3) }}</span>
                <span class="fc-price-unit">€/L</span>
              </div>
            </div>

            <!-- Stats pills -->
            <div class="fc-stats">
              <div class="fc-stat">
                <span class="fc-stat-label">Min</span>
                <span class="fc-stat-value fc-stat-value--good">{{ fh.min.toFixed(3) }} €</span>
              </div>
              <div class="fc-stat-sep"></div>
              <div class="fc-stat">
                <span class="fc-stat-label">Moy</span>
                <span class="fc-stat-value">{{ midPrice(fh).toFixed(3) }} €</span>
              </div>
              <div class="fc-stat-sep"></div>
              <div class="fc-stat">
                <span class="fc-stat-label">Max</span>
                <span class="fc-stat-value fc-stat-value--high">{{ fh.max.toFixed(3) }} €</span>
              </div>
              <div class="fc-stat-sep"></div>
              <div class="fc-stat">
                <span class="fc-stat-label">Points</span>
                <span class="fc-stat-value">{{ fh.records.length }}</span>
              </div>
            </div>

            <!-- Chart -->
            <div class="fc-chart-wrap" (mouseleave)="hoveredPoint.set(null)"
                 role="img" [attr.aria-label]="chartAriaLabel(fh)">

              <svg class="fc-svg" [attr.viewBox]="'0 0 ' + W + ' ' + H"
                   preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient [attr.id]="'grad-' + fi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="#16a34a" stop-opacity="0.22"/>
                    <stop offset="100%" stop-color="#16a34a" stop-opacity="0"/>
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <line [attr.x1]="0" [attr.y1]="PAD_TOP"       [attr.x2]="W" [attr.y2]="PAD_TOP"       class="grid-line"/>
                <line [attr.x1]="0" [attr.y1]="H/2"           [attr.x2]="W" [attr.y2]="H/2"           class="grid-line"/>
                <line [attr.x1]="0" [attr.y1]="H - PAD_BOT"   [attr.x2]="W" [attr.y2]="H - PAD_BOT"   class="grid-line"/>

                <!-- Vertical cursor line -->
                @if (hoveredPoint() && hoveredPoint()!.fuelIdx === fi) {
                  <line class="cursor-line"
                        [attr.x1]="pointX(hoveredPoint()!.pointIdx, fh.records.length)"
                        [attr.y1]="PAD_TOP"
                        [attr.x2]="pointX(hoveredPoint()!.pointIdx, fh.records.length)"
                        [attr.y2]="H - PAD_BOT"/>
                }

                <!-- Area -->
                @if (fh.records.length > 1) {
                  <path [attr.d]="smoothAreaPath(fh)" [attr.fill]="'url(#grad-' + fi + ')'"/>
                }

                <!-- Line -->
                @if (fh.records.length > 1) {
                  <path [attr.d]="smoothLinePath(fh)" class="fc-line"/>
                }

                <!-- Dots + hit areas -->
                @for (r of fh.records; track r.recorded_at; let i = $index; let last = $last) {
                  <g (mouseenter)="hoveredPoint.set({ fuelIdx: fi, pointIdx: i, price: r.price, date: r.recorded_at })"
                     [attr.transform]="'translate(' + pointX(i, fh.records.length).toFixed(1) + ',' + pointY(r.price, fh.min, fh.max).toFixed(1) + ')'">
                    <rect x="-16" y="-50" width="32" height="100" fill="transparent"/>
                    <circle class="fc-dot"
                            [class.fc-dot--latest]="last"
                            [class.fc-dot--hovered]="hoveredPoint()?.fuelIdx === fi && hoveredPoint()?.pointIdx === i"
                            r="3.5"/>
                  </g>
                }
              </svg>

              <!-- Y-axis labels (overlaid on the left) -->
              <div class="fc-y-axis">
                <span>{{ fh.max.toFixed(2) }}</span>
                <span>{{ midPrice(fh).toFixed(2) }}</span>
                <span>{{ fh.min.toFixed(2) }}</span>
              </div>

              <!-- Tooltip -->
              @if (hoveredPoint() && hoveredPoint()!.fuelIdx === fi) {
                <div class="fc-tooltip"
                     [style.left.%]="tooltipLeft(hoveredPoint()!.pointIdx, fh.records.length)"
                     [class.fc-tooltip--flip]="hoveredPoint()!.pointIdx >= fh.records.length - 2">
                  <span class="fc-tooltip-price">{{ hoveredPoint()!.price.toFixed(3) }} €/L</span>
                  <span class="fc-tooltip-date">{{ formatDate(hoveredPoint()!.date) }}</span>
                  <span class="fc-tooltip-arrow"></span>
                </div>
              }

              <!-- X-axis dates -->
              <div class="fc-x-axis">
                @for (r of fh.records; track r.recorded_at; let i = $index) {
                  @if (shouldShowXLabel(i, fh.records.length)) {
                    <span class="fc-x-label" [style.left.%]="tooltipLeft(i, fh.records.length)">
                      {{ formatShortDate(r.recorded_at) }}
                    </span>
                  }
                }
              </div>
            </div>

          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    /* ── Backdrop ── */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 1000;
      animation: fade-in 0.2s ease;
      backdrop-filter: blur(2px);
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    /* ── Modal (mobile: bottom sheet) ── */
    .modal {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: var(--color-bg);
      border-radius: 20px 20px 0 0;
      max-height: 88vh;
      display: flex; flex-direction: column;
      z-index: 1001;
      animation: modal-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
      box-shadow: 0 -8px 40px rgba(0,0,0,0.16), 0 -1px 6px rgba(0,0,0,0.07);
    }
    @keyframes modal-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

    /* ── Desktop: centered card ── */
    @media (min-width: 769px) {
      .modal {
        top: 50%; left: 50%;
        bottom: auto; right: auto;
        transform: translate(-50%, -50%);
        width: min(640px, 92vw);
        max-height: 86vh;
        border-radius: var(--radius-xl);
        animation: modal-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
      }
      @keyframes modal-in {
        from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      .modal-handle { display: none; }
    }

    .modal-handle {
      width: 36px; height: 4px;
      background: var(--color-border);
      border-radius: 100px;
      margin: 10px auto 0;
      flex-shrink: 0;
    }

    /* ── Header ── */
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--color-border-subtle);
      flex-shrink: 0; gap: 12px;
      background: var(--color-surface);
      border-radius: inherit;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    .modal-title-wrap { display: flex; align-items: center; gap: 12px; overflow: hidden; flex: 1; }
    .modal-station-icon {
      width: 42px; height: 42px; border-radius: var(--radius-md); flex-shrink: 0;
      background: var(--color-primary-light);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; border: 1px solid rgba(0,0,0,0.06);
    }
    .modal-logo { width: 32px; height: 32px; object-fit: contain; }
    .modal-logo-letter { font-size: 18px; font-weight: 800; color: var(--color-primary); text-transform: uppercase; }
    .modal-title-text { overflow: hidden; flex: 1; }
    .modal-name {
      font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary);
      margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      letter-spacing: -0.3px;
    }
    .modal-address {
      font-size: var(--font-size-xs); color: var(--color-text-muted); margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .modal-close {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: var(--color-surface-3); color: var(--color-text-secondary);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .modal-close:hover  { background: var(--color-border); }
    .modal-close:active { background: var(--color-border); transform: scale(0.92); }

    /* ── Body ── */
    .modal-body {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Skeleton ── */
    .sk-card { display: flex; flex-direction: column; gap: 10px; }
    .sk-card-header { display: flex; justify-content: space-between; align-items: center; }
    .sk-stats-row { display: flex; gap: 8px; }
    .sk-block {
      background: linear-gradient(90deg, var(--color-surface-3) 25%, var(--color-border) 50%, var(--color-surface-3) 75%);
      background-size: 300% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

    /* ── States ── */
    .state-error {
      display: flex; align-items: flex-start; gap: 12px;
      background: var(--color-error-bg); color: var(--color-error);
      border-radius: var(--radius-lg); padding: 16px;
    }
    .state-error strong { display: block; font-size: var(--font-size-sm); margin-bottom: 2px; }
    .state-error p { margin: 0; font-size: var(--font-size-xs); opacity: 0.8; }
    .state-empty {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 40px 20px; text-align: center; color: var(--color-text-muted);
    }
    .state-empty svg { opacity: 0.35; }
    .state-empty strong { font-size: var(--font-size-md); color: var(--color-text-secondary); }
    .state-empty p { margin: 0; font-size: var(--font-size-sm); line-height: 1.5; }

    /* ── Fuel card ── */
    .fuel-card {
      background: var(--color-surface);
      border: 1.5px solid var(--color-border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    /* Card header */
    .fc-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 14px 16px 12px;
      gap: 12px;
    }
    .fc-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .fc-name {
      font-size: var(--font-size-md); font-weight: 800;
      color: var(--color-text-primary); letter-spacing: -0.3px;
    }
    .fc-trend-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 100px;
    }
    .fc-trend-badge--up     { background: #fef2f2; color: #dc2626; }
    .fc-trend-badge--down   { background: var(--color-primary-light); color: var(--color-primary-dark); }
    .fc-trend-badge--stable { background: var(--color-surface-3); color: var(--color-text-muted); }

    .fc-price-now { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
    .fc-price-value {
      font-size: 22px; font-weight: 900; color: var(--color-primary-dark);
      font-variant-numeric: tabular-nums; letter-spacing: -0.8px; line-height: 1;
    }
    .fc-price-unit { font-size: 11px; font-weight: 700; color: var(--color-text-muted); }

    /* Stats row */
    .fc-stats {
      display: flex; align-items: stretch;
      border-top: 1px solid var(--color-border-subtle);
      border-bottom: 1px solid var(--color-border-subtle);
      background: var(--color-surface-2);
    }
    .fc-stat {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 8px 4px; gap: 2px; text-align: center;
    }
    .fc-stat-sep { width: 1px; background: var(--color-border-subtle); flex-shrink: 0; }
    .fc-stat-label { font-size: 9px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .fc-stat-value {
      font-size: 12px; font-weight: 800; color: var(--color-text-secondary);
      font-variant-numeric: tabular-nums; letter-spacing: -0.2px;
    }
    .fc-stat-value--good { color: var(--color-primary-dark); }
    .fc-stat-value--high { color: var(--color-error); }

    /* ── Chart ── */
    .fc-chart-wrap {
      position: relative;
      height: 180px;
      padding-bottom: 22px;
      cursor: crosshair;
    }

    .fc-svg {
      width: 100%; height: calc(100% - 22px);
      display: block; overflow: visible;
    }

    .grid-line {
      stroke: var(--color-border-subtle); stroke-width: 1;
      vector-effect: non-scaling-stroke; stroke-dasharray: 3 3;
    }
    .cursor-line {
      stroke: var(--color-primary); stroke-width: 1;
      vector-effect: non-scaling-stroke; stroke-dasharray: 4 3;
      opacity: 0.5;
    }
    .fc-line {
      fill: none; stroke: var(--color-primary); stroke-width: 2.5px;
      stroke-linejoin: round; stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }
    .fc-dot {
      fill: var(--color-surface); stroke: var(--color-border);
      stroke-width: 2px; vector-effect: non-scaling-stroke;
      opacity: 0; transition: opacity 0.1s;
    }
    .fc-dot--latest {
      fill: var(--color-primary); stroke: var(--color-primary); opacity: 1;
    }
    .fc-dot--hovered {
      fill: var(--color-primary); stroke: #fff; stroke-width: 2.5px;
      opacity: 1; r: 5.5;
    }

    /* Y-axis */
    .fc-y-axis {
      position: absolute; top: 0; left: 0;
      height: calc(100% - 22px);
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 4px 0;
      pointer-events: none;
    }
    .fc-y-axis span {
      font-size: 9px; font-weight: 600; color: var(--color-text-muted);
      font-variant-numeric: tabular-nums; line-height: 1;
      background: var(--color-surface);
      padding: 1px 4px; border-radius: 3px;
      margin-left: 4px;
    }

    /* Tooltip */
    .fc-tooltip {
      position: absolute; top: 6px;
      transform: translateX(-50%);
      background: var(--color-text-primary); color: #fff;
      border-radius: var(--radius-md);
      padding: 6px 10px; pointer-events: none;
      white-space: nowrap; display: flex; flex-direction: column; align-items: center;
      gap: 1px; z-index: 10;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      animation: tip-in 0.1s ease;
    }
    @keyframes tip-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .fc-tooltip--flip { transform: translateX(-100%); }
    .fc-tooltip--flip { animation: tip-in-flip 0.1s ease; }
    @keyframes tip-in-flip {
      from { opacity: 0; transform: translateX(-100%) translateY(-4px); }
      to   { opacity: 1; transform: translateX(-100%) translateY(0); }
    }
    .fc-tooltip-arrow {
      position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: var(--color-text-primary);
    }
    .fc-tooltip--flip .fc-tooltip-arrow { left: auto; right: 14px; transform: none; }
    .fc-tooltip-price { font-size: 13px; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -0.4px; }
    .fc-tooltip-date  { font-size: 10px; font-weight: 500; opacity: 0.7; }

    /* X-axis */
    .fc-x-axis { position: absolute; bottom: 0; left: 0; right: 0; height: 22px; }
    .fc-x-label {
      position: absolute; transform: translateX(-50%);
      font-size: 9px; font-weight: 600; color: var(--color-text-muted);
      white-space: nowrap; line-height: 22px;
    }
  `],
})
export class PriceHistoryComponent implements OnInit {
  @Input({ required: true }) station!: Station;
  @Output() readonly close = new EventEmitter<void>();

  private readonly historyService = inject(PriceHistoryService);
  private readonly destroyRef     = inject(DestroyRef);

  readonly loading       = signal(true);
  readonly error         = signal<string | null>(null);
  readonly fuelHistories = signal<FuelHistory[]>([]);
  readonly hoveredPoint  = signal<{ fuelIdx: number; pointIdx: number; price: number; date: string } | null>(null);

  ngOnInit(): void {
    const fuelTypes = this.station.fuels.map(f => f.type);

    this.historyService.getHistory(this.station.id, fuelTypes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: histories => {
          this.fuelHistories.set(histories);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger l\'historique. Veuillez réessayer.');
          this.loading.set(false);
        },
      });
  }

  readonly W       = 300;
  readonly H       = 120;
  readonly PAD_TOP = 10;
  readonly PAD_BOT = 10;

  brandInitial(): string {
    return (this.station.brand || this.station.name || '?').charAt(0).toUpperCase();
  }

  private px(i: number, total: number): number {
    return total < 2 ? this.W / 2 : (i / (total - 1)) * this.W;
  }

  private py(price: number, min: number, max: number): number {
    const range = max - min || 0.01;
    const usable = this.H - this.PAD_TOP - this.PAD_BOT;
    return this.PAD_TOP + (1 - (price - min) / range) * usable;
  }

  pointX(i: number, total: number): number { return this.px(i, total); }
  pointY(price: number, min: number, max: number): number { return this.py(price, min, max); }

  private pts(fh: FuelHistory): { x: number; y: number }[] {
    return fh.records.map((r, i) => ({
      x: this.px(i, fh.records.length),
      y: this.py(r.price, fh.min, fh.max),
    }));
  }

  /* Catmull-Rom → cubic Bézier smooth path */
  private catmullRomPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    if (pts.length === 2)
      return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;

    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  smoothLinePath(fh: FuelHistory): string {
    return this.catmullRomPath(this.pts(fh));
  }

  smoothAreaPath(fh: FuelHistory): string {
    const p = this.pts(fh);
    if (p.length < 2) return '';
    const bottom = (this.H - this.PAD_BOT).toFixed(1);
    const line = this.catmullRomPath(p);
    return `${line} L${p[p.length - 1].x.toFixed(1)},${bottom} L${p[0].x.toFixed(1)},${bottom} Z`;
  }

  tooltipLeft(i: number, total: number): number {
    return total < 2 ? 50 : (i / (total - 1)) * 100;
  }

  shouldShowXLabel(i: number, total: number): boolean {
    if (total <= 6) return true;
    const step = Math.ceil(total / 5);
    return i === 0 || i === total - 1 || i % step === 0;
  }

  midPrice(fh: FuelHistory): number {
    return (fh.min + fh.max) / 2;
  }

  trendLabel(trend: FuelHistory['trend']): string {
    return trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable';
  }

  chartAriaLabel(fh: FuelHistory): string {
    return `Historique ${fh.label} : de ${fh.min.toFixed(3)} € à ${fh.max.toFixed(3)} €, actuellement ${fh.latest.toFixed(3)} €`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}
