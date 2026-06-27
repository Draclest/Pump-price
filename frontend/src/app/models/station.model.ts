export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface FuelPrice {
  type: string;
  price: number;
  updated_at: string;
}

export const FUEL_TYPES = ['E10', 'SP98', 'E85', 'GPLc', 'Gazole'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
export type FuelTypeOrAll = FuelType | 'Tous';

export const FUEL_LABELS: Record<string, string> = {
  Tous:   'Tous',
  E10:    'Sans-plomb (E10 / SP95)',
  SP98:   'SP98',
  E85:    'E85',
  GPLc:   'GPL',
  Gazole: 'Diesel',
};

/** Availability note shown in the filter UI */
export const FUEL_NOTES: Partial<Record<FuelTypeOrAll, string>> = {
  E10:  'Inclut les stations SP95 et E10',
  E85:  'Véhicules flex-fuel uniquement',
  GPLc: 'Véhicules GPL uniquement',
};

export interface ScoreBreakdown {
  price:     number;
  distance?: number;
  detour?:   number;
  freshness: number;
  services:  number;
}

export interface RouteInfo {
  perp_dist_km:  number;
  detour_km:     number;
  nearest_idx:   number;
  progress_pct:  number;
}

export interface Station {
  id:           string;
  name?:        string;
  brand?:       string;
  brand_key?:   string;
  logo_url?:    string;
  brand_color?: string;
  address:      string;
  city:         string;
  postal_code:  string;
  location:     GeoPoint;
  fuels:        FuelPrice[];
  services?:    string[];
  is_open?:     boolean | null;
  opening_hours?:         string;
  opening_hours_display?: string;
  osm_id?:          string;
  osm_last_updated?: string;
  distance_meters?: number;
  // Scoring / recommendation fields
  score?:               number;
  score_breakdown?:     ScoreBreakdown;
  recommendation_label?: string;
  matched_fuel?:        FuelPrice;
  _route_info?:         RouteInfo;
  // Net-gain engine (peuplé par /v2/net-gain/search)
  net_gain_eur?:   number;
  verdict?:        Verdict;
  confidence?:     Confidence;
  price_age_min?:  number;
  detour?:         { km: number; min: number };
  breakdown?:      NetGainBreakdown;
}

export type Verdict = 'worth_it' | 'neutral' | 'skip';
export type Confidence = 'high' | 'medium' | 'low' | 'stale';

export interface NetGainBreakdown {
  pump_saving_eur: number;
  detour_fuel_eur: number;
  time_cost_eur:   number;
}

/** Carburants du moteur de gain net (codes API v2). */
export type VehicleFuel = 'sp95_e10' | 'sp98' | 'gazole' | 'e85' | 'gplc';

/** Catégorie de véhicule (V1) — sert à dériver conso + réservoir sans saisie chiffrée. */
export type VehicleType =
  | 'citadine' | 'compacte' | 'berline' | 'suv' | 'monospace' | 'utilitaire';

export interface VehicleProfile {
  fuel:              VehicleFuel;
  /** Catégorie choisie par l'utilisateur (source de l'estimation conso/réservoir). */
  type?:             VehicleType;
  consumptionL100km: number;
  tankCapacityL:     number;
  currentLevelL?:    number | null;
  /** true si conso/réservoir sont dérivés du type (badge « estimation »). */
  isEstimate?:       boolean;
}

/** Correspondance bouton filtre (E10/SP98/…) ↔ carburant net-gain. */
export const FILTER_TO_VEHICLE_FUEL: Record<string, VehicleFuel> = {
  E10: 'sp95_e10', SP98: 'sp98', Gazole: 'gazole', E85: 'e85', GPLc: 'gplc',
};

export interface RecommendParams {
  lat:       number;
  lon:       number;
  radiusKm:  number;
  fuelType?: string;
  maxPrice?: number | null;
  services?: string[];
  limit?:    number;
}

export interface SearchParams {
  lat:        number;
  lon:        number;
  radius_km?: number;
  fuel_type?: string;
  max_price?: number;
  limit?:     number;
}

export interface FilterValues {
  fuelType:  FuelTypeOrAll;
  radiusKm:  number;
  maxPrice:  number | null;
  services:  string[];
}

export type SortBy = 'netgain' | 'score' | 'price' | 'distance' | 'freshness';
