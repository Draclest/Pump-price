/**
 * VehicleProfileService — profil véhicule persistant (localStorage).
 *
 * Source de vérité du moteur de gain net côté client. Si un profil existe, l'app
 * passe en mode « gain net » ; sinon elle retombe sur le score. Des défauts par
 * carburant permettent une estimation immédiate (badge « estimation »).
 */
import { Injectable, computed, signal } from '@angular/core';
import { VehicleFuel, VehicleProfile } from '../models/station.model';

const STORAGE_KEY = 'pump-price.vehicle';

/** Conso L/100km par défaut par carburant (estimation raisonnable). */
const DEFAULT_CONSUMPTION: Record<VehicleFuel, number> = {
  gazole: 5.5, sp95_e10: 6.5, sp98: 6.5, e85: 8.5, gplc: 8.0,
};
const DEFAULT_TANK_L = 50;

@Injectable({ providedIn: 'root' })
export class VehicleProfileService {
  readonly profile = signal<VehicleProfile | null>(this._load());

  readonly hasProfile = computed(() => this.profile() !== null);
  readonly isEstimate = computed(() => this.profile()?.isEstimate ?? false);

  save(p: VehicleProfile): void {
    this.profile.set(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* quota/Safari privé */ }
  }

  clear(): void {
    this.profile.set(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  /** Profil « estimation » à partir du seul carburant (conso/réservoir par défaut). */
  static estimateFor(fuel: VehicleFuel): VehicleProfile {
    return {
      fuel,
      consumptionL100km: DEFAULT_CONSUMPTION[fuel] ?? 6.5,
      tankCapacityL: DEFAULT_TANK_L,
      currentLevelL: null,
      isEstimate: true,
    };
  }

  private _load(): VehicleProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as VehicleProfile) : null;
    } catch {
      return null;
    }
  }
}
