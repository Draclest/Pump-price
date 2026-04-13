import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FUEL_TYPES, FUEL_LABELS, FUEL_NOTES, FuelTypeOrAll, FilterValues } from '../../models/station.model';

export { FilterValues };

const SERVICE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Ouvert 24/7',  value: '24/7' },
  { label: 'Automate CB', value: 'Automate CB' },
  { label: 'Boutique',    value: 'Boutique' },
  { label: 'Lavage',      value: 'Lavage' },
  { label: 'Toilettes',   value: 'Toilettes' },
];

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (drawerMode) {
      <div class="filters-backdrop" (click)="closed.emit()" aria-hidden="true"></div>
    }

    <div class="filters-drawer" [class.filters-drawer--inline]="!drawerMode"
         role="dialog" [attr.aria-modal]="drawerMode ? 'true' : null"
         aria-label="Filtres de recherche">

      @if (drawerMode) {
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
      }

      <div class="drawer-body" [class.drawer-body--inline]="!drawerMode">

        <!-- Fuel type -->
        <div class="filter-section">
          <label class="section-label">Type de carburant</label>
          <div class="chip-group" role="group" aria-label="Type de carburant">
            @for (fuel of allFuelOptions; track fuel) {
              <button class="chip" type="button"
                      [class.chip--active]="values.fuelType === fuel"
                      [attr.aria-pressed]="values.fuelType === fuel"
                      (click)="selectFuel(fuel)">
                {{ fuelLabels[fuel] }}
              </button>
            }
          </div>
          @if (currentFuelNote) {
            <p class="fuel-note">{{ currentFuelNote }}</p>
          }
        </div>

        <!-- Radius -->
        <div class="filter-section">
          <div class="section-label-row">
            <label class="section-label" for="radius-input">Rayon de recherche</label>
            <span class="section-value">{{ values.radiusKm }} km</span>
          </div>
          <div class="slider-wrap">
            <input id="radius-input" type="range" class="slider"
                   min="1" max="50" step="1"
                   [(ngModel)]="values.radiusKm" (ngModelChange)="emit()"
                   [attr.aria-valuemin]="1" [attr.aria-valuemax]="50"
                   [attr.aria-valuenow]="values.radiusKm"
                   [attr.aria-valuetext]="values.radiusKm + ' kilomètres'" />
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
              <input id="price-input" type="number" class="price-input"
                     min="0" max="5" step="0.01"
                     [ngModel]="values.maxPrice" (ngModelChange)="onMaxPriceChange($event)"
                     placeholder="Illimité"
                     aria-label="Prix maximum en euros par litre" />
              @if (values.maxPrice !== null) {
                <span class="price-suffix">€/L</span>
              }
            </div>
            @if (values.maxPrice !== null) {
              <button class="price-clear" type="button"
                      (click)="clearPrice()" aria-label="Supprimer le prix maximum">
                Effacer
              </button>
            }
          </div>
        </div>

        <!-- Services -->
        <div class="filter-section">
          <label class="section-label">Services</label>
          <div class="checkbox-group">
            @for (svc of serviceOptions; track svc.value) {
              <label class="checkbox-label" [class.checkbox-label--active]="isServiceSelected(svc.value)">
                <input type="checkbox" class="checkbox-input"
                       [checked]="isServiceSelected(svc.value)"
                       (change)="toggleService(svc.value)"
                       [attr.aria-label]="svc.label" />
                <span class="checkbox-mark"></span>
                <span class="checkbox-text">{{ svc.label }}</span>
              </label>
            }
          </div>
        </div>

      </div>

      @if (drawerMode) {
        <div class="drawer-footer">
          <button class="btn-reset" type="button" (click)="reset()">Réinitialiser</button>
          <button class="btn-apply" type="button" (click)="closed.emit()">Appliquer</button>
        </div>
      }
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
      bottom: 0; left: 0; right: 0;
      background: var(--color-surface);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      box-shadow: var(--shadow-sheet);
      z-index: 50;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      animation: slide-up 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .filters-drawer--inline {
      position: static;
      border-radius: 0;
      box-shadow: none;
      animation: none;
      max-height: none;
      background: transparent;
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

    .drawer-title { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.3px; }

    .drawer-close {
      width: 32px; height: 32px;
      border-radius: var(--radius-md);
      border: none;
      background: var(--color-bg);
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
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

    .drawer-body--inline { overflow-y: visible; padding: 0; }

    .filter-section { display: flex; flex-direction: column; gap: var(--space-3); }

    .section-label {
      font-size: var(--font-size-xs);
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .section-label-row { display: flex; align-items: center; justify-content: space-between; }

    .section-value { font-size: var(--font-size-sm); font-weight: 700; color: var(--color-primary); }

    .chip-group { display: flex; flex-wrap: wrap; gap: var(--space-2); }

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
      background: var(--color-accent-blue-bg);
      border-color: var(--color-accent-blue);
      color: var(--color-accent-blue);
    }

    .slider-wrap { display: flex; flex-direction: column; gap: 6px; }

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
      width: 20px; height: 20px;
      border-radius: 50%;
      background: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
      cursor: pointer;
    }
    .slider:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }

    .slider-labels { display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--color-text-muted); }

    .price-row { display: flex; align-items: center; gap: var(--space-2); }

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
    .price-input-wrap--active { border-color: var(--color-primary); background: var(--color-surface); }
    .price-input-wrap:focus-within {
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .price-prefix { font-size: var(--font-size-sm); color: var(--color-text-muted); font-weight: 500; }
    .price-suffix { font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 500; }

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

    .checkbox-group { display: flex; flex-direction: column; gap: var(--space-2); }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 8px 10px;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--color-border);
      background: var(--color-bg);
      transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .checkbox-label:active { transform: scale(0.98); }
    .checkbox-label--active { border-color: var(--color-primary); background: var(--color-primary-light); }

    .checkbox-input { display: none; }

    .checkbox-mark {
      width: 18px; height: 18px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: all var(--transition-fast);
    }
    .checkbox-label--active .checkbox-mark { background: var(--color-primary); border-color: var(--color-primary); }
    .checkbox-label--active .checkbox-mark::after {
      content: '';
      display: block;
      width: 5px; height: 9px;
      border: 2px solid #fff;
      border-top: none; border-left: none;
      transform: rotate(45deg) translate(-1px, -1px);
    }

    .checkbox-text { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-secondary); }
    .checkbox-label--active .checkbox-text { color: var(--color-primary-dark); }

    .drawer-footer {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }

    .btn-reset {
      flex: 1; padding: 11px 0;
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
      flex: 2; padding: 11px 0;
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
  `],
})
export class FiltersComponent {
  @Input() values: FilterValues = { fuelType: 'E10', radiusKm: 10, maxPrice: null, services: [] };
  @Input() drawerMode = true;
  @Output() readonly changed = new EventEmitter<FilterValues>();
  @Output() readonly closed  = new EventEmitter<void>();

  readonly allFuelOptions: FuelTypeOrAll[] = ['Tous', ...FUEL_TYPES];
  readonly fuelLabels    = FUEL_LABELS;
  readonly serviceOptions = SERVICE_OPTIONS;

  get currentFuelNote(): string | undefined {
    return FUEL_NOTES[this.values.fuelType];
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

  isServiceSelected(value: string): boolean {
    return (this.values.services ?? []).includes(value);
  }

  toggleService(value: string): void {
    const current = this.values.services ?? [];
    const next = current.includes(value)
      ? current.filter(s => s !== value)
      : [...current, value];
    this.values = { ...this.values, services: next };
    this.emit();
  }

  reset(): void {
    this.values = { fuelType: 'E10', radiusKm: 10, maxPrice: null, services: [] };
    this.emit();
  }

  emit(): void {
    this.changed.emit({ ...this.values });
  }
}
