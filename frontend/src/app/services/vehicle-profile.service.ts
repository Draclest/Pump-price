/**
 * VehicleProfileService — profil véhicule persistant (localStorage).
 *
 * Source de vérité du moteur de gain net côté client. Si un profil existe, l'app
 * passe en mode « gain net » ; sinon elle retombe sur le score. Des défauts par
 * carburant permettent une estimation immédiate (badge « estimation »).
 */
import { Injectable, computed, signal } from '@angular/core';
import { VehicleFuel, VehicleProfile, VehicleType } from '../models/station.model';

const STORAGE_KEY = 'pump-price.vehicle';

/**
 * Presets par catégorie de véhicule (V1). `consumption` est exprimée en
 * référence essence (SP95) ; elle est ajustée par carburant via FUEL_FACTOR.
 * Objectif : une estimation crédible à partir d'un seul choix, sans saisie
 * de réservoir ni de litres restants (trop complexe pour la V1).
 */
export const VEHICLE_TYPES: { value: VehicleType; label: string; consumption: number; tankL: number }[] = [
  { value: 'citadine',   label: 'Citadine',          consumption: 5.5, tankL: 45 },
  { value: 'compacte',   label: 'Compacte',          consumption: 6.5, tankL: 50 },
  { value: 'berline',    label: 'Berline',           consumption: 7.0, tankL: 60 },
  { value: 'suv',        label: 'SUV / 4×4',         consumption: 8.5, tankL: 60 },
  { value: 'monospace',  label: 'Monospace',         consumption: 7.8, tankL: 60 },
  { value: 'utilitaire', label: 'Utilitaire',        consumption: 9.5, tankL: 70 },
];

/** Ajustement de conso selon le carburant (réf. essence = 1.0). */
const FUEL_FACTOR: Record<VehicleFuel, number> = {
  gazole: 0.85, sp95_e10: 1.0, sp98: 1.0, e85: 1.30, gplc: 1.20,
};

const DEFAULT_TYPE: VehicleType = 'compacte';

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

  /**
   * Profil « estimation » à partir du type de véhicule + carburant (V1).
   * Conso = preset du type × facteur carburant ; réservoir = preset du type.
   * Aucun litre restant demandé : le backend retombe sur tank×0.75.
   */
  static estimateForType(type: VehicleType, fuel: VehicleFuel): VehicleProfile {
    const preset = VEHICLE_TYPES.find((t) => t.value === type)
      ?? VEHICLE_TYPES.find((t) => t.value === DEFAULT_TYPE)!;
    const consumption = Math.round(preset.consumption * (FUEL_FACTOR[fuel] ?? 1.0) * 10) / 10;
    return {
      fuel,
      type,
      consumptionL100km: consumption,
      tankCapacityL: preset.tankL,
      currentLevelL: null,
      isEstimate: true,
    };
  }

  /** Repli : profil par défaut (type compacte) pour un carburant donné. */
  static estimateFor(fuel: VehicleFuel): VehicleProfile {
    return VehicleProfileService.estimateForType(DEFAULT_TYPE, fuel);
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
