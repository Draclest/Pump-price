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
}

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
