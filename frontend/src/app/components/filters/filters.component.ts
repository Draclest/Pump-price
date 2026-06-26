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

/**
 * Inline filter controls (fuel type, radius, max price, services).
 * Always embedded by the parent (sidebar panel or mobile modal); the parent
 * owns the surrounding chrome (title bar, close button).
 */
@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters-body" role="group" aria-label="Filtres de recherche">

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
                 [(ngModel)]="values.radiusKm" (ngModelChange)="emitRadiusDebounced()"
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
  `,
  styles: [`
    .filters-body { display: flex; flex-direction: column; gap: var(--space-5); }

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
  @Output() readonly changed = new EventEmitter<FilterValues>();

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

  /** Le curseur de rayon émet en continu pendant le glissement : on temporise
   *  pour ne relancer la recherche qu'une fois l'utilisateur stabilisé (~400ms). */
  private radiusTimer: ReturnType<typeof setTimeout> | null = null;
  emitRadiusDebounced(): void {
    if (this.radiusTimer) clearTimeout(this.radiusTimer);
    this.radiusTimer = setTimeout(() => this.emit(), 400);
  }

  emit(): void {
    if (this.radiusTimer) { clearTimeout(this.radiusTimer); this.radiusTimer = null; }
    this.changed.emit({ ...this.values });
  }
}
