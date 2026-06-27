import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleFuel, VehicleProfile } from '../../models/station.model';
import { VehicleProfileService } from '../../services/vehicle-profile.service';

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
        <p class="vp-intro">Pour calculer ton <strong>gain net réel</strong> (carburant + détour), pas juste le prix affiché.</p>
      </div>

      <div class="vp-body">
        <label class="vp-label">Carburant</label>
        <div class="vp-chips">
          @for (f of fuels; track f.value) {
            <button type="button" class="vp-chip" [class.vp-chip--on]="form.fuel === f.value"
                    (click)="form.fuel = f.value">{{ f.label }}</button>
          }
        </div>

        <div class="vp-grid">
          <div class="vp-field">
            <label class="vp-label" for="vp-cons">Consommation (L/100km)</label>
            <input id="vp-cons" type="number" class="vp-input" min="1" max="30" step="0.1"
                   [(ngModel)]="form.consumptionL100km" />
          </div>
          <div class="vp-field">
            <label class="vp-label" for="vp-tank">Réservoir (L)</label>
            <input id="vp-tank" type="number" class="vp-input" min="20" max="120" step="1"
                   [(ngModel)]="form.tankCapacityL" />
          </div>
        </div>

        <div class="vp-field">
          <label class="vp-label" for="vp-level">Niveau actuel (L) — optionnel</label>
          <input id="vp-level" type="number" class="vp-input" min="0" max="120" step="1"
                 placeholder="Plein complet calculé si vide"
                 [ngModel]="form.currentLevelL" (ngModelChange)="form.currentLevelL = $event === '' ? null : $event" />
        </div>

        <p class="vp-hint">Astuce : laisse les valeurs par défaut si tu ne les connais pas — l'estimation reste utile.</p>
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
    .vp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .vp-field { display: flex; flex-direction: column; gap: 6px; }
    .vp-input { padding: 10px 12px; border: 1.5px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); font-size: var(--font-size-sm); font-family: var(--font-family); color: var(--color-text-primary); }
    .vp-input:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
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

  form: VehicleProfile = this.initial
    ? { ...this.initial }
    : VehicleProfileService.estimateFor('gazole');

  ngOnChanges(): void {
    this.form = this.initial ? { ...this.initial } : VehicleProfileService.estimateFor('gazole');
  }

  onSave(): void {
    // Estimation tant que conso/réservoir restent les défauts d'origine.
    const def = VehicleProfileService.estimateFor(this.form.fuel);
    const isEstimate =
      this.form.consumptionL100km === def.consumptionL100km &&
      this.form.tankCapacityL === def.tankCapacityL;
    this.save.emit({
      fuel: this.form.fuel,
      consumptionL100km: Number(this.form.consumptionL100km),
      tankCapacityL: Number(this.form.tankCapacityL),
      currentLevelL: this.form.currentLevelL != null ? Number(this.form.currentLevelL) : null,
      isEstimate,
    });
  }
}
