import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleFuel, VehicleProfile, VehicleType } from '../../models/station.model';
import { VEHICLE_TYPES, VehicleProfileService } from '../../services/vehicle-profile.service';

const FUELS: { value: VehicleFuel; label: string }[] = [
  { value: 'sp95_e10', label: 'Sans-plomb (E10/SP95)' },
  { value: 'sp98',     label: 'SP98' },
  { value: 'gazole',   label: 'Diesel' },
  { value: 'e85',      label: 'E85' },
  { value: 'gplc',     label: 'GPL' },
];

/**
 * Modale « Mon véhicule » — saisit le profil qui active le moteur de gain net.
 * Conso/réservoir pré-remplis par défaut (badge « estimation » tant que non
 * confirmés). Émet `save` (profil) ou `clear` (repasse au score).
 */
@Component({
  selector: 'app-vehicle-profile',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vp-backdrop" (click)="close.emit()" aria-hidden="true"></div>
    <div class="vp-modal" role="dialog" aria-modal="true" aria-label="Mon véhicule">
      <div class="vp-header">
        <div class="vp-drag"></div>
        <div class="vp-titlebar">
          <span class="vp-title">Mon véhicule</span>
          <button class="vp-close" type="button" aria-label="Fermer" (click)="close.emit()">✕</button>
        </div>
        <p class="vp-intro">Pour calculer ton <strong>gain net réel</strong> (carburant + détour), pas juste le prix affiché. Indique simplement ton type de véhicule.</p>
      </div>

      <div class="vp-body">
        <label class="vp-label">Type de véhicule</label>
        <div class="vp-chips">
          @for (t of types; track t.value) {
            <button type="button" class="vp-chip" [class.vp-chip--on]="selectedType === t.value"
                    (click)="selectType(t.value)">{{ t.label }}</button>
          }
        </div>

        <label class="vp-label">Carburant</label>
        <div class="vp-chips">
          @for (f of fuels; track f.value) {
            <button type="button" class="vp-chip" [class.vp-chip--on]="form.fuel === f.value"
                    (click)="selectFuel(f.value)">{{ f.label }}</button>
          }
        </div>

        <div class="vp-estimate">
          <span class="vp-estimate-label">Conso estimée</span>
          <span class="vp-estimate-value">≈ {{ form.consumptionL100km }} L/100km</span>
        </div>

        <p class="vp-hint">Estimation moyenne basée sur ta catégorie de véhicule — pas besoin de connaître ton réservoir ni tes litres restants.</p>
      </div>

      <div class="vp-actions">
        @if (initial) {
          <button class="vp-btn vp-btn--ghost" type="button" (click)="clear.emit()">Désactiver</button>
        }
        <button class="vp-btn vp-btn--primary" type="button" (click)="onSave()">Enregistrer</button>
      </div>
    </div>
  `,
  styles: [`
    .vp-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 1000; animation: vp-fade .2s ease; }
    @keyframes vp-fade { from { opacity: 0 } to { opacity: 1 } }
    .vp-modal {
      position: fixed; z-index: 1001; background: var(--color-surface);
      display: flex; flex-direction: column; box-shadow: var(--shadow-xl);
      left: 50%; top: 50%; transform: translate(-50%,-50%);
      width: min(440px, 94vw); max-height: 90vh; border-radius: var(--radius-xl);
      animation: vp-in .22s cubic-bezier(0.34,1.3,0.64,1);
    }
    @keyframes vp-in { from { opacity:0; transform: translate(-50%,-48%) scale(.96) } to { opacity:1; transform: translate(-50%,-50%) scale(1) } }
    @media (max-width: 640px) {
      .vp-modal { top:auto; bottom:0; transform:none; width:100%; border-radius: 22px 22px 0 0; max-height: 88vh; animation: vp-up .3s cubic-bezier(0.32,0.72,0,1); }
      @keyframes vp-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
      .vp-modal { transform: none; left: 0; }
    }
    .vp-header { padding: 10px 20px 12px; border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }
    .vp-drag { width: 40px; height: 4px; background: var(--color-border); border-radius: 100px; margin: 0 auto 10px; }
    .vp-titlebar { display: flex; align-items: center; justify-content: space-between; }
    .vp-title { font-size: var(--font-size-md); font-weight: 800; color: var(--color-text-primary); }
    .vp-close { width: 32px; height: 32px; border: none; border-radius: 50%; background: var(--color-surface-2); color: var(--color-text-secondary); cursor: pointer; font-size: 14px; }
    .vp-intro { margin: 8px 0 0; font-size: var(--font-size-sm); color: var(--color-text-muted); line-height: 1.5; }
    .vp-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
    .vp-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .vp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .vp-chip { padding: 7px 12px; border-radius: var(--radius-pill); border: 1.5px solid var(--color-border); background: var(--color-surface); font-size: var(--font-size-sm); font-weight: 600; font-family: var(--font-family); color: var(--color-text-secondary); cursor: pointer; }
    .vp-chip--on { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary-dark); }
    .vp-estimate { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-radius: var(--radius-md); background: var(--color-primary-light); }
    .vp-estimate-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--color-primary-dark); text-transform: uppercase; letter-spacing: 0.5px; }
    .vp-estimate-value { font-size: var(--font-size-md); font-weight: 800; color: var(--color-primary-dark); font-variant-numeric: tabular-nums; }
    .vp-hint { margin: 0; font-size: 11px; color: var(--color-text-muted); line-height: 1.4; }
    .vp-actions { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--color-border-subtle); flex-shrink: 0; }
    .vp-btn { flex: 1; padding: 12px; border-radius: var(--radius-md); border: none; font-size: var(--font-size-sm); font-weight: 700; font-family: var(--font-family); cursor: pointer; }
    .vp-btn--primary { background: var(--color-primary); color: #fff; }
    .vp-btn--ghost { flex: 0 0 auto; background: var(--color-surface-2); color: var(--color-text-secondary); }
  `],
})
export class VehicleProfileComponent {
  @Input() initial: VehicleProfile | null = null;
  @Output() readonly save  = new EventEmitter<VehicleProfile>();
  @Output() readonly clear = new EventEmitter<void>();
  @Output() readonly close = new EventEmitter<void>();

  readonly fuels = FUELS;
  readonly types = VEHICLE_TYPES;

  selectedType: VehicleType = this.initial?.type ?? 'compacte';
  form: VehicleProfile = this._initialForm();

  ngOnChanges(): void {
    this.selectedType = this.initial?.type ?? 'compacte';
    this.form = this._initialForm();
  }

  selectType(type: VehicleType): void {
    this.selectedType = type;
    this.form = VehicleProfileService.estimateForType(type, this.form.fuel);
  }

  selectFuel(fuel: VehicleFuel): void {
    this.form = VehicleProfileService.estimateForType(this.selectedType, fuel);
  }

  onSave(): void {
    // V1 : conso/réservoir entièrement dérivés du type → toujours « estimation ».
    this.save.emit(VehicleProfileService.estimateForType(this.selectedType, this.form.fuel));
  }

  private _initialForm(): VehicleProfile {
    return this.initial
      ? { ...this.initial }
      : VehicleProfileService.estimateForType('compacte', 'gazole');
  }
}
