import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FUEL_TYPES, FUEL_LABELS, FUEL_NOTES, FuelTypeOrAll } from '../../models/station.model';

export interface FilterValues {
  fuelType: FuelTypeOrAll;
  radiusKm: number;
  maxPrice: number | null;
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="filters-backdrop" (click)="closed.emit()" aria-hidden="true"></div>

    <!-- Drawer -->
    <div class="filters-drawer" role="dialog" aria-modal="true" aria-label="Filtres de recherche">
      <div class="drawer-header">
        <span class="drawer-title">Filtres</span>
        <button class="drawer-close" (click)="closed.emit()" aria-label="Fermer les filtres">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="drawer-body">

        <!-- Fuel type -->
        <div class="filter-section">
          <label class="section-label">Type de carburant</label>
          <div class="chip-group" role="group" aria-label="Type de carburant">
            <button
              *ngFor="let fuel of allFuelOptions"
              class="chip"
              [class.chip--active]="values.fuelType === fuel"
              (click)="selectFuel(fuel)"
              [attr.aria-pressed]="values.fuelType === fuel"
              type="button"
            >{{ fuelLabels[fuel] }}</button>
          </div>
          <p *ngIf="currentFuelNote" class="fuel-note">{{ currentFuelNote }}</p>
        </div>

        <!-- Radius -->
        <div class="filter-section">
          <div class="section-label-row">
            <label class="section-label" for="radius-input">Rayon de recherche</label>
            <span class="section-value">{{ values.radiusKm }} km</span>
          </div>
          <div class="slider-wrap">
            <input
              id="radius-input"
              type="range"
              min="1" max="50" step="1"
              [(ngModel)]="values.radiusKm"
              (ngModelChange)="emit()"
              class="slider"
              [attr.aria-valuemin]="1"
              [attr.aria-valuemax]="50"
              [attr.aria-valuenow]="values.radiusKm"
              [attr.aria-valuetext]="values.radiusKm + ' kilomètres'"
            />
            <div class="slider-labels">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>

        <!-- Max price -->
        <div class="filter-section">
          <label class="section-label" for="price-input">Prix maximum (€/L)</label>
          <div class="price-row">
            <div class="price-input-wrap" [class.price-input-wrap--active]="values.maxPrice !== null">
              <span class="price-prefix">≤</span>
              <input
                id="price-input"
                type="number"
                min="0" max="5" step="0.01"
                [ngModel]="values.maxPrice"
                (ngModelChange)="onMaxPriceChange($event)"
                placeholder="Illimité"
                class="price-input"
                aria-label="Prix maximum en euros par litre"
              />
              <span *ngIf="values.maxPrice !== null" class="price-suffix">€/L</span>
            </div>
            <button
              *ngIf="values.maxPrice !== null"
              class="price-clear"
              (click)="clearPrice()"
              aria-label="Supprimer le prix maximum"
              type="button"
            >Effacer</button>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="drawer-footer">
        <button class="btn-reset" (click)="reset()" type="button">Réinitialiser</button>
        <button class="btn-apply" (click)="closed.emit()" type="button">Appliquer</button>
      </div>
    </div>
  `,
  styles: [`
    .filters-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      z-index: 40;
      animation: fade-in 0.2s ease;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .filters-drawer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-surface);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      box-shadow: var(--shadow-sheet);
      z-index: 50;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      animation: slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .drawer-title {
      font-size: var(--font-size-lg);
      font-weight: 700;
      color: var(--color-text-primary);
      letter-spacing: -0.3px;
    }

    .drawer-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: none;
      background: var(--color-bg);
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .drawer-close:active { background: var(--color-border); }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .filter-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .section-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .section-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-value {
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--color-primary);
    }

    /* Chips */
    .chip-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .chip {
      padding: 7px 14px;
      border-radius: var(--radius-pill);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      font-weight: 600;
      font-family: var(--font-family);
      cursor: pointer;
      color: var(--color-text-secondary);
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .chip:active { transform: scale(0.95); }
    .chip--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-text-on-primary);
    }

    /* Slider */
    .slider-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .slider {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: var(--radius-pill);
      background: var(--color-border);
      accent-color: var(--color-primary);
      cursor: pointer;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
      cursor: pointer;
    }
    .slider:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 4px;
    }

    .slider-labels {
      display: flex;
      justify-content: space-between;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }

    /* Price input */
    .price-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .price-input-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0 var(--space-3);
      background: var(--color-bg);
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .price-input-wrap--active {
      border-color: var(--color-primary);
      background: var(--color-surface);
    }
    .price-input-wrap:focus-within {
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .price-prefix {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .price-suffix {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .price-input {
      border: none;
      background: transparent;
      padding: 9px 0;
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--color-text-primary);
      outline: none;
      width: 90px;
      font-variant-numeric: tabular-nums;
    }
    .price-input::placeholder { color: var(--color-text-muted); }

    .price-clear {
      font-size: var(--font-size-xs);
      font-family: var(--font-family);
      font-weight: 600;
      color: var(--color-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);
    }
    .price-clear:hover { color: var(--color-error); background: var(--color-error-bg); }

    /* Footer */
    .drawer-footer {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn-reset {
      flex: 1;
      padding: 11px 0;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 600;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-reset:active { background: var(--color-bg); }

    .btn-apply {
      flex: 2;
      padding: 11px 0;
      border-radius: var(--radius-md);
      border: none;
      background: var(--color-primary);
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      font-weight: 700;
      color: var(--color-text-on-primary);
      cursor: pointer;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-apply:active { background: var(--color-primary-dark); }

    .fuel-note {
      margin: 8px 0 0;
      font-size: 11px;
      color: var(--color-text-muted);
      line-height: 1.4;
      padding: 6px 8px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      border-left: 3px solid var(--color-primary-light);
    }
  `]
})
export class FiltersComponent {
  @Input() values: FilterValues = { fuelType: 'E10', radiusKm: 10, maxPrice: null };
  @Output() changed = new EventEmitter<FilterValues>();
  @Output() closed = new EventEmitter<void>();

  readonly allFuelOptions: FuelTypeOrAll[] = ['Tous', ...FUEL_TYPES];
  readonly fuelLabels = FUEL_LABELS;
  readonly fuelNotes = FUEL_NOTES;

  get currentFuelNote(): string | undefined {
    return this.fuelNotes[this.values.fuelType];
  }

  selectFuel(fuel: FuelTypeOrAll): void {
    this.values = { ...this.values, fuelType: fuel };
    this.emit();
  }

  onMaxPriceChange(val: string): void {
    this.values = { ...this.values, maxPrice: val ? parseFloat(val) : null };
    this.emit();
  }

  clearPrice(): void {
    this.values = { ...this.values, maxPrice: null };
    this.emit();
  }

  reset(): void {
    this.values = { fuelType: 'E10', radiusKm: 10, maxPrice: null };
    this.emit();
  }

  emit(): void {
    this.changed.emit({ ...this.values });
  }
}
