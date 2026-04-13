import {
  Component, Output, Input, EventEmitter, inject, signal, OnInit, OnDestroy, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { GeocodingService } from '../../services/geocoding.service';

export interface RouteRequest {
  origin: string;
  originLat?: number;
  originLon?: number;
  destination: string;
  destLat?: number;
  destLon?: number;
  maxDetourKm: number;
}

type FieldState = 'idle' | 'loading' | 'valid' | 'error';

@Component({
  selector: 'app-route-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="route-panel">

      <!-- Origin -->
      <div class="route-field">
        <div class="route-input-wrap" [class.is-valid]="originState() === 'valid'"
             [class.is-error]="originState() === 'error'">
          <svg class="route-icon route-icon--origin" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <input
            class="route-input"
            type="text"
            placeholder="Point de départ"
            [(ngModel)]="originText"
            (ngModelChange)="onOriginChange($event)"
            aria-label="Point de départ"
          />
          <div class="field-indicator" *ngIf="originState() !== 'idle'">
            <!-- loading -->
            <svg *ngIf="originState() === 'loading'" class="spinner-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <!-- valid -->
            <svg *ngIf="originState() === 'valid'" class="check-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 aria-label="Adresse validée" aria-hidden="false">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <!-- error -->
            <svg *ngIf="originState() === 'error'" class="error-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 aria-label="Adresse introuvable" aria-hidden="false">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
        <div class="geo-hint geo-hint--valid" *ngIf="originState() === 'valid' && originGeocoded()">
          {{ originGeocoded()!.label }}
        </div>
        <div class="geo-hint geo-hint--error" *ngIf="originState() === 'error'">
          Adresse introuvable
        </div>
      </div>

      <!-- Swap -->
      <div class="swap-row">
        <button class="swap-btn" (click)="swapFields()" type="button" aria-label="Inverser départ et destination">
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
        <div class="route-input-wrap" [class.is-valid]="destState() === 'valid'"
             [class.is-error]="destState() === 'error'">
          <svg class="route-icon route-icon--dest" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          <input
            class="route-input"
            type="text"
            placeholder="Destination"
            [(ngModel)]="destText"
            (ngModelChange)="onDestChange($event)"
            aria-label="Destination"
          />
          <div class="field-indicator" *ngIf="destState() !== 'idle'">
            <svg *ngIf="destState() === 'loading'" class="spinner-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <svg *ngIf="destState() === 'valid'" class="check-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 aria-label="Adresse validée" aria-hidden="false">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg *ngIf="destState() === 'error'" class="error-icon" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 aria-label="Adresse introuvable" aria-hidden="false">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
        <div class="geo-hint geo-hint--valid" *ngIf="destState() === 'valid' && destGeocoded()">
          {{ destGeocoded()!.label }}
        </div>
        <div class="geo-hint geo-hint--error" *ngIf="destState() === 'error'">
          Adresse introuvable
        </div>
      </div>

      <!-- Detour slider -->
      <div class="detour-row">
        <label class="detour-label" for="detour-slider">
          Détour max&nbsp;: <strong>{{ maxDetourKm }}&thinsp;km</strong>
        </label>
        <input
          id="detour-slider"
          class="detour-slider"
          type="range"
          min="1"
          max="20"
          step="1"
          [(ngModel)]="maxDetourKm"
          aria-label="Détour maximum en kilomètres"
        />
      </div>

      <!-- Actions -->
      <div class="route-actions">
        <button
          class="btn-route"
          [disabled]="!canSubmit()"
          (click)="submit()"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          Calculer l'itinéraire
        </button>
        <button
          class="btn-clear"
          *ngIf="isActive()"
          (click)="clear()"
          type="button"
        >
          Effacer
        </button>
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

    /* Input wrapper */
    .route-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      border-radius: var(--radius-md);
      transition: box-shadow var(--transition-fast);
    }

    .route-input-wrap.is-valid .route-input {
      border-color: #16a34a;
      background: #f0fdf4;
    }
    .route-input-wrap.is-error .route-input {
      border-color: #dc2626;
      background: #fef2f2;
    }

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
    .route-input::placeholder {
      color: var(--color-text-muted);
    }

    /* Field state indicator (right side of input) */
    .field-indicator {
      position: absolute;
      right: 10px;
      display: flex;
      align-items: center;
    }

    .spinner-icon {
      color: var(--color-text-muted);
      animation: spin 0.7s linear infinite;
    }
    .check-icon  { color: #16a34a; }
    .error-icon  { color: #dc2626; }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Hint below input */
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

    /* Swap row */
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
    .swap-btn:hover { background: var(--color-surface); border-color: var(--color-primary); color: var(--color-primary); }
    .swap-btn:active { transform: scale(0.9); }

    /* Detour */
    .detour-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: var(--space-1);
    }
    .detour-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }
    .detour-slider {
      width: 100%;
      accent-color: var(--color-primary);
    }

    /* Actions */
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
    .btn-route:disabled {
      background: var(--color-text-muted);
      cursor: not-allowed;
      opacity: 0.7;
    }
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
  `]
})
export class RoutePanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() prefillOrigin: { lat: number; lon: number; label: string } | null = null;
  @Output() routeRequested = new EventEmitter<RouteRequest>();
  @Output() routeCleared = new EventEmitter<void>();

  private geocodingService = inject(GeocodingService);

  originText = '';
  destText = '';
  maxDetourKm = 5;

  originGeocoded = signal<{ label: string; lat: number; lon: number } | null>(null);
  destGeocoded   = signal<{ label: string; lat: number; lon: number } | null>(null);
  originState    = signal<FieldState>('idle');
  destState      = signal<FieldState>('idle');

  private _routeActive = signal(false);
  isActive = this._routeActive.asReadonly();

  private originSubject = new Subject<string>();
  private destSubject   = new Subject<string>();
  private subs = new Subscription();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prefillOrigin'] && this.prefillOrigin) {
      this.originText = this.prefillOrigin.label;
      this.originGeocoded.set(this.prefillOrigin);
      this.originState.set('valid');
    }
  }

  ngOnInit(): void {
    this.subs.add(
      this.originSubject.pipe(
        debounceTime(420),
        distinctUntilChanged(),
        switchMap(q => {
          if (!q.trim()) { this.originState.set('idle'); this.originGeocoded.set(null); return of([]); }
          this.originState.set('loading');
          return this.geocodingService.search(q).pipe(catchError(() => of([])));
        })
      ).subscribe(results => {
        if (results.length > 0) {
          this.originGeocoded.set(results[0]);
          this.originState.set('valid');
        } else if (this.originText.trim()) {
          this.originGeocoded.set(null);
          this.originState.set('error');
        }
      })
    );

    this.subs.add(
      this.destSubject.pipe(
        debounceTime(420),
        distinctUntilChanged(),
        switchMap(q => {
          if (!q.trim()) { this.destState.set('idle'); this.destGeocoded.set(null); return of([]); }
          this.destState.set('loading');
          return this.geocodingService.search(q).pipe(catchError(() => of([])));
        })
      ).subscribe(results => {
        if (results.length > 0) {
          this.destGeocoded.set(results[0]);
          this.destState.set('valid');
        } else if (this.destText.trim()) {
          this.destGeocoded.set(null);
          this.destState.set('error');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onOriginChange(value: string): void {
    this.originGeocoded.set(null);
    this.originState.set(value.trim() ? 'loading' : 'idle');
    this.originSubject.next(value);
  }

  onDestChange(value: string): void {
    this.destGeocoded.set(null);
    this.destState.set(value.trim() ? 'loading' : 'idle');
    this.destSubject.next(value);
  }

  canSubmit(): boolean {
    return this.originState() === 'valid' && this.destState() === 'valid';
  }

  swapFields(): void {
    [this.originText, this.destText] = [this.destText, this.originText];
    const origGeo   = this.originGeocoded();
    const origState = this.originState();
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
      origin: this.originText,
      originLat: orig.lat,
      originLon: orig.lon,
      destination: this.destText,
      destLat: dest.lat,
      destLon: dest.lon,
      maxDetourKm: this.maxDetourKm,
    });
  }

  clear(): void {
    this.originText = '';
    this.destText = '';
    this.originGeocoded.set(null);
    this.destGeocoded.set(null);
    this.originState.set('idle');
    this.destState.set('idle');
    this._routeActive.set(false);
    this.routeCleared.emit();
  }
}
