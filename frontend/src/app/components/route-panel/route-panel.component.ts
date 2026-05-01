import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GeocodingService, AddressSuggestion } from '../../services/geocoding.service';

export interface RouteRequest {
  origin:      string;
  originLat?:  number;
  originLon?:  number;
  destination: string;
  destLat?:    number;
  destLon?:    number;
  maxDetourKm: number;
}

type FieldState = 'idle' | 'loading' | 'valid' | 'error';

@Component({
  selector: 'app-route-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="route-panel">

      <!-- Origin -->
      <div class="route-field">
        <div class="route-input-wrap"
             [class.is-valid]="originState() === 'valid'"
             [class.is-error]="originState() === 'error'">
          <svg class="route-icon route-icon--origin" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <input class="route-input" type="text" placeholder="Point de départ"
                 autocomplete="off" aria-label="Point de départ"
                 [(ngModel)]="originText" (ngModelChange)="onOriginChange($event)" />
          @if (originState() !== 'idle') {
            <div class="field-indicator">
              @if (originState() === 'loading') {
                <svg class="spinner-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
              @if (originState() === 'valid') {
                <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     aria-label="Adresse validée">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
              @if (originState() === 'error') {
                <svg class="error-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     aria-label="Adresse introuvable">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              }
            </div>
          }
        </div>
        @if (originState() === 'valid' && originGeocoded()) {
          <div class="geo-hint geo-hint--valid">{{ originGeocoded()!.label }}</div>
        }
        @if (originState() === 'error') {
          <div class="geo-hint geo-hint--error">Adresse introuvable</div>
        }
      </div>

      <!-- Swap -->
      <div class="swap-row">
        <button class="swap-btn" type="button" aria-label="Inverser départ et destination"
                (click)="swapFields()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
      </div>

      <!-- Destination -->
      <div class="route-field">
        <div class="route-input-wrap"
             [class.is-valid]="destState() === 'valid'"
             [class.is-error]="destState() === 'error'">
          <svg class="route-icon route-icon--dest" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          <input class="route-input" type="text" placeholder="Destination"
                 autocomplete="off" aria-label="Destination"
                 [(ngModel)]="destText" (ngModelChange)="onDestChange($event)" />
          @if (destState() !== 'idle') {
            <div class="field-indicator">
              @if (destState() === 'loading') {
                <svg class="spinner-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
              @if (destState() === 'valid') {
                <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     aria-label="Adresse validée">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
              @if (destState() === 'error') {
                <svg class="error-icon" width="14" height="14" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                     aria-label="Adresse introuvable">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              }
            </div>
          }
        </div>
        @if (destState() === 'valid' && destGeocoded()) {
          <div class="geo-hint geo-hint--valid">{{ destGeocoded()!.label }}</div>
        }
        @if (destState() === 'error') {
          <div class="geo-hint geo-hint--error">Adresse introuvable</div>
        }
      </div>

      <!-- Detour slider -->
      <div class="detour-row">
        <label class="detour-label" for="detour-slider">
          Détour max&nbsp;: <strong>{{ maxDetourKm }}&thinsp;km</strong>
        </label>
        <input id="detour-slider" class="detour-slider" type="range"
               min="1" max="20" step="1"
               [(ngModel)]="maxDetourKm"
               aria-label="Détour maximum en kilomètres" />
      </div>

      <!-- Actions -->
      <div class="route-actions">
        <button class="btn-route" type="button"
                [disabled]="!canSubmit()" (click)="submit()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Calculer l'itinéraire
        </button>
        @if (isActive()) {
          <button class="btn-clear" type="button" (click)="clear()">Effacer</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .route-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .route-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .route-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .route-input-wrap.is-valid .route-input { border-color: #16a34a; background: #f0fdf4; }
    .route-input-wrap.is-error .route-input { border-color: #dc2626; background: #fef2f2; }

    .route-icon {
      position: absolute;
      left: 10px;
      pointer-events: none;
      z-index: 1;
    }
    .route-icon--origin { color: #16a34a; }
    .route-icon--dest   { color: #dc2626; }

    .route-input {
      width: 100%;
      padding: 9px 36px 9px 32px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--color-text-primary);
      background: var(--color-bg);
      outline: none;
      box-sizing: border-box;
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .route-input:focus {
      border-color: var(--color-primary);
      background: var(--color-surface);
    }
    .route-input::placeholder { color: var(--color-text-muted); }

    .field-indicator {
      position: absolute;
      right: 10px;
      display: flex;
      align-items: center;
    }

    .spinner-icon { color: var(--color-text-muted); animation: spin 0.7s linear infinite; }
    .check-icon   { color: #16a34a; }
    .error-icon   { color: #dc2626; }

    @keyframes spin { to { transform: rotate(360deg); } }

    .geo-hint {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .geo-hint--valid { color: #15803d; background: #dcfce7; }
    .geo-hint--error { color: #b91c1c; background: #fef2f2; }

    .swap-row {
      display: flex;
      justify-content: flex-end;
      margin: -3px 0;
    }

    .swap-btn {
      background: var(--color-bg);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      width: 30px;
      height: 30px;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .swap-btn:hover  { background: var(--color-surface); border-color: var(--color-primary); color: var(--color-primary); }
    .swap-btn:active { transform: scale(0.9); }

    .detour-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: var(--space-1);
    }
    .detour-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
    .detour-slider { width: 100%; accent-color: var(--color-primary); }

    .route-actions {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-1);
      align-items: center;
    }

    .btn-route {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px;
      background: var(--color-primary);
      color: var(--color-text-on-primary);
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .btn-route:disabled { background: var(--color-text-muted); cursor: not-allowed; opacity: 0.7; }
    .btn-route:not(:disabled):hover  { background: var(--color-primary-dark); }
    .btn-route:not(:disabled):active { background: var(--color-primary-dark); }

    .btn-clear {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      cursor: pointer;
      text-decoration: underline;
      padding: 4px 0;
    }
    .btn-clear:hover { color: #dc2626; }
  `],
})
export class RoutePanelComponent implements OnChanges {
  @Input() prefillOrigin: { lat: number; lon: number; label: string } | null = null;
  @Output() readonly routeRequested = new EventEmitter<RouteRequest>();
  @Output() readonly routeCleared   = new EventEmitter<void>();

  private readonly geocodingService = inject(GeocodingService);
  private readonly destroyRef       = inject(DestroyRef);

  originText   = '';
  destText     = '';
  maxDetourKm  = 5;

  readonly originGeocoded = signal<AddressSuggestion | null>(null);
  readonly destGeocoded   = signal<AddressSuggestion | null>(null);
  readonly originState    = signal<FieldState>('idle');
  readonly destState      = signal<FieldState>('idle');

  private readonly _routeActive = signal(false);
  readonly isActive = this._routeActive.asReadonly();

  private readonly originSubject$ = new Subject<string>();
  private readonly destSubject$   = new Subject<string>();

  constructor() {
    this._watchField(this.originSubject$, {
      getState:   this.originState,
      setState:   v => this.originState.set(v),
      setGeo:     v => this.originGeocoded.set(v),
      getText:    () => this.originText,
    });

    this._watchField(this.destSubject$, {
      getState:   this.destState,
      setState:   v => this.destState.set(v),
      setGeo:     v => this.destGeocoded.set(v),
      getText:    () => this.destText,
    });
  }

  ngOnChanges(): void {
    if (this.prefillOrigin) {
      this.originText = this.prefillOrigin.label;
      this.originGeocoded.set(this.prefillOrigin);
      this.originState.set('valid');
    }
  }

  onOriginChange(value: string): void {
    this.originGeocoded.set(null);
    this.originState.set(value.trim() ? 'loading' : 'idle');
    this.originSubject$.next(value);
  }

  onDestChange(value: string): void {
    this.destGeocoded.set(null);
    this.destState.set(value.trim() ? 'loading' : 'idle');
    this.destSubject$.next(value);
  }

  canSubmit(): boolean {
    return this.originState() === 'valid' && this.destState() === 'valid';
  }

  swapFields(): void {
    [this.originText, this.destText] = [this.destText, this.originText];
    const [origGeo, origState] = [this.originGeocoded(), this.originState()];
    this.originGeocoded.set(this.destGeocoded());
    this.originState.set(this.destState());
    this.destGeocoded.set(origGeo);
    this.destState.set(origState);
  }

  submit(): void {
    const orig = this.originGeocoded();
    const dest = this.destGeocoded();
    if (!orig || !dest) return;
    this._routeActive.set(true);
    this.routeRequested.emit({
      origin:      this.originText,
      originLat:   orig.lat,
      originLon:   orig.lon,
      destination: this.destText,
      destLat:     dest.lat,
      destLon:     dest.lon,
      maxDetourKm: this.maxDetourKm,
    });
  }

  clear(): void {
    this.originText = '';
    this.destText   = '';
    this.originGeocoded.set(null);
    this.destGeocoded.set(null);
    this.originState.set('idle');
    this.destState.set('idle');
    this._routeActive.set(false);
    this.routeCleared.emit();
  }

  // ── Private ──────────────────────────────────────────────────────────

  private _watchField(
    subject$: Subject<string>,
    opts: {
      getState: () => FieldState;
      setState: (s: FieldState) => void;
      setGeo:   (v: AddressSuggestion | null) => void;
      getText:  () => string;
    }
  ): void {
    subject$.pipe(
      debounceTime(280),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 3) {
          opts.setState(q.trim().length === 0 ? 'idle' : 'idle');
          opts.setGeo(null);
          return of([]);
        }
        opts.setState('loading');
        return this.geocodingService.search(q).pipe(catchError(() => of([])));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(results => {
      if (results.length > 0) {
        opts.setGeo(results[0]);
        opts.setState('valid');
      } else if (opts.getText().trim()) {
        opts.setGeo(null);
        opts.setState('error');
      }
    });
  }
}
